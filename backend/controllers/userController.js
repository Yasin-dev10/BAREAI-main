const bcrypt = require("bcryptjs");
const User = require("../model/user");

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};

const createInvestigator = async (req, res) => {
  try {
    const { name, email, password, badgeNumber, station, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profileImage = req.file ? `/uploads/investigator/${req.file.filename}` : null;

    const investigator = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "investigator",
      badgeNumber,
      station,
      phone,
      profileImage,
    });

    res.status(201).json({
      message: "Investigator created successfully",
      user: {
        _id: investigator._id,
        name: investigator.name,
        email: investigator.email,
        role: investigator.role,
        badgeNumber: investigator.badgeNumber,
        station: investigator.station,
        phone: investigator.phone,
        profileImage: investigator.profileImage,
        createdAt: investigator.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create investigator", error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, password, badgeNumber, station, phone } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check email uniqueness if changed
    if (email && email !== user.email) {
      const exists = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (exists) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (badgeNumber !== undefined) user.badgeNumber = badgeNumber;
    if (station !== undefined) user.station = station;
    if (phone !== undefined) user.phone = phone;

    if (req.file) {
      user.profileImage = `/uploads/investigator/${req.file.filename}`;
    }

    if (password && password.trim()) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({
      message: "User updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        badgeNumber: user.badgeNumber,
        station: user.station,
        phone: user.phone,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
};

module.exports = { getUsers, createInvestigator, updateUser, deleteUser };
