const express = require("express");

const {
  getBlacklistItems,
  createBlacklistItem,
  updateBlacklistItem,
  deleteBlacklistItem,
  getBlacklistAlerts,
  getFacebookPagePosts,
  scanFacebookBlacklist,
  scanSingleFacebookBlacklist,
  getBlacklistStats,
} = require("../controllers/blacklistController");

const {
  protect,
  adminOnly,
  investigatorOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

/* ===========================
   VIEW (ADMIN + INVESTIGATOR)
=========================== */

router.get("/", protect, investigatorOrAdmin, getBlacklistItems);

router.get(
  "/alerts/history",
  protect,
  investigatorOrAdmin,
  getBlacklistAlerts
);

router.get(
  "/facebook/:id/posts",
  protect,
  investigatorOrAdmin,
  getFacebookPagePosts
);

router.get(
  "/stats/overview",
  protect,
  investigatorOrAdmin,
  getBlacklistStats
);

/* ===========================
   SCAN (ADMIN + INVESTIGATOR)
=========================== */

router.post(
  "/facebook/scan",
  protect,
  investigatorOrAdmin,
  scanFacebookBlacklist
);

router.post(
  "/facebook/scan/:id",
  protect,
  investigatorOrAdmin,
  scanSingleFacebookBlacklist
);

/* ===========================
   ADMIN ONLY
=========================== */

router.post(
  "/",
  protect,
  adminOnly,
  createBlacklistItem
);

router.patch(
  "/:id",
  protect,
  adminOnly,
  updateBlacklistItem
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteBlacklistItem
);

module.exports = router;