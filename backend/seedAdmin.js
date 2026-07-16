const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("./model/user");

dotenv.config();

const adminSeed = {
  name: process.env.ADMIN_NAME || "BAREAI Admin",
  email: (process.env.ADMIN_EMAIL || "[EMAIL_ADDRESS]").trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || "Password@2026",
};

const seedAdmin = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const hashedPassword = await bcrypt.hash(adminSeed.password, 10);
  const admin = await User.findOneAndUpdate(
    { email: adminSeed.email },
    {
      name: adminSeed.name,
      email: adminSeed.email,
      password: hashedPassword,
      role: "admin",
      status: "active",
      theme: "dark",
      emailAlerts: true,
      pushNotifications: false,
      emailVerified: true,
      emailVerificationOTP: null,
      emailVerificationOTPExpiry: null,
      isPasswordChangeRequired: false,
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  console.log("Admin seed completed");
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${adminSeed.password}`);
  console.log(`Role: ${admin.role}`);
};

seedAdmin()
  .catch((error) => {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
