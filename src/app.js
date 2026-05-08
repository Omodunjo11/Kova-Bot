const express = require("express");
const healthRouter = require("./routes/health");
const webhookRouter = require("./routes/webhook");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false })); // Twilio sends form-encoded bodies
app.use("/health", healthRouter);
app.use("/webhook/whatsapp", webhookRouter);

module.exports = app;
