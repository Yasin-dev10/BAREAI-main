const BlacklistAlert = require("../model/BlacklistAlert");
const BlacklistItem = require("../model/BlacklistItem");
const History = require("../model/History");

const {
  scanFacebookItem,
  scanFacebookWatchlist,
} = require("../services/facebookMonitor");

const {
  normalizeAlertContent,
  toDayKey,
} = require("../services/blacklistAlertService");

const normalizeBlacklistValue = (value = "") =>
  String(value).trim().replace(/\/+$/, "").toLowerCase();

const getBlacklistItems = async (req, res) => {
  try {
    const filter = {};

    if (req.query.type && req.query.type !== "all") {
      filter.type = req.query.type;
    }

    const items = await BlacklistItem.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch blacklist",
      error: error.message,
    });
  }
};

const createBlacklistItem = async (req, res) => {
  try {
    const { type, name, value, reason, priority } = req.body;

    if (!type || !name || !value) {
      return res.status(400).json({
        message: "Type, name and value are required",
      });
    }

    const normalizedValue = normalizeBlacklistValue(value);

    const existing = await BlacklistItem.findOne({
      type,
      value: normalizedValue,
    });

    if (existing) {
      return res.status(409).json({
        message: "Blacklist item-kan hore ayuu system-ka ugu jiraa",
        item: existing,
      });
    }

    const item = await BlacklistItem.create({
      type,
      name,
      value: normalizedValue,
      reason,
      priority,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      message: "Blacklist item created",
      item,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create blacklist item",
      error: error.message,
    });
  }
};

const updateBlacklistItem = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.value) {
      updates.value = normalizeBlacklistValue(updates.value);

      const current = await BlacklistItem.findById(req.params.id);

      if (!current) {
        return res.status(404).json({
          message: "Blacklist item not found",
        });
      }

      const existing = await BlacklistItem.findOne({
        _id: { $ne: req.params.id },
        type: updates.type || current.type,
        value: updates.value,
      });

      if (existing) {
        return res.status(409).json({
          message: "Blacklist item-kan hore ayuu system-ka ugu jiraa",
          item: existing,
        });
      }
    }

    const item = await BlacklistItem.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({
        message: "Blacklist item not found",
      });
    }

    res.json({
      message: "Blacklist item updated",
      item,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update blacklist item",
      error: error.message,
    });
  }
};

const deleteBlacklistItem = async (req, res) => {
  try {
    const item = await BlacklistItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Blacklist item not found",
      });
    }

    res.json({
      message: "Blacklist item deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete blacklist item",
      error: error.message,
    });
  }
};

const getBlacklistAlerts = async (req, res) => {
  try {
    const alerts = await BlacklistAlert.find()
      .populate("blacklistItem")
      .populate({
        path: "history",
        match: { isCrime: true },
      })
      .sort({ createdAt: -1 })
      .limit(300);

    const crimeAlerts = alerts.filter((alert) => alert.history);

    const seen = new Set();

    const uniqueAlerts = crimeAlerts.filter((alert) => {
      const itemId = alert.blacklistItem?._id || alert.blacklistItem || "";
      const dayKey = alert.dayKey || toDayKey(alert.createdAt);
      const contentKey =
        alert.contentFingerprint ||
        normalizeAlertContent(alert.content || alert.history?.content || "");

      const key = [
        itemId.toString(),
        alert.matchedValue || "",
        alert.sourceType || "",
        dayKey,
        contentKey,
      ].join("|");

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });

    res.json(uniqueAlerts.slice(0, 100));
  } catch (error) {
    console.error("BLACKLIST ALERTS ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch blacklist alerts",
      error: error.message,
    });
  }
};

const getFacebookPagePosts = async (req, res) => {
  try {
    const item = await BlacklistItem.findOne({
      _id: req.params.id,
      type: "facebook_page",
    });

    if (!item) {
      return res.status(404).json({
        message: "Facebook blacklist item not found",
      });
    }

    const posts = await History.find({
      "blacklistMatches.item": item._id,
    })
      .sort({ createdAt: -1 })
      .limit(200);

    const totalPosts = posts.length;
    const crimePosts = posts.filter((post) => post.isCrime).length;
    const safePosts = totalPosts - crimePosts;

    res.json({
      item,
      summary: {
        totalPosts,
        crimePosts,
        safePosts,
      },
      posts,
    });
  } catch (error) {
    console.error("FACEBOOK PAGE POSTS ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch Facebook page posts",
      error: error.message,
    });
  }
};

const scanFacebookBlacklist = async (req, res) => {
  try {
    const results = await scanFacebookWatchlist();

    res.json({
      message: "Facebook watchlist scan completed",
      results,
    });
  } catch (error) {
    res.status(500).json({
      message: "Facebook scan failed",
      error: error.message,
    });
  }
};

const scanSingleFacebookBlacklist = async (req, res) => {
  try {
    const item = await BlacklistItem.findOne({
      _id: req.params.id,
      type: "facebook_page",
    });

    if (!item) {
      return res.status(404).json({
        message: "Facebook blacklist item not found",
      });
    }

    const result = await scanFacebookItem(item);

    res.json({
      message: "Facebook page scan completed",
      result,
    });
  } catch (error) {
    res.status(500).json({
      message: "Facebook page scan failed",
      error: error.message,
    });
  }
};

const getBlacklistStats = async (req, res) => {
  try {
    // Get all blacklist items
    const items = await BlacklistItem.find().sort({ createdAt: -1 });

    // Get all history records with blacklist matches
    const histories = await History.find({
      blacklistMatches: { $exists: true, $not: { $size: 0 } },
    });

    // Build statistics for each blacklist item
    const itemStats = [];

    for (const item of items) {
      // Find all histories that matched this blacklist item
      const matchedHistories = histories.filter((history) =>
        history.blacklistMatches.some((match) =>
          match.item?.toString() === item._id.toString()
        )
      );

      if (matchedHistories.length === 0) continue;

      // Count by isCrime flag (AI prediction result)
      const crimeCount = matchedHistories.filter((h) => h.isCrime === true).length;
      const notCrimeCount = matchedHistories.filter((h) => h.isCrime === false).length;
      const pendingCount = matchedHistories.filter(
        (h) => h.investigationStatus === "pending"
      ).length;
      const sentToInvestigationCount = matchedHistories.filter(
        (h) => h.investigationStatus === "sent_to_investigation"
      ).length;

      const totalCount = matchedHistories.length;
      const crimePercentage =
        totalCount > 0 ? Math.round((crimeCount / totalCount) * 100) : 0;
      const notCrimePercentage =
        totalCount > 0 ? Math.round((notCrimeCount / totalCount) * 100) : 0;

      itemStats.push({
        _id: item._id,
        type: item.type,
        name: item.name,
        value: item.value,
        reason: item.reason,
        priority: item.priority,
        active: item.active,
        createdAt: item.createdAt,
        totalMatches: totalCount,
        crimeCount,
        notCrimeCount,
        pendingCount,
        sentToInvestigationCount,
        crimePercentage,
        notCrimePercentage,
        canBeRemoved:
          notCrimeCount > crimeCount && notCrimeCount > 0, // Items with more not-crime than crime
      });
    }

    // Sort by total matches (descending)
    itemStats.sort((a, b) => b.totalMatches - a.totalMatches);

    // Get items that can be removed (more not-crime than crime)
    const removableItems = itemStats.filter((item) => item.canBeRemoved);

    // Get top 10 most common items
    const topItems = itemStats.slice(0, 10);

    res.json({
      summary: {
        totalBlacklistItems: items.length,
        totalMatches: itemStats.reduce((sum, item) => sum + item.totalMatches, 0),
        totalCrimeMatches: itemStats.reduce(
          (sum, item) => sum + item.crimeCount,
          0
        ),
        totalNotCrimeMatches: itemStats.reduce(
          (sum, item) => sum + item.notCrimeCount,
          0
        ),
        removableItemsCount: removableItems.length,
      },
      topItems,
      removableItems,
      allStats: itemStats,
    });
  } catch (error) {
    console.error("BLACKLIST STATS ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch blacklist statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getBlacklistItems,
  createBlacklistItem,
  updateBlacklistItem,
  deleteBlacklistItem,
  getBlacklistAlerts,
  getFacebookPagePosts,
  scanFacebookBlacklist,
  scanSingleFacebookBlacklist,
  getBlacklistStats,
};