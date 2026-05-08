const express = require("express");
const { whatsappVerifyToken } = require("../config/env");
const { parseIncomingWhatsApp, sendWhatsAppText } = require("../services/whatsapp-service");
const { handleIncomingMessage } = require("../services/conversation-service");
const { prisma } = require("../lib/prisma");
const { validateTwilioSignature } = require("../middleware/twilio-signature");
const { enqueue } = require("../services/message-queue");
const { info, error: logError } = require("../lib/logger");
const { increment } = require("../lib/metrics");
const { getOrCreateUserByWhatsApp } = require("../services/user-service");

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

router.post("/", validateTwilioSignature, async (req, res) => {
  increment("webhookInbound");
  const requestId = req.body?.MessageSid || `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
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
    const user = await getOrCreateUserByWhatsApp(parsed.from);
    await prisma.conversationEvent.create({
      data: {
        userId: user.id,
        direction: "INTERNAL",
        messageText: parsed.text,
        intent: "queue_enqueue",
        actionName: "inbound_processing",
        actionResult: JSON.stringify({ requestId, inboundMessageId: parsed.id }),
        processingStatus: "QUEUED",
      },
    });

    enqueue(
      { requestId, parsed, userId: user.id },
      async ({ requestId: jobRequestId, parsed: jobParsed, userId }) => {
        try {
          await prisma.conversationEvent.create({
            data: {
              userId,
              direction: "INTERNAL",
              messageText: jobParsed.text,
              intent: "queue_processing",
              actionName: "inbound_processing",
              actionResult: JSON.stringify({ requestId: jobRequestId, inboundMessageId: jobParsed.id }),
              processingStatus: "PROCESSING",
            },
          });
          const reply = await handleIncomingMessage({
            whatsappNumber: jobParsed.from,
            messageText: jobParsed.text,
            whatsappMessageId: jobParsed.id,
          });

          const sent = await sendWhatsAppText({
            to: jobParsed.from,
            text: reply,
            dedupeKey: `outbound_${jobParsed.id}`,
          });
          await prisma.conversationEvent.create({
            data: {
              userId,
              direction: "INTERNAL",
              messageText: reply,
              whatsappMsgId: `outbound_${jobParsed.id}`,
              intent: "twilio_send",
              actionName: "twilio_send",
              actionResult: JSON.stringify({ requestId: jobRequestId, outboundMessageId: sent.sid }),
              processingStatus: "COMPLETED",
            },
          });
          info("message_processed", {
            requestId: jobRequestId,
            inboundMessageId: jobParsed.id,
            outboundMessageId: sent.sid,
          });
          await prisma.conversationEvent.create({
            data: {
              userId,
              direction: "INTERNAL",
              messageText: reply,
              intent: "queue_complete",
              actionName: "inbound_processing",
              actionResult: JSON.stringify({ requestId: jobRequestId, outboundMessageId: sent.sid }),
              processingStatus: "COMPLETED",
            },
          });
        } catch (error) {
          await prisma.conversationEvent.create({
            data: {
              userId,
              direction: "INTERNAL",
              messageText: jobParsed.text,
              intent: "queue_failed",
              actionName: "inbound_processing",
              actionResult: JSON.stringify({ requestId: jobRequestId, inboundMessageId: jobParsed.id }),
              processingStatus: "FAILED",
              errorMessage: error.message,
              retryCount: 0,
            },
          });
          throw error;
        }
      }
    );

    info("webhook_accepted", { requestId, inboundMessageId: parsed.id });
    return res.sendStatus(200);
  } catch (error) {
    logError("webhook_error", { requestId, error: error.message });
    return res.sendStatus(500);
  }
});

module.exports = router;
