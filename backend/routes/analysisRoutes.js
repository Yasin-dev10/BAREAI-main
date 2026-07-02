const express = require("express");
const multer = require("multer");

const {
  analyzeText,
  analyzeUrl,
  analyzeFile,
  analyzeBatch,
} = require("../controllers/analysisController");

const { optionalProtect } = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

/* Text */
router.post("/text", optionalProtect, analyzeText);

/* Single URL */
router.post("/url", optionalProtect, analyzeUrl);

/* File PDF / DOCX / TXT */
router.post("/file", optionalProtect, upload.single("file"), analyzeFile);

/* Batch Text or URL */
router.post("/batch", optionalProtect, analyzeBatch);

module.exports = router;