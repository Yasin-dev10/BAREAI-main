const History = require("../model/History");
const BlacklistAlert = require("../model/BlacklistAlert");
const InvestigationCase = require("../model/InvestigationCase");
const Notification = require("../model/Notification");
const User = require("../model/user");
const { sendEmailAlert } = require("../services/emailService");

const populateCase = (query) =>
  query
    .populate({
      path: "history",
      populate: {
        path: "blacklistMatches.item",
        options: { strictPopulate: false },
      },
    })
    .populate("assignedOfficer", "name email role badgeNumber station emailAlerts")
    .populate("notes.officer", "name email role");

const normalizeAlertText = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/all reactions:.*$/i, "")
    .replace(/like comment view more comments.*$/i, "")
    .replace(/\b\d+\s*(m|min|h|hr|hrs|d|day|days)\b/g, "")
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeFinalDecision = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["crime", "crime-related", "true", "yes"].includes(normalized)) return true;
  if (
    ["not_crime", "not-crime", "not crime", "not crime-related", "false", "no"].includes(
      normalized
    )
  ) {
    return false;
  }

  return null;
};

const applyHistoryDecision = async (historyId, isCrime, existingHistory = null) => {
  if (typeof isCrime !== "boolean") return null;

  return History.findByIdAndUpdate(
    historyId,
    {
      isCrime,
      prediction: isCrime ? "CRIME-RELATED" : "not crime-related",
      matchedKeyword: isCrime ? existingHistory?.matchedKeyword : null,
      investigationStatus: isCrime ? "crime_case" : "not_crime",
    },
    { new: true }
  );
};

const markHistorySentToInvestigation = (historyId) =>
  History.findByIdAndUpdate(historyId, {
    investigationStatus: "sent_to_investigation",
  });

const getCrimeAlerts = async (req, res) => {
  try {
    const cases = await InvestigationCase.find().select("history");
    const caseHistoryIds = cases.map((item) => item.history.toString());

    const alerts = await History.find({
      _id: { $nin: caseHistoryIds },
      investigationStatus: { $nin: ["sent_to_investigation", "crime_case", "not_crime"] },
    })
      .populate({
        path: "blacklistMatches.item",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 });

    const seen = new Set();

    const uniqueAlerts = alerts.filter((alert) => {
      const key = alert.postId || normalizeAlertText(alert.content);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });

    res.json(uniqueAlerts);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch investigation records",
      error: error.message,
    });
  }
};
const getCases = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    if (req.user.role === "investigator") {
      filter.assignedOfficer = req.user._id;
    }

    const cases = await populateCase(
      InvestigationCase.find(filter).sort({ createdAt: -1 })
    );

    res.json(cases);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch investigation cases",
      error: error.message,
    });
  }
};

const createCaseFromAlert = async (req, res) => {
  try {
    const { historyId, finalDecision, note } = req.body;

    const history = await History.findById(historyId);
    if (!history) {
      return res.status(404).json({ message: "Record not found" });
    }

    const normalizedDecision = normalizeFinalDecision(finalDecision);

    const existingCase = await InvestigationCase.findOne({ history: historyId });
    if (existingCase) {
      if (req.user.role === "investigator" && !existingCase.assignedOfficer) {
        existingCase.assignedOfficer = req.user._id;
        existingCase.status = "investigating";
      }

      if (note?.trim()) {
        existingCase.notes.push({
          text: note.trim(),
          officer: req.user._id,
        });
      }

      if (typeof normalizedDecision === "boolean") {
        existingCase.status = normalizedDecision ? "crime_case" : "not_crime";
        await applyHistoryDecision(historyId, normalizedDecision, history);
      } else {
        await markHistorySentToInvestigation(historyId);
      }

      await existingCase.save();

      await BlacklistAlert.updateMany(
        { history: historyId },
        { status: "sent_to_investigation" }
      );

      const populatedExisting = await populateCase(
        InvestigationCase.findById(existingCase._id)
      );

      return res.status(200).json({
        message: "Case already exists for this record",
        case: populatedExisting,
      });
    }

    const casePayload = {
      history: historyId,
    };

    if (note?.trim()) {
      casePayload.notes = [
        {
          text: note.trim(),
          officer: req.user._id,
        },
      ];
    }

    if (req.user.role === "investigator") {
      casePayload.assignedOfficer = req.user._id;
      casePayload.status = "investigating";
    }

    if (typeof normalizedDecision === "boolean") {
      casePayload.status = normalizedDecision ? "crime_case" : "not_crime";
      await applyHistoryDecision(historyId, normalizedDecision, history);
    } else {
      await markHistorySentToInvestigation(historyId);
    }

    const investigationCase = await InvestigationCase.create(casePayload);

    await BlacklistAlert.updateMany(
      { history: historyId },
      { status: "sent_to_investigation" }
    );

    const populated = await populateCase(
      InvestigationCase.findById(investigationCase._id)
    );

    res.status(201).json({
      message: "Case created successfully",
      case: populated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create investigation case",
      error: error.message,
    });
  }
};

const sendCaseAssignmentEmail = async ({ officer, investigationCase }) => {
  try {
    if (!officer?.email || officer.emailAlerts === false) return;

    await sendEmailAlert({
      to: officer.email,
      subject: "🕵️ BAAREAI Investigation Case Assigned",
      message: `
        <h2>BAAREAI Investigation Case</h2>
        <p><b>A new investigation case has been assigned to you.</b></p>
        <p><b>Status:</b> ${investigationCase.status}</p>
        <p><b>Source:</b> ${
          investigationCase.history?.sourceType ||
          investigationCase.history?.type ||
          "crime"
        }</p>
        <p><b>Content:</b></p>
        <p>${String(investigationCase.history?.content || "").slice(0, 1000)}</p>
      `,
    });
  } catch (error) {
    console.error("CASE ASSIGNMENT EMAIL ERROR:", error.message);
  }
};

const updateCase = async (req, res) => {
  try {
    const { status, assignedOfficer, isCrime } = req.body;
    const updates = {};

    const existingCase = await InvestigationCase.findById(req.params.id).populate(
      "history"
    );

    if (!existingCase) {
      return res.status(404).json({ message: "Case not found" });
    }

    if (
      req.user.role === "investigator" &&
      existingCase.assignedOfficer &&
      existingCase.assignedOfficer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "This case is not assigned to you" });
    }

    if (typeof isCrime === "boolean" && !status) {
      updates.status = isCrime ? "crime_case" : "not_crime";
    }

    if (status) updates.status = status;

    if (assignedOfficer !== undefined) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin only can assign officers" });
      }

      if (assignedOfficer) {
        const officer = await User.findById(assignedOfficer);

        if (!officer || officer.role !== "investigator") {
          return res.status(400).json({ message: "Assigned officer must be an investigator" });
        }
      }

      updates.assignedOfficer = assignedOfficer || null;

      if (assignedOfficer && !status) {
        updates.status = "investigating";
      }
    }

    if (status === "archived") updates.archived = true;

    const statusDecision =
      status === "crime_case" ? true : status === "not_crime" ? false : null;

    if (typeof isCrime === "boolean" || typeof statusDecision === "boolean") {
      const finalDecision =
        typeof isCrime === "boolean" ? isCrime : statusDecision;

      await History.findByIdAndUpdate(existingCase.history._id || existingCase.history, {
        isCrime: finalDecision,
        prediction: finalDecision ? "CRIME-RELATED" : "not crime-related",
        matchedKeyword: finalDecision ? existingCase.history?.matchedKeyword : null,
        investigationStatus: finalDecision ? "crime_case" : "not_crime",
      });
    } else if (assignedOfficer !== undefined || status === "investigating") {
      await markHistorySentToInvestigation(
        existingCase.history._id || existingCase.history
      );
    }

    const investigationCase = await populateCase(
      InvestigationCase.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
    );

    const oldOfficerId = existingCase.assignedOfficer?.toString();
    const newOfficerId = investigationCase.assignedOfficer?._id?.toString();

    if (newOfficerId && newOfficerId !== oldOfficerId) {
      await Notification.create({
        recipient: newOfficerId,
        case: investigationCase._id,
        type: "case_assigned",
        title: "Investigation case assigned",
        message: `Admin assigned you a ${
          investigationCase.history?.sourceType ||
          investigationCase.history?.type ||
          "crime"
        } case to investigate.`,
      });

      await sendCaseAssignmentEmail({
        officer: investigationCase.assignedOfficer,
        investigationCase,
      });
    }

    res.json({
      message: "Case updated successfully",
      case: investigationCase,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update case",
      error: error.message,
    });
  }
};

const addCaseNote = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Note text is required" });
    }

    const investigationCase = await InvestigationCase.findById(req.params.id);
    if (!investigationCase) {
      return res.status(404).json({ message: "Case not found" });
    }

    if (
      req.user.role === "investigator" &&
      investigationCase.assignedOfficer &&
      investigationCase.assignedOfficer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "This case is not assigned to you" });
    }

    investigationCase.notes.push({
      text: text.trim(),
      officer: req.user._id,
    });

    await investigationCase.save();

    const populated = await populateCase(
      InvestigationCase.findById(investigationCase._id)
    );

    res.json({
      message: "Note added successfully",
      case: populated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add note",
      error: error.message,
    });
  }
};

const deleteCase = async (req, res) => {
  try {
    const investigationCase = await InvestigationCase.findByIdAndDelete(req.params.id);

    if (!investigationCase) {
      return res.status(404).json({ message: "Case not found" });
    }

    res.json({ message: "Case deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete case",
      error: error.message,
    });
  }
};

const getInvestigators = async (req, res) => {
  try {
    const officers = await User.find({ role: "investigator" })
      .select("name email badgeNumber station role emailAlerts")
      .sort({ name: 1 });

    res.json(officers);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch investigators",
      error: error.message,
    });
  }
};

module.exports = {
  getCrimeAlerts,
  getCases,
  createCaseFromAlert,
  updateCase,
  addCaseNote,
  deleteCase,
  getInvestigators,
};
