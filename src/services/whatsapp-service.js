const { whatsappAccessToken, whatsappPhoneNumberId } = require("../config/env");

function parseIncomingWhatsApp(payload) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  const from = message?.from;
  const text = message?.text?.body || "";
  const id = message?.id;

  if (!from || !text) return null;
  return { from, text, id };
}

async function sendWhatsAppText({ to, text }) {
  const url = `https://graph.facebook.com/v22.0/${whatsappPhoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${whatsappAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`WhatsApp send failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

module.exports = { parseIncomingWhatsApp, sendWhatsAppText };
