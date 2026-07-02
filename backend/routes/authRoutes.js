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
  verifyEmail,
  verifyOTP,
  resendOTP,
  requestPasswordChange,
  changePasswordWithVerification,
  autoGeneratePasswordOnFirstLogin,
} = require("../controllers/authController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/register-admin", registerAdmin);
router.post("/login", login);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.patch("/change-password", protect, changePassword);
router.post("/create-investigator", protect, adminOnly, createInvestigator);
router.post("/verify-email", verifyEmail);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/request-password-change", protect, requestPasswordChange);
router.post("/change-password-verified", changePasswordWithVerification);
router.post("/auto-generate-password", protect, autoGeneratePasswordOnFirstLogin);

module.exports = router;
