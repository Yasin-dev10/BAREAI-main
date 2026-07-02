const History = require("../model/History");// GET /history
const getHistory = async (req, res) => {
  try {
    const { crime, priority, search } = req.query;
    const query = {};

    if (crime === "CRIME") query.isCrime = true;
    if (crime === "SAFE") query.isCrime = false;

    if (priority && priority !== "ALL") {
      query.priority = priority;
    }

    if (search) {
      query.$or = [
        { content: { $regex: search, $options: "i" } },
        { extractedText: { $regex: search, $options: "i" } },
        { "blacklistMatches.value": { $regex: search, $options: "i" } },
      ];
    }

    const history = await History.find(query)
      .populate("user", "name email")
      .populate("blacklistMatches.item", "name")
      .sort({ createdAt: -1 });

    const formatted = history.map((h) => ({
      _id: h._id,
      user: h.user?.name || "System",

      type: h.type,
      content: h.content,
      extractedText: h.extractedText,

      prediction: h.prediction,
      isCrime: h.isCrime,
      investigationStatus: h.investigationStatus || "pending",

      confidence: Number(h.confidence) || 0,
      priority: h.priority,

      matchedKeyword: h.matchedKeyword,

      blacklistMatches: h.blacklistMatches.map((b) => ({
        name: b.item?.name || "Unknown",
        type: b.type,
        value: b.value,
        priority: b.priority,
      })),

      location: h.location,
      createdAt: h.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
};

// DELETE /history/:id
const deleteHistory = async (req, res) => {
  await History.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

module.exports = { getHistory, deleteHistory };
