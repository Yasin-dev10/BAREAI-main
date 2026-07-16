const History = require("../model/History");
const InvestigationCase = require("../model/InvestigationCase");
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

function recordPayload(record, caseByHistoryId = {}) {
  const historyId = record._id ? String(record._id) : null;
  const linkedCase = historyId ? caseByHistoryId[historyId] : null;
  const rawContent = record.content || "";
  const postUrl =
    record.url ||
    (/^https?:\/\//i.test(String(rawContent).trim()) ? String(rawContent).trim() : null);

  return {
    _id: record._id,
    historyId,
    caseId: linkedCase?._id ? String(linkedCase._id) : null,
    type: record.type,
    sourceType: record.sourceType,
    content: rawContent.slice(0, 300),
    url: postUrl,
    prediction: record.prediction,
    confidence: record.confidence,
    isCrime: record.isCrime,
    matchedKeyword: record.matchedKeyword,
    location: record.location,
    blacklistMatches: normalizeBlacklistMatches(record.blacklistMatches),
    createdAt: record.createdAt,
  };
}

async function attachCaseLinks(records = []) {
  const ids = records
    .map((record) => record?._id)
    .filter(Boolean);

  if (!ids.length) {
    return records.map((record) => recordPayload(record));
  }

  const cases = await InvestigationCase.find({ history: { $in: ids } })
    .select("_id history")
    .lean();

  const caseByHistoryId = {};
  cases.forEach((item) => {
    const historyId = String(item.history);
    caseByHistoryId[historyId] = item;
  });

  return records.map((record) => recordPayload(record, caseByHistoryId));
}

function buildTopBlacklistMatches(records = []) {
  const matchMap = {};

  records.forEach((record) => {
    (record.blacklistMatches || []).forEach((match) => {
      const itemId = match.item ? String(match.item._id || match.item) : null;
      const value = match.value || "Blacklist item";
      const key = itemId || `${match.type || "blacklist"}:${value}`;

      if (!matchMap[key]) {
        matchMap[key] = {
          itemId,
          type: match.type || "blacklist",
          value,
          name: match.item?.name || null,
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

async function enrichTopBlacklistMatches(topMatches = []) {
  const idsNeedingName = topMatches
    .filter((match) => match.itemId && !match.name)
    .map((match) => match.itemId);

  if (!idsNeedingName.length) {
    return topMatches.map(({ itemId, ...match }) => ({
      ...match,
      name: match.name || match.value,
    }));
  }

  const items = await BlacklistItem.find({ _id: { $in: idsNeedingName } })
    .select("name value")
    .lean();
  const nameById = Object.fromEntries(
    items.map((item) => [String(item._id), item.name || item.value])
  );

  return topMatches.map(({ itemId, ...match }) => ({
    ...match,
    name: match.name || (itemId ? nameById[itemId] : null) || match.value,
  }));
}

async function getOptionalBlacklistItem(blacklistId) {
  if (!blacklistId) return null;
  if (!mongoose.Types.ObjectId.isValid(blacklistId)) {
    const err = new Error("Invalid blacklist id");
    err.status = 400;
    throw err;
  }
  const item = await BlacklistItem.findById(blacklistId)
    .select("name type value priority active")
    .lean();
  if (!item) {
    const err = new Error("Blacklist item not found");
    err.status = 404;
    throw err;
  }
  return item;
}

function withBlacklistScope(baseFilter, blacklistId) {
  if (!blacklistId) return baseFilter;
  return { ...baseFilter, "blacklistMatches.item": blacklistId };
}

/** Manual Analysis records only (not Facebook monitor posts). */
function withAnalysisOnly(baseFilter = {}) {
  return { ...baseFilter, sourceType: { $ne: "facebook" } };
}

/** Facebook monitor posts only. */
function withFacebookOnly(baseFilter = {}) {
  return { ...baseFilter, sourceType: "facebook" };
}

async function scopeFilterForBlacklist(baseFilter, blacklistId) {
  const scoped = withBlacklistScope(baseFilter, blacklistId);
  if (!blacklistId) return withAnalysisOnly(scoped);

  const item = await BlacklistItem.findById(blacklistId).select("type").lean();
  if (item?.type === "facebook_page") {
    return withFacebookOnly(scoped);
  }
  return withAnalysisOnly(scoped);
}

async function buildScopedBlacklistSummary(blacklistId, baseFilter) {
  const matchFilter = {
    ...withBlacklistScope(baseFilter, blacklistId),
    blacklistMatches: { $exists: true, $not: { $size: 0 } },
  };

  const [item, alerts, records] = await Promise.all([
    BlacklistItem.findById(blacklistId).select("active").lean(),
    BlacklistAlert.countDocuments({
      blacklistItem: blacklistId,
      ...(baseFilter.createdAt ? { createdAt: baseFilter.createdAt } : {}),
    }),
    History.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("isCrime blacklistMatches createdAt")
      .lean(),
  ]);

  return {
    items: 1,
    activeItems: item?.active ? 1 : 0,
    alerts,
    matches: records.length,
    crimeMatches: records.filter((record) => record.isCrime === true).length,
    notCrimeMatches: records.filter((record) => record.isCrime === false).length,
    topMatches: await enrichTopBlacklistMatches(buildTopBlacklistMatches(records)),
  };
}

async function buildBlacklistSummary({ baseFilter = {}, itemFilter = {} } = {}) {
  // For date-bounded reports, only count blacklist items that existed during that period
  const dateAwareItemFilter = { ...itemFilter };
  if (baseFilter.createdAt) {
    // Item must have been created on or before the end of the report period
    const periodEnd = baseFilter.createdAt.$lte;
    if (periodEnd) {
      dateAwareItemFilter.createdAt = { $lte: periodEnd };
    }
  }

  const itemIds = await BlacklistItem.find(dateAwareItemFilter).distinct("_id");

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

  // If we have a date-bounded item list, only count matches against those items
  if (itemIds.length > 0) {
    matchFilter["blacklistMatches.item"] = { $in: itemIds };
  } else if (baseFilter.createdAt) {
    // No items existed in this period — return zeroes for match stats
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

  const alertFilter = {};
  if (itemIds.length > 0) {
    alertFilter.blacklistItem = { $in: itemIds };
  }
  if (baseFilter.createdAt) {
    alertFilter.createdAt = baseFilter.createdAt;
  }

  const [items, activeItems, alerts, records] = await Promise.all([
    BlacklistItem.countDocuments(dateAwareItemFilter),
    BlacklistItem.countDocuments({ ...dateAwareItemFilter, active: true }),
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
    topMatches: await enrichTopBlacklistMatches(buildTopBlacklistMatches(records)),
  };
}

// ─── Individual Report ────────────────────────────────────────────────────────
// GET /api/reports/individual?blacklistId=<id>&...dateParams
exports.individualReport = async (req, res) => {
  try {
    const { blacklistId } = req.query;
    if (!blacklistId) {
      return res.status(400).json({ message: "blacklistId is required" });
    }

    const blacklistItem = await getOptionalBlacklistItem(blacklistId);
    const dateFilter = buildDateFilter(req.query);

    const baseFilter = await scopeFilterForBlacklist(
      dateFilter ? { createdAt: dateFilter } : {},
      blacklistId
    );

    const [total, crime, notCrime, records, blacklist] = await Promise.all([
      History.countDocuments(baseFilter),
      History.countDocuments({ ...baseFilter, isCrime: true }),
      History.countDocuments({ ...baseFilter, isCrime: false }),
      History.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(200)
        .select(
          "type sourceType content url prediction confidence isCrime matchedKeyword location blacklistMatches createdAt"
        )
        .lean(),
      buildScopedBlacklistSummary(blacklistId, baseFilter),
    ]);

    const sourceMap = {};
    records.forEach((r) => {
      const src = r.sourceType || r.type || "unknown";
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });

    res.json({
      reportType: "individual",
      period: `${blacklistItem.name || blacklistItem.value} Blacklist Report`,
      generatedAt: new Date(),
      blacklistItem,
      stats: { total, crime, notCrime },
      blacklist,
      sourceBreakdown: Object.entries(sourceMap).map(([source, count]) => ({
        source,
        count,
      })),
      records: await attachCaseLinks(records),
    });
  } catch (err) {
    console.error("Individual report error:", err);
    res.status(err.status || 500).json({
      message: err.message || "Individual report failed",
      error: err.message,
    });
  }
};

// ─── General Report ───────────────────────────────────────────────────────────
// GET /api/reports/general?...dateParams
exports.generalReport = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const baseFilter = withAnalysisOnly(
      dateFilter ? { createdAt: dateFilter } : {}
    );

    const [
      total,
      crime,
      notCrime,
      sourceBreakdown,
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
          "type sourceType content url prediction confidence isCrime matchedKeyword location blacklistMatches createdAt"
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
      locationBreakdown: locationBreakdown.map((l) => ({
        country: l._id || "Unknown",
        count: l.count,
      })),
      recentRecords: await attachCaseLinks(recentRecords),
    });
  } catch (err) {
    console.error("General report error:", err);
    res.status(500).json({ message: "General report failed", error: err.message });
  }
};

// ─── Monthly Report ───────────────────────────────────────────────────────────
// GET /api/reports/monthly?year=2025&month=6&blacklistId=
exports.monthlyReport = async (req, res) => {
  try {
    const { blacklistId } = req.query;
    const blacklistItem = await getOptionalBlacklistItem(blacklistId);

    const now   = new Date();
    const year  = parseInt(req.query.year,  10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;

    // ── Validation ────────────────────────────────────────────────────────────
    if (isNaN(year) || year < 2000 || year > now.getFullYear() + 1) {
      return res.status(400).json({ message: `Year must be between 2000 and ${now.getFullYear() + 1}.` });
    }
    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Month must be between 1 and 12." });
    }
    const selectedDate = new Date(year, month - 1, 1);
    const thisMonth    = new Date(now.getFullYear(), now.getMonth(), 1);
    if (selectedDate > thisMonth) {
      return res.status(400).json({ message: "Cannot generate a report for a future month." });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const dateFilter = { $gte: start, $lte: end };
    const baseFilter = await scopeFilterForBlacklist(
      { createdAt: dateFilter },
      blacklistId
    );

    const [total, crime, notCrime, dailyBreakdown, sourceBreakdown, topKeywords, blacklist, records] =
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
        blacklistId
          ? buildScopedBlacklistSummary(blacklistId, baseFilter)
          : buildBlacklistSummary({ baseFilter }),
        blacklistId
          ? History.find(baseFilter)
              .sort({ createdAt: -1 })
              .limit(200)
              .select(
                "type sourceType content url prediction confidence isCrime matchedKeyword location blacklistMatches createdAt"
              )
              .lean()
          : Promise.resolve([]),
      ]);

    const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "long",
    });

    res.json({
      reportType: "monthly",
      period: `${monthName} ${year}`,
      generatedAt: new Date(),
      blacklistItem: blacklistItem || undefined,
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
      records: await attachCaseLinks(records),
    });
  } catch (err) {
    console.error("Monthly report error:", err);
    res.status(err.status || 500).json({
      message: err.message || "Monthly report failed",
      error: err.message,
    });
  }
};

// ─── Weekly Report ────────────────────────────────────────────────────────────
// GET /api/reports/weekly   (last 7 days by default)
// GET /api/reports/weekly?from=2025-06-01&to=2025-06-07&blacklistId=  (custom range)
exports.weeklyReport = async (req, res) => {
  try {
    const { blacklistId } = req.query;
    const blacklistItem = await getOptionalBlacklistItem(blacklistId);

    let start, end;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (req.query.from && req.query.to) {
      start = new Date(req.query.from);
      end   = new Date(req.query.to);
      end.setHours(23, 59, 59, 999);

      // ── Validation ──────────────────────────────────────────────────────────
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
      }
      if (start > end) {
        return res.status(400).json({ message: "Start date cannot be after end date." });
      }
      if (start > today) {
        return res.status(400).json({ message: "Start date cannot be in the future." });
      }
      if (end > today) {
        return res.status(400).json({ message: "End date cannot be in the future." });
      }
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 7) {
        return res.status(400).json({ message: "Custom range cannot exceed 7 days for a weekly report." });
      }
    } else {
      end   = new Date();
      start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    const dateFilter = { $gte: start, $lte: end };
    const baseFilter = await scopeFilterForBlacklist(
      { createdAt: dateFilter },
      blacklistId
    );

    const [total, crime, notCrime, dailyBreakdown, sourceBreakdown, topKeywords, blacklist, records] =
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
        blacklistId
          ? buildScopedBlacklistSummary(blacklistId, baseFilter)
          : buildBlacklistSummary({ baseFilter }),
        blacklistId
          ? History.find(baseFilter)
              .sort({ createdAt: -1 })
              .limit(200)
              .select(
                "type sourceType content url prediction confidence isCrime matchedKeyword location blacklistMatches createdAt"
              )
              .lean()
          : Promise.resolve([]),
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
      blacklistItem: blacklistItem || undefined,
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
      records: await attachCaseLinks(records),
    });
  } catch (err) {
    console.error("Weekly report error:", err);
    res.status(err.status || 500).json({
      message: err.message || "Weekly report failed",
      error: err.message,
    });
  }
};
