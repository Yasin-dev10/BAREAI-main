const express = require("express");
const router = express.Router();

const {
  registerUser,
  registerAdmin,
  login,
  getMe,
  updateMe,
  changePassword,
  createInvestigator,
} = require("../controllers/authController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/register-admin", registerAdmin);
router.post("/login", login);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.patch("/change-password", protect, changePassword);
router.post("/create-investigator", protect, adminOnly, createInvestigator);

module.exports = router;
