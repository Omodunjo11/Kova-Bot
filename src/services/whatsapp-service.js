const { twilioAccountSid, twilioAuthToken, twilioWhatsappNumber } = require("../config/env");
const { prisma } = require("../lib/prisma");
const { increment } = require("../lib/metrics");
const { warn } = require("../lib/logger");

function parseIncomingWhatsApp(payload) {
  // Twilio sends form-encoded body (parsed by express.urlencoded)
  const from = payload?.From?.replace("whatsapp:", "");
  const text = payload?.Body || "";
  const id = payload?.MessageSid;

  if (!from || !text) return null;
  return { from, text, id };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWhatsAppText({ to, text, dedupeKey = null, maxRetries = 3 }) {
  if (dedupeKey) {
    const alreadySent = await prisma.conversationEvent.findFirst({
      where: {
        actionName: "twilio_send",
        whatsappMsgId: dedupeKey,
      },
    });
    if (alreadySent) {
      return { sid: dedupeKey, deduped: true };
    }
  }

  const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  const params = new URLSearchParams({
    From: `whatsapp:${twilioWhatsappNumber}`,
    To: `whatsapp:${to}`,
    Body: text,
  });

  let attempt = 0;
  let lastError;
  while (attempt < maxRetries) {
    attempt += 1;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Twilio send failed: ${res.status} ${errorText}`);
      }

      increment("twilioSendSuccess");
      return res.json();
    } catch (error) {
      increment("twilioSendFailure");
      lastError = error;
      warn("twilio_send_retry", { attempt, error: error.message });
      if (attempt < maxRetries) {
        await sleep(250 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError;
}

module.exports = { parseIncomingWhatsApp, sendWhatsAppText };
