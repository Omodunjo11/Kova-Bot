const { twilioAccountSid, twilioAuthToken, twilioWhatsappNumber } = require("../config/env");

function parseIncomingWhatsApp(payload) {
  // Twilio sends form-encoded body (parsed by express.urlencoded)
  const from = payload?.From?.replace("whatsapp:", "");
  const text = payload?.Body || "";
  const id = payload?.MessageSid;

  if (!from || !text) return null;
  return { from, text, id };
}

async function sendWhatsAppText({ to, text }) {
  const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  const params = new URLSearchParams({
    From: `whatsapp:${twilioWhatsappNumber}`,
    To: `whatsapp:${to}`,
    Body: text,
  });

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

  return res.json();
}

module.exports = { parseIncomingWhatsApp, sendWhatsAppText };
