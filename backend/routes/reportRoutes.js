const express = require("express");
const router = express.Router();
const { protect, investigatorOrAdmin } = require("../middleware/authMiddleware");
const {
  individualReport,
  generalReport,
  monthlyReport,
  weeklyReport,
  listUsers,
} = require("../controllers/reportController");

// All report endpoints require login + investigator or admin role
router.use(protect, investigatorOrAdmin);

router.get("/users", listUsers);           // GET /api/reports/users
router.get("/individual", individualReport); // GET /api/reports/individual?userId=...
router.get("/general", generalReport);     // GET /api/reports/general
router.get("/monthly", monthlyReport);     // GET /api/reports/monthly?year=&month=
router.get("/weekly", weeklyReport);       // GET /api/reports/weekly

module.exports = router;
