require("dotenv").config();
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function getConfiguredNumbers() {
  const fromRaw =
    process.env.TWILIO_PHONE_NUMBER ||
    process.env.TWILIO_WHATSAPP_NUMBER ||
    "";
  const toRaw =
    process.env.TO_PHONE_NUMBER || process.env.TWILIO_TO_NUMBER || "";

  if (!fromRaw || !toRaw) {
    throw new Error(
      'Missing phone config. Set "TWILIO_PHONE_NUMBER" (or "TWILIO_WHATSAPP_NUMBER") and "TO_PHONE_NUMBER" (or "TWILIO_TO_NUMBER") in .env.'
    );
  }

  const isWhatsappFrom = fromRaw.startsWith("whatsapp:") || !!process.env.TWILIO_WHATSAPP_NUMBER;
  const from = isWhatsappFrom && !fromRaw.startsWith("whatsapp:") ? `whatsapp:${fromRaw}` : fromRaw;
  const to = isWhatsappFrom && !toRaw.startsWith("whatsapp:") ? `whatsapp:${toRaw}` : toRaw;

  return { from, to };
}

async function main() {
  const { from, to } = getConfiguredNumbers();
  const msg = await client.messages.create({
    body: "Test message from Twilio",
    from,
    to,
  });
  console.log("Message SID:", msg.sid);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
