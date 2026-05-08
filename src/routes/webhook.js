const express = require("express");
const { whatsappVerifyToken } = require("../config/env");
const { parseIncomingWhatsApp, sendWhatsAppText } = require("../services/whatsapp-service");
const { handleIncomingMessage } = require("../services/conversation-service");
const { prisma } = require("../lib/prisma");

const router = express.Router();

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === whatsappVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/", async (req, res) => {
  try {
    const parsed = parseIncomingWhatsApp(req.body);
    if (!parsed) return res.sendStatus(200);

    // Deduplicate: WhatsApp sometimes delivers the same message twice
    if (parsed.id) {
      const already = await prisma.conversationEvent.findUnique({
        where: { whatsappMsgId: parsed.id },
      });
      if (already) return res.sendStatus(200);
    }

    const reply = await handleIncomingMessage({
      whatsappNumber: parsed.from,
      messageText: parsed.text,
      whatsappMessageId: parsed.id,
    });

    await sendWhatsAppText({ to: parsed.from, text: reply });
    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    return res.sendStatus(500);
  }
});

module.exports = router;
