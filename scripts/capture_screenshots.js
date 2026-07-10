/**
 * Capture real BAREAI UI screenshots for thesis document.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require(path.join(__dirname, "..", "backend", "node_modules", "puppeteer"));
const jwt = require(path.join(__dirname, "..", "backend", "node_modules", "jsonwebtoken"));
require(path.join(__dirname, "..", "backend", "node_modules", "dotenv")).config({
  path: path.join(__dirname, "..", "backend", ".env"),
});

const BASE = "http://localhost:5173";
const API = "http://localhost:5000/api";
const OUT_DIR = path.join(__dirname, "..", "thesis_assets", "screenshots");
const ADMIN_EMAIL = "admin@bareai.com";
const ADMIN_PASSWORD = "Admin@12345";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));
const User = require(path.join(__dirname, "..", "backend", "model", "user"));

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shot(page, filename) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: outPath, fullPage: false, type: "png" });
  console.log("Saved:", outPath);
}

async function getAdminToken() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    throw new Error("MONGO_URI and JWT_SECRET required in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  let user = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (!user) {
    user = await User.findOne({ role: "admin" });
  }
  await mongoose.disconnect();

  if (!user) {
    throw new Error("No admin user found. Run: node backend/seedAdmin.js");
  }

  const token = jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  const sessionUser = {
    id: user._id.toString(),
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    isPasswordChangeRequired: user.isPasswordChangeRequired || false,
    theme: user.theme || "dark",
    emailAlerts: user.emailAlerts,
    pushNotifications: user.pushNotifications,
  };

  console.log("Session ready for admin screenshots");
  return { token, user: sessionUser };
}

async function injectAuth(page, token, user) {
  await page.evaluateOnNewDocument(
    (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    },
    { token, user }
  );
}

async function gotoAuthed(page, path, waitText) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 60000 });
  await wait(1500);
  if (page.url().includes("/login")) {
    throw new Error(`Auth redirect on ${path} — still on login page`);
  }
  if (waitText) {
    await page.waitForFunction(
      (text) => document.body && document.body.innerText.includes(text),
      { timeout: 20000 },
      waitText
    );
  }
  await wait(2000);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    // Public pages (no auth)
    const publicPage = await browser.newPage();
    await publicPage.goto(BASE, { waitUntil: "networkidle2", timeout: 60000 });
    await wait(2500);
    await shot(publicPage, "fig_5_11_landing.png");
    await publicPage.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
    await wait(2000);
    await shot(publicPage, "fig_5_12_login.png");
    await publicPage.close();

    const { token, user } = await getAdminToken();
    const page = await browser.newPage();
    await injectAuth(page, token, user);
    await gotoAuthed(page, "/dashboard", "Dashboard");
    await shot(page, "fig_5_14_dashboard.png");

    await gotoAuthed(page, "/analysis", "Analysis");
    await shot(page, "fig_5_15_analysis.png");

    const textarea = await page.$("textarea");
    if (textarea) {
      await textarea.click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await textarea.type(
        "Nin ayaa lagu dilay degmada Hodan shalay habeenkii. Waxaa goobta ka dhacay rasaas iyo rabshado culus.",
        { delay: 8 }
      );
      const btn = await page.$('button[type="submit"]');
      if (btn) {
        await btn.click();
        await page.waitForFunction(
          () => /Crime|Not-crime|Not crime/i.test(document.body.innerText),
          { timeout: 20000 }
        );
        await wait(1500);
        await shot(page, "fig_5_16_result.png");
      }
    }

    await gotoAuthed(page, "/blacklist", "Blacklist");
    await shot(page, "fig_5_17_blacklist.png");

    await gotoAuthed(page, "/notifications", "Notification");
    await shot(page, "fig_5_18_notifications.png");

    await gotoAuthed(page, "/cases", "Case");
    await shot(page, "fig_5_19_cases.png");

    console.log("All real screenshots captured.");
  } catch (err) {
    console.error("Screenshot error:", err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
