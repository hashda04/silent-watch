import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import nodemailer from "nodemailer";
import fetch from "node-fetch";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config(); // Load .env file

const app = express();
const PORT = 4001;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema
const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  event: Object,
  silentFailure: { type: Boolean, default: false },
});
const Log = mongoose.model("Log", logSchema);

app.use(cors());
app.use(express.json());

// --- API Routes --- //
app.post("/log", async (req, res) => {
  try {
    const log = new Log(req.body);
    await log.save();
    console.log("[SilentWatch] Log saved:", req.body);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error saving log:", err);
    res.status(500).json({ status: "error" });
  }
});

app.get("/logs", async (req, res) => {
  const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
  res.json(logs);
});

app.get("/stats", async (req, res) => {
  const total = await Log.countDocuments();
  const failures = await Log.countDocuments({ "event.silentFailure": true });
  res.json({
    total,
    failures,
    failureRate: total ? (failures / total) * 100 : 0,
  });
});

// --- Alerts --- //
async function sendSlackAlert(message) {
  if (!process.env.SLACK_WEBHOOK) return;
  await fetch(process.env.SLACK_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmailAlert(subject, message) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  await transporter.sendMail({
    from: `SilentWatch <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject,
    text: message,
  });
}

// Cron Job
cron.schedule("*/5 * * * *", async () => {
  const total = await Log.countDocuments();
  const failures = await Log.countDocuments({ "event.silentFailure": true });
  const failureRate = total ? (failures / total) * 100 : 0;

  if (failureRate > 20) {
    const alertMsg = `🚨 High Silent Failures: ${failureRate.toFixed(2)}% in the last 5 minutes.`;
    console.log(alertMsg);
    await sendSlackAlert(alertMsg);
    await sendEmailAlert("SilentWatch Alert", alertMsg);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[SilentWatch Backend] Running on http://localhost:${PORT}`);
});