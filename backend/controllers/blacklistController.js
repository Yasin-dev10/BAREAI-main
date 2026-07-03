const BlacklistAlert = require("../model/BlacklistAlert");
const BlacklistItem = require("../model/BlacklistItem");
const History = require("../model/History");
const axios = require("axios");
const cheerio = require("cheerio");

const {
  scanFacebookItem,
  scanFacebookWatchlist,
  extractFacebookProfileName,
} = require("../services/facebookMonitor");

const {
  normalizeAlertContent,
  toDayKey,
} = require("../services/blacklistAlertService");

const normalizeBlacklistValue = (value = "") =>
  String(value).trim().replace(/\/+$/, "").toLowerCase();

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isUrl = (value = "") => /^https?:\/\//i.test(String(value).trim());

const cleanProfileName = (value = "") =>
  String(value)
    .replace(/\s*\|\s*Facebook\s*$/i, "")
    .replace(/\s*-\s*Facebook\s*$/i, "")
    .replace(/^Facebook\s*-\s*/i, "")
    .replace(/\(\d+\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

const getNameFromFacebookUrl = (url = "") => {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname
      .split("/")
      .filter(Boolean)
      .find((part) => !["profile.php", "pages", "groups", "people"].includes(part));

    if (!slug) return "";

    return decodeURIComponent(slug)
      .replace(/[-_.]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  } catch {
    return "";
  }
};

const fetchFacebookProfileName = async (url) => {
  const response = await axios.get(url, {
    timeout: 12000,
    maxRedirects: 5,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const $ = cheerio.load(response.data || "");
  const candidates = [
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("title").text(),
    $("h1").first().text(),
  ];

  return candidates.map(cleanProfileName).find((name) => name && !/^facebook$/i.test(name));
};

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

const resolveFacebookProfile = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !isUrl(url)) {
      return res.status(400).json({
        message: "Valid Facebook Page URL is required",
      });
    }

    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    if (!["facebook.com", "m.facebook.com", "fb.com"].includes(host)) {
      return res.status(400).json({
        message: "Only Facebook URLs are supported",
      });
    }

    const fetchedName = await fetchFacebookProfileName(url).catch(() => "");
    const fallbackName = getNameFromFacebookUrl(url);
    const name = fetchedName || fallbackName;

    if (!name) {
      return res.status(404).json({
        message: "Profile name could not be found from this URL",
      });
    }

    res.json({
      name,
      source: fetchedName ? "page_metadata" : "url",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to resolve Facebook profile name",
      error: error.message,
    });
  }
};

const createBlacklistItem = async (req, res) => {
  try {
    const { type, name, value, reason } = req.body;

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
    delete updates.priority;

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

const getBlacklistItemDetails = async (req, res) => {
  try {
    const item = await BlacklistItem.findById(req.params.id)
      .populate("createdBy", "name email role badgeNumber station")
      .lean();

    if (!item) {
      return res.status(404).json({
        message: "Blacklist item not found",
      });
    }

    const itemValue = String(item.value || "").trim();
    const matchQuery = {
      $or: [
        { "blacklistMatches.item": item._id },
        { "blacklistMatches.value": itemValue },
      ],
    };

    if (itemValue) {
      matchQuery.$or.push({
        content: { $regex: escapeRegex(itemValue), $options: "i" },
      });
    }

    const histories = await History.find(matchQuery)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const alerts = await BlacklistAlert.find({ blacklistItem: item._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const relatedUrls = Array.from(
      new Set(
        [
          isUrl(item.value) ? item.value : null,
          ...histories.map((history) => history.url).filter(Boolean),
        ].filter(Boolean)
      )
    );

    const crimeCount = histories.filter((history) => history.isCrime === true).length;
    const notCrimeCount = histories.filter((history) => history.isCrime === false).length;
    const pendingCount = histories.filter(
      (history) => history.investigationStatus === "pending"
    ).length;
    const sentToInvestigationCount = histories.filter(
      (history) => history.investigationStatus === "sent_to_investigation"
    ).length;
    const crimeCaseCount = histories.filter(
      (history) => history.investigationStatus === "crime_case"
    ).length;

    res.json({
      item,
      relatedUrls,
      report: {
        totalMatches: histories.length,
        totalAlerts: alerts.length,
        crimeCount,
        notCrimeCount,
        pendingCount,
        sentToInvestigationCount,
        crimeCaseCount,
        latestMatchAt: histories[0]?.createdAt || null,
        latestAlertAt: alerts[0]?.createdAt || null,
      },
      histories,
      alerts,
    });
  } catch (error) {
    console.error("BLACKLIST ITEM DETAILS ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch blacklist item details",
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

const previewFacebookProfile = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !isUrl(url)) {
      return res.status(400).json({
        message: "Valid Facebook URL is required",
      });
    }

    const profile = await extractFacebookProfileName(url);

    if (!profile.name) {
      return res.status(404).json({
        message: "Profile name lama helin. Fadlan magaca gacanta ku qor.",
      });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({
      message: "Failed to read Facebook profile",
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
  resolveFacebookProfile,
  createBlacklistItem,
  updateBlacklistItem,
  deleteBlacklistItem,
  getBlacklistAlerts,
  getFacebookPagePosts,
  getBlacklistItemDetails,
  previewFacebookProfile,
  scanFacebookBlacklist,
  scanSingleFacebookBlacklist,
  getBlacklistStats,
};
