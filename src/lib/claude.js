const Anthropic = require("@anthropic-ai/sdk");
const { anthropicApiKey } = require("../config/env");

const client = new Anthropic({
  apiKey: anthropicApiKey,
});

async function getRoleAwareReply({ user, messageText }) {
  const system = [
    "You are Kova's WhatsApp assistant.",
    "Be concise, helpful, and safe.",
    `Current user role: ${user.role || "UNASSIGNED"}.`,
    "Never reveal private data from other users or groups.",
    "If role is END_USER, only discuss their own score/history.",
    "If role is COLLECTOR_MEMBER, allow operational updates but no role changes.",
    "If role is COLLECTOR_LEAD, allow full group ops.",
    "If role is LENDER_PARTNER, discuss aggregate/risk views only.",
    "If role is KOVA_ADMIN, allow internal ops language.",
  ].join(" ");

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: messageText }],
  });

  const first = msg.content.find((c) => c.type === "text");
  return first ? first.text : "I can help with your Kova account. Tell me what you need.";
}

module.exports = { getRoleAwareReply };
