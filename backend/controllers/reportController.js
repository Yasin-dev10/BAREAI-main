const History = require("../model/History");
const InvestigationCase = require("../model/InvestigationCase");
const User = require("../model/user");
const BlacklistAlert = require("../model/BlacklistAlert");
const BlacklistItem = require("../model/BlacklistItem");
const mongoose = require("mongoose");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a Mongoose date-range filter from { from, to, year, month, week }.
 * "week" means the last 7 days.  "month"/"year" filter by calendar month/year.
 * "from"/"to" accept ISO date strings for custom ranges.
 */
function buildDateFilter(query) {
  const { from, to, year, month, week } = query;
  const now = new Date();

  if (from || to) {
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    return dateFilter;
  }

  if (week === "true" || week === "1") {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { $gte: start, $lte: now };
  }

  if (month && year) {
    const m = parseInt(month, 10) - 1; // 0-indexed
    const y = parseInt(year, 10);
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }

  if (year) {
    const y = parseInt(year, 10);
    return {
      $gte: new Date(y, 0, 1),
      $lte: new Date(y, 11, 31, 23, 59, 59, 999),
    };
  }

  return null; // no date filter
}

/**
 * Returns a readable period label for the report header.
 */
function periodLabel(query) {
  const { from, to, year, month, week } = query;
  if (from || to) {
    return `${from || "start"} → ${to || "now"}`;
  }
  if (week === "true" || week === "1") return "Last 7 Days";
  if (month && year) {
    const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "long",
    });
    return `${monthName} ${year}`;
  }
  if (year) return `Year ${year}`;
  return "All Time";
}

function normalizeBlacklistMatches(matches = []) {
  return matches.map((match) => ({
    item: match.item,
    type: match.type || "blacklist",
    value: match.value || "",
    priority: match.priority || "normal",
  }));
}

function recordPayload(record) {
  return {
    _id: record._id,
    type: record.type,
    sourceType: record.sourceType,
    content: (record.content || "").slice(0, 300),
    prediction: record.prediction,
    confidence: record.confidence,
    isCrime: record.isCrime,
    matchedKeyword: record.matchedKeyword,
    location: record.location,
    blacklistMatches: normalizeBlacklistMatches(record.blacklistMatches),
    createdAt: record.createdAt,
  };
}

function buildTopBlacklistMatches(records = []) {
  const matchMap = {};

  records.forEach((record) => {
    (record.blacklistMatches || []).forEach((match) => {
      const value = match.value || "Blacklist item";
      const key = `${match.type || "blacklist"}:${value}`;

      if (!matchMap[key]) {
        matchMap[key] = {
          type: match.type || "blacklist",
          value,
          priority: match.priority || "normal",
          count: 0,
        };
      }

      matchMap[key].count += 1;
    });
  });

  return Object.values(matchMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

async function buildBlacklistSummary({ baseFilter = {}, itemFilter = {} } = {}) {
  const itemIds = await BlacklistItem.find(itemFilter).distinct("_id");

  if (itemFilter.createdBy && itemIds.length === 0) {
    return {
      items: 0,
      activeItems: 0,
      alerts: 0,
      matches: 0,
      crimeMatches: 0,
      notCrimeMatches: 0,
      topMatches: [],
    };
  }

  const matchFilter = {
    ...baseFilter,
    blacklistMatches: { $exists: true, $not: { $size: 0 } },
  };

  if (itemIds.length > 0 && itemFilter.createdBy) {
    matchFilter["blacklistMatches.item"] = { $in: itemIds };
  }

  const alertFilter = {};
  if (itemIds.length > 0) {
    alertFilter.blacklistItem = { $in: itemIds };
  }
  if (baseFilter.createdAt) {
    alertFilter.createdAt = baseFilter.createdAt;
  }

  const [items, activeItems, alerts, records] = await Promise.all([
    BlacklistItem.countDocuments(itemFilter),
    BlacklistItem.countDocuments({ ...itemFilter, active: true }),
    BlacklistAlert.countDocuments(alertFilter),
    History.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("isCrime blacklistMatches createdAt")
      .lean(),
  ]);

  return {
    items,
    activeItems,
    alerts,
    matches: records.length,
    crimeMatches: records.filter((record) => record.isCrime === true).length,
    notCrimeMatches: records.filter((record) => record.isCrime === false).length,
    topMatches: buildTopBlacklistMatches(records),
  };
}

// ─── Individual Report ────────────────────────────────────────────────────────
// GET /api/reports/individual?userId=<id>&...dateParams
exports.individualReport = async (req, res) => {
  try {
    const { userId } = req.query;
    const dateFilter = buildDateFilter(req.query);

    const userFilter = { user: userId };
    if (dateFilter) userFilter.createdAt = dateFilter;

    const [user, total, crime, notCrime, records] = await Promise.all([
      User.findById(userId).select("name email role").lean(),
      History.countDocuments(userFilter),
      History.countDocuments({ ...userFilter, isCrime: true }),
      History.countDocuments({ ...userFilter, isCrime: false }),
      History.find(userFilter)
        .sort({ createdAt: -1 })
        .limit(200)
        .select(
          "type sourceType content prediction confidence isCrime matchedKeyword location blacklistMatches createdAt"
        )
        .lean(),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    // ── Blacklist summary derived from this user's own history records ──────
    const recordsWithBlacklist = records.filter(
      (r) => r.blacklistMatches && r.blacklistMatches.length > 0
    );

    // Collect all unique blacklist item IDs referenced in the user's records
    const itemIdSet = new Set();
    recordsWithBlacklist.forEach((r) =>
      r.blacklistMatches.forEach((m) => {
        if (m.item) itemIdSet.add(String(m.item));
      })
    );
    const itemIds = [...itemIdSet].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const [blacklistItems, blacklistAlerts] = await Promise.all([
      itemIds.length > 0
        ? BlacklistItem.find({ _id: { $in: itemIds } })
            .select("active")
            .lean()
        : Promise.resolve([]),
      itemIds.length > 0
        ? BlacklistAlert.countDocuments({
            blacklistItem: { $in: itemIds },
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          })
        : Promise.resolve(0),
    ]);

    const blacklist = {
      items: itemIds.length,
      activeItems: blacklistItems.filter((i) => i.active).length,
      alerts: blacklistAlerts,
      matches: recordsWithBlacklist.length,
      crimeMatches: recordsWithBlacklist.filter((r) => r.isCrime === true).length,
      notCrimeMatches: recordsWithBlacklist.filter((r) => r.isCrime === false).length,
      topMatches: buildTopBlacklistMatches(recordsWithBlacklist),
    };

    // Source breakdown
    const sourceMap = {};
    records.forEach((r) => {
      const src = r.sourceType || r.type || "unknown";
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });

    res.json({
      reportType: "individual",
      period: periodLabel(req.query),
      generatedAt: new Date(),
      user,
      stats: { total, crime, notCrime },
      blacklist,
      sourceBreakdown: Object.entries(sourceMap).map(([source, count]) => ({
        source,
        count,
      })),
      records: records.map(recordPayload),
    });
  } catch (err) {
    console.error("Individual report error:", err);
    res.status(500).json({ message: "Individual report failed", error: err.message });
  }
};

// ─── General Report ───────────────────────────────────────────────────────────
// GET /api/reports/general?...dateParams
exports.generalReport = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const baseFilter = dateFilter ? { createdAt: dateFilter } : {};

    const [
      total,
      crime,
      notCrime,
      sourceBreakdown,
      topKeywords,
      locationBreakdown,
      recentRecords,
      blacklist,
    ] = await Promise.all([
      History.countDocuments(baseFilter),
      History.countDocuments({ ...baseFilter, isCrime: true }),
      History.countDocuments({ ...baseFilter, isCrime: false }),

      // Source / type distribution
      History.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$sourceType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Top matched keywords
      History.aggregate([
        { $match: { ...baseFilter, matchedKeyword: { $nin: [null, ""] } } },
        { $group: { _id: "$matchedKeyword", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Location (country) breakdown
      History.aggregate([
        { $match: { ...baseFilter, "location.0": { $exists: true } } },
        { $unwind: "$location" },
        {
          $group: {
            _id: "$location.country",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      History.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .select(
          "type sourceType content prediction confidence isCrime matchedKeyword location blacklistMatches createdAt"
        )
        .lean(),
      buildBlacklistSummary({ baseFilter }),
    ]);

    res.json({
      reportType: "general",
      period: periodLabel(req.query),
      generatedAt: new Date(),
      stats: { total, crime, notCrime },
      blacklist,
      sourceBreakdown: sourceBreakdown.map((s) => ({
        source: s._id || "unknown",
        count: s.count,
      })),
      topKeywords: topKeywords.map((k) => ({
        keyword: k._id,
        count: k.count,
      })),
      locationBreakdown: locationBreakdown.map((l) => ({
        country: l._id || "Unknown",
        count: l.count,
      })),
      recentRecords: recentRecords.map(recordPayload),
    });
  } catch (err) {
    console.error("General report error:", err);
    res.status(500).json({ message: "General report failed", error: err.message });
  }
};

// ─── Monthly Report ───────────────────────────────────────────────────────────
// GET /api/reports/monthly?year=2025&month=6
exports.monthlyReport = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const dateFilter = { $gte: start, $lte: end };
    const baseFilter = { createdAt: dateFilter };

    const [total, crime, notCrime, dailyBreakdown, sourceBreakdown, topKeywords, blacklist] =
      await Promise.all([
        History.countDocuments(baseFilter),
        History.countDocuments({ ...baseFilter, isCrime: true }),
        History.countDocuments({ ...baseFilter, isCrime: false }),

        // Daily breakdown within the month
        History.aggregate([
          { $match: baseFilter },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              crime: {
                $sum: { $cond: [{ $eq: ["$isCrime", true] }, 1, 0] },
              },
              notCrime: {
                $sum: { $cond: [{ $eq: ["$isCrime", false] }, 1, 0] },
              },
              total: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        History.aggregate([
          { $match: baseFilter },
          { $group: { _id: "$sourceType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        History.aggregate([
          {
            $match: {
              ...baseFilter,
              matchedKeyword: { $nin: [null, ""] },
            },
          },
          { $group: { _id: "$matchedKeyword", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        buildBlacklistSummary({ baseFilter }),
      ]);

    const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "long",
    });

    res.json({
      reportType: "monthly",
      period: `${monthName} ${year}`,
      generatedAt: new Date(),
      stats: { total, crime, notCrime },
      blacklist,
      dailyBreakdown: dailyBreakdown.map((d) => ({
        date: d._id,
        crime: d.crime,
        notCrime: d.notCrime,
        total: d.total,
      })),
      sourceBreakdown: sourceBreakdown.map((s) => ({
        source: s._id || "unknown",
        count: s.count,
      })),
      topKeywords: topKeywords.map((k) => ({
        keyword: k._id,
        count: k.count,
      })),
    });
  } catch (err) {
    console.error("Monthly report error:", err);
    res.status(500).json({ message: "Monthly report failed", error: err.message });
  }
};

// ─── Weekly Report ────────────────────────────────────────────────────────────
// GET /api/reports/weekly   (last 7 days by default)
// GET /api/reports/weekly?from=2025-06-01&to=2025-06-07  (custom range)
exports.weeklyReport = async (req, res) => {
  try {
    let start, end;

    if (req.query.from && req.query.to) {
      start = new Date(req.query.from);
      end = new Date(req.query.to);
      end.setHours(23, 59, 59, 999);
    } else {
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    const dateFilter = { $gte: start, $lte: end };
    const baseFilter = { createdAt: dateFilter };

    const [total, crime, notCrime, dailyBreakdown, sourceBreakdown, topKeywords, blacklist] =
      await Promise.all([
        History.countDocuments(baseFilter),
        History.countDocuments({ ...baseFilter, isCrime: true }),
        History.countDocuments({ ...baseFilter, isCrime: false }),

        // Daily breakdown (7 days)
        History.aggregate([
          { $match: baseFilter },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              crime: {
                $sum: { $cond: [{ $eq: ["$isCrime", true] }, 1, 0] },
              },
              notCrime: {
                $sum: { $cond: [{ $eq: ["$isCrime", false] }, 1, 0] },
              },
              total: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        History.aggregate([
          { $match: baseFilter },
          { $group: { _id: "$sourceType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        History.aggregate([
          {
            $match: {
              ...baseFilter,
              matchedKeyword: { $nin: [null, ""] },
            },
          },
          { $group: { _id: "$matchedKeyword", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ]),
        buildBlacklistSummary({ baseFilter }),
      ]);

    // Ensure all 7 days appear even if no data
    const dayMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = {
        date: key,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        crime: 0,
        notCrime: 0,
        total: 0,
      };
    }
    dailyBreakdown.forEach((d) => {
      if (dayMap[d._id]) {
        dayMap[d._id].crime = d.crime;
        dayMap[d._id].notCrime = d.notCrime;
        dayMap[d._id].total = d.total;
      }
    });

    res.json({
      reportType: "weekly",
      period: `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`,
      generatedAt: new Date(),
      stats: { total, crime, notCrime },
      blacklist,
      dailyBreakdown: Object.values(dayMap),
      sourceBreakdown: sourceBreakdown.map((s) => ({
        source: s._id || "unknown",
        count: s.count,
      })),
      topKeywords: topKeywords.map((k) => ({
        keyword: k._id,
        count: k.count,
      })),
    });
  } catch (err) {
    console.error("Weekly report error:", err);
    res.status(500).json({ message: "Weekly report failed", error: err.message });
  }
};

// ─── List Users (for individual report dropdown) ──────────────────────────────
// GET /api/reports/users
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ["investigator", "user", "police"] } })
      .select("name email role")
      .sort({ name: 1 })
      .lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};
