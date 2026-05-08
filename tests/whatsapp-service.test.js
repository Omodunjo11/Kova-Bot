const test = require("node:test");
const assert = require("node:assert/strict");

const { parseIncomingWhatsApp } = require("../src/services/whatsapp-service");

test("parseIncomingWhatsApp extracts sender, text, and message id", () => {
  const parsed = parseIncomingWhatsApp({
    From: "whatsapp:+15551234567",
    Body: "Hello Kova",
    MessageSid: "SM123",
  });

  assert.deepEqual(parsed, {
    from: "+15551234567",
    text: "Hello Kova",
    id: "SM123",
  });
});

test("parseIncomingWhatsApp returns null for empty body", () => {
  const parsed = parseIncomingWhatsApp({
    From: "whatsapp:+15551234567",
    Body: "",
    MessageSid: "SM123",
  });
  assert.equal(parsed, null);
});
