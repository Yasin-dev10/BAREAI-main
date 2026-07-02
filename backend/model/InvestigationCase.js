const mongoose = require("mongoose");

const caseNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const investigationCaseSchema = new mongoose.Schema(
  {
    history: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "History",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "investigating",
        "crime_case",
        "not_crime",
        "resolved",
        "archived",
      ],
      default: "pending",
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: [caseNoteSchema],
    archived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.InvestigationCase ||
  mongoose.model("InvestigationCase", investigationCaseSchema);
