const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const BlacklistItem = require("../model/BlacklistItem");
const History = require("../model/History");
const { createDailyBlacklistAlert } = require("../services/blacklistAlertService");
const { AI_MODEL_URL } = require("../config/aiModel");

const normalize = (value = "") => value.toString().toLowerCase();
const trimEvidence = (value = "") => String(value || "").slice(0, 12000);

const findBlacklistMatches = async ({ content, extractedText = "" }) => {
  const items = await BlacklistItem.find({ active: true });
  const contentText = normalize(`${content} ${extractedText}`);

  return items.filter((item) => {
    const value = normalize(item.value);
    const name = normalize(item.name);

    if (item.type === "keyword") {
      return contentText.includes(value) || contentText.includes(name);
    }

    if (item.type === "website" || item.type === "facebook_page") {
      return normalize(content).includes(value) || contentText.includes(value);
    }

    if (item.type === "person") {
      return contentText.includes(value) || contentText.includes(name);
    }

    return false;
  });
};

const saveHistory = async ({ type, content, result, extractedText = "", userId = null }) => {
  const blacklistMatches = await findBlacklistMatches({
    content,
    extractedText,
  });

  const hasHighPriorityMatch = blacklistMatches.some(
    (item) => item.priority === "high"
  );

  const priority = hasHighPriorityMatch
    ? "high"
    : blacklistMatches[0]?.priority || "normal";

  const history = await History.create({
    type,
    sourceType: type,
    content,
    prediction: result.prediction,
    confidence: result.confidence,
    isCrime: result.isCrime || blacklistMatches.length > 0 || false,
    matchedKeyword:
      result.matchedKeyword ||
      blacklistMatches.find((item) => item.type === "keyword")?.value ||
      null,
    location: Array.isArray(result.location) ? result.location : [],
    extractedText: trimEvidence(extractedText),
    blacklistMatches: blacklistMatches.map((item) => ({
      item: item._id,
      type: item.type,
      value: item.value,
      priority: item.priority,
    })),
    priority,
    user: userId || null,
  });

  if (blacklistMatches.length > 0) {
    await Promise.all(
      blacklistMatches.map((item) =>
        createDailyBlacklistAlert({
          blacklistItem: item._id,
          history: history._id,
          sourceType: type,
          content,
          matchedValue: item.value,
          priority: item.priority,
          dedupeContent: `${type}:${content}:${extractedText}`,
        })
      )
    );
  }

  return { history, blacklistMatches, priority };
};

const analyzeText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Text is required" });
    }

    const aiResponse = await axios.post(AI_MODEL_URL, { text });

    const saved = await saveHistory({
      type: "text",
      content: text,
      result: aiResponse.data,
      userId: req.user?._id || null,
    });

    res.status(200).json({
      message: "Text analysis completed",
      input: text,
      result: {
        ...aiResponse.data,
        blacklistMatches: saved.blacklistMatches,
        priority: saved.priority,
      },
    });
  } catch (error) {
    console.error("TEXT ANALYSIS ERROR:", error.response?.data || error.message);

    res.status(500).json({
      message: "Text analysis failed",
      error: error.response?.data || error.message,
    });
  }
};

const analyzeUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || url.trim() === "") {
      return res.status(400).json({ message: "URL is required" });
    }

    const page = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(page.data);
    $("script, style, nav, footer").remove();

    const extractedText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    if (!extractedText) {
      return res.status(400).json({
        message: "No readable text found from URL",
      });
    }

    const aiResponse = await axios.post(AI_MODEL_URL, {
      text: extractedText,
    });

    const saved = await saveHistory({
      type: "url",
      content: url,
      result: aiResponse.data,
      extractedText,
      userId: req.user?._id || null,
    });

    res.status(200).json({
      message: "URL analysis completed",
      url,
      extractedLength: extractedText.length,
      result: {
        ...aiResponse.data,
        blacklistMatches: saved.blacklistMatches,
        priority: saved.priority,
      },
    });
  } catch (error) {
    console.error("URL ANALYSIS ERROR:", error.response?.data || error.message);

    res.status(500).json({
      message: "URL analysis failed",
      error: error.response?.data || error.message,
    });
  }
};

const analyzeFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    let extractedText = "";
    const filePath = req.file.path;
    const fileName = req.file.originalname.toLowerCase();

    if (fileName.endsWith(".pdf")) {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
    } else if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value;
    } else if (fileName.endsWith(".txt")) {
      extractedText = fs.readFileSync(filePath, "utf8");
    } else {
      return res.status(400).json({
        message: "Only PDF, DOCX, TXT files are allowed",
      });
    }

    if (!extractedText || extractedText.trim() === "") {
      return res.status(400).json({
        message: "No readable text found in file",
      });
    }

    const aiResponse = await axios.post(AI_MODEL_URL, {
      text: extractedText.slice(0, 8000),
    });

    const saved = await saveHistory({
      type: "file",
      content: req.file.originalname,
      result: aiResponse.data,
      extractedText,
      userId: req.user?._id || null,
    });

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: "File analysis completed",
      file: req.file.originalname,
      extractedLength: extractedText.length,
      result: {
        ...aiResponse.data,
        blacklistMatches: saved.blacklistMatches,
        priority: saved.priority,
      },
    });
  } catch (error) {
    console.error("FILE ANALYSIS ERROR:", error.response?.data || error.message);

    res.status(500).json({
      message: "File analysis failed",
      error: error.response?.data || error.message,
    });
  }
};

const analyzeBatch = async (req, res) => {
  try {
    const { type, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items array is required",
      });
    }

    const results = [];

    for (const item of items) {
      try {
        let textToAnalyze = item;

        if (type === "url") {
          const page = await axios.get(item, {
            timeout: 10000,
            headers: { "User-Agent": "Mozilla/5.0" },
          });

          const $ = cheerio.load(page.data);
          $("script, style, nav, footer").remove();

          textToAnalyze = $("body")
            .text()
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 8000);
        }

        const aiResponse = await axios.post(AI_MODEL_URL, {
          text: textToAnalyze,
        });

        const saved = await saveHistory({
          type: "batch",
          content: item,
          result: aiResponse.data,
          extractedText: textToAnalyze,
          userId: req.user?._id || null,
        });

        results.push({
          input: item,
          success: true,
          result: {
            ...aiResponse.data,
            blacklistMatches: saved.blacklistMatches,
            priority: saved.priority,
          },
        });
      } catch (err) {
        results.push({
          input: item,
          success: false,
          error: err.message,
        });
      }
    }

    res.status(200).json({
      message: "Batch analysis completed",
      total: results.length,
      results,
    });
  } catch (error) {
    console.error("BATCH ANALYSIS ERROR:", error.response?.data || error.message);

    res.status(500).json({
      message: "Batch analysis failed",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = {
  analyzeText,
  analyzeUrl,
  analyzeFile,
  analyzeBatch,
};
