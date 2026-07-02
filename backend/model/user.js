const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "investigator", "user"],
      default: "user",
    },

    badgeNumber: { type: String, default: null },

    station: { type: String, default: null },

    phone: { type: String, default: null },

    profileImage: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    theme: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },

    emailAlerts: {
      type: Boolean,
      default: true,
    },

    pushNotifications: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
