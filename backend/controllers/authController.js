const User = require("../model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  generateRandomPassword,
  generateOTPCode,
  getOTPExpiry,
  generatePasswordChangeToken,
  getPasswordChangeTokenExpiry,
} = require("../utils/authUtils");
const {
  sendOTPEmail,
  sendCredentialsEmail,
  sendPasswordChangeVerificationEmail,
  sendOTPWithPasswordEmail,
} = require("../services/emailService");

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        theme: user.theme,
        emailAlerts: user.emailAlerts,
        pushNotifications: user.pushNotifications,
      },
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminExists = await User.findOne({ role: "admin" });

    if (adminExists) {
      if (!adminExists.password && adminExists.email === normalizedEmail) {
        adminExists.name = name;
        adminExists.password = await bcrypt.hash(password, 10);
        await adminExists.save();

        return res.status(200).json({
          message: "Admin password configured successfully",
          user: {
            id: adminExists._id,
            name: adminExists.name,
            email: adminExists.email,
            role: adminExists.role,
            theme: adminExists.theme,
            emailAlerts: adminExists.emailAlerts,
            pushNotifications: adminExists.pushNotifications,
          },
          token: generateToken(adminExists),
        });
      }

      return res.status(400).json({ message: "Admin already exists" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
    });

    res.status(201).json({
      message: "Admin created successfully",
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        theme: admin.theme,
        emailAlerts: admin.emailAlerts,
        pushNotifications: admin.pushNotifications,
      },
      token: generateToken(admin),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    if (!user.password || typeof user.password !== "string") {
      return res.status(401).json({
        message: "Account password is not configured. Please reset or recreate this user.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isPasswordChangeRequired: user.isPasswordChangeRequired,
        theme: user.theme,
        emailAlerts: user.emailAlerts,
        pushNotifications: user.pushNotifications,
      },
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -emailVerificationToken -passwordChangeToken");
    res.json({
      user: {
        ...user.toObject(),
        emailVerified: user.emailVerified,
        isPasswordChangeRequired: user.isPasswordChangeRequired,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMe = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "email",
      "phone",
      "badgeNumber",
      "station",
      "theme",
      "emailAlerts",
      "pushNotifications",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.email && updates.email !== req.user.email) {
      const exists = await User.findOne({ email: updates.email });
      if (exists) return res.status(400).json({ message: "Email already exists" });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({
      message: "Settings updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    const user = await User.findById(req.user._id);
    if (!user?.password) {
      return res.status(400).json({ message: "Account password is not configured" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createInvestigator = async (req, res) => {
  try {
    const { name, email, password, badgeNumber, station, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const investigator = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "investigator",
      badgeNumber,
      station,
      phone,
    });

    res.status(201).json({
      message: "Investigator account created successfully",
      investigator: {
        id: investigator._id,
        name: investigator.name,
        email: investigator.email,
        role: investigator.role,
        badgeNumber: investigator.badgeNumber,
        station: investigator.station,
        phone: investigator.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify email address with OTP code — auto-generates password and sends it via email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    const newPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
      await sendCredentialsEmail(user.email, user.name, newPassword, user.role);
    } catch (emailError) {
      console.error("Failed to send credentials email after verification:", emailError.message);
      return res.status(502).json({
        message: "Email token is valid, but the password email could not be sent. Please try again later.",
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpiry = null;
    user.password = hashedPassword;
    user.isPasswordChangeRequired = false;
    await user.save();

    res.json({
      message: "Email verified successfully. Your password has been sent to your email address.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify email with OTP code
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP code are required" });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      emailVerificationOTP: otp.trim(),
      emailVerificationOTPExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification code",
      });
    }

    // Mark email as verified and clear OTP fields
    // Password was already generated and sent in the original OTP email
    user.emailVerified = true;
    user.emailVerificationOTP = null;
    user.emailVerificationOTPExpiry = null;
    user.isPasswordChangeRequired = false;
    await user.save();

    res.json({
      message: "Email verified successfully. You can now log in with the password sent to your email.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend OTP verification code for an unverified account (also regenerates password)
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new OTP and new password together
    const nextOTP = generateOTPCode();
    const nextOTPExpiry = getOTPExpiry();
    const newPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.emailVerificationOTP = nextOTP;
    user.emailVerificationOTPExpiry = nextOTPExpiry;
    user.password = hashedPassword;
    await user.save();

    try {
      await sendOTPWithPasswordEmail(user.email, nextOTP, newPassword, user.name, user.role);
    } catch (emailError) {
      console.error("Failed to resend OTP+password email:", emailError.message);
      return res.json({
        message: "Verification email could not be sent. Use the credentials shown here.",
        emailSent: false,
        verificationOTP: nextOTP,
        generatedPassword: newPassword,
      });
    }

    res.json({
      message: "A new verification code and password have been sent to your email.",
      emailSent: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request password change (sends verification email)
const requestPasswordChange = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate password change token
    const passwordChangeToken = generatePasswordChangeToken();
    const passwordChangeTokenExpiry = getPasswordChangeTokenExpiry();

    user.passwordChangeToken = passwordChangeToken;
    user.passwordChangeTokenExpiry = passwordChangeTokenExpiry;
    await user.save();

    // Send verification email
    try {
      await sendPasswordChangeVerificationEmail(
        user.email,
        passwordChangeToken,
        user.name
      );
    } catch (emailError) {
      console.error("Failed to send password change email:", emailError.message);
      // Delete the token if email fails
      user.passwordChangeToken = null;
      user.passwordChangeTokenExpiry = null;
      await user.save();
      return res.status(500).json({
        message: "Failed to send verification email. Please try again.",
      });
    }

    res.json({
      message: "Password change verification email sent successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password with verification token
const changePasswordWithVerification = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const user = await User.findOne({
      passwordChangeToken: token,
      passwordChangeTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired password change token",
      });
    }

    // Hash and update password
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangeToken = null;
    user.passwordChangeTokenExpiry = null;
    user.isPasswordChangeRequired = false;
    await user.save();

    res.json({
      message: "Password changed successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isPasswordChangeRequired: user.isPasswordChangeRequired,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Auto-generate password on first login and send via email
const autoGeneratePasswordOnFirstLogin = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isPasswordChangeRequired) {
      return res.status(400).json({
        message: "Password change is not required for this account",
      });
    }

    // Generate new password
    const {
      generateRandomPassword,
      generateEmailVerificationToken,
      getEmailTokenExpiry,
    } = require("../utils/authUtils");
    const { sendCredentialsEmail, sendVerificationEmail } = require("../services/emailService");

    const newPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Generate email verification token
    const emailVerificationToken = generateEmailVerificationToken();
    const emailVerificationTokenExpiry = getEmailTokenExpiry();

    // Update user
    user.password = hashedPassword;
    user.isPasswordChangeRequired = false;
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationTokenExpiry = emailVerificationTokenExpiry;
    user.emailVerified = false;
    await user.save();

    // Send credentials email with new password
    try {
      await sendCredentialsEmail(user.email, user.name, newPassword, user.role);
    } catch (emailError) {
      console.error("Failed to send credentials email:", emailError.message);
    }

    // Send verification email
    try {
      await sendVerificationEmail(user.email, emailVerificationToken, user.name);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
    }

    res.json({
      message: "New password has been generated and sent to your email. Please check your email for login instructions.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isPasswordChangeRequired: false,
        emailVerified: false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
