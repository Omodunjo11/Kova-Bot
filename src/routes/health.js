const express = require("express");
const { prisma } = require("../lib/prisma");
const { snapshot } = require("../lib/metrics");
const { getQueueDepth } = require("../services/message-queue");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, service: "kova-whatsapp-bot" });
});

router.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      ok: true,
      service: "kova-whatsapp-bot",
      dependencies: { database: "up" },
      queueDepth: getQueueDepth(),
    });
  } catch (_error) {
    return res.status(503).json({
      ok: false,
      service: "kova-whatsapp-bot",
      dependencies: { database: "down" },
      queueDepth: getQueueDepth(),
    });
  }
});

router.get("/metrics", (_req, res) => {
  const metrics = snapshot();
  res.json({
    ok: true,
    service: "kova-whatsapp-bot",
    queueDepth: getQueueDepth(),
    metrics,
    alerts: {
      twilioSendFailureWarning: metrics.twilioSendFailure >= 5,
      queueFailureWarning: metrics.queueFailed >= 3,
      webhookSignatureWarning: metrics.webhookSignatureRejected >= 5,
    },
  });
});

module.exports = router;
