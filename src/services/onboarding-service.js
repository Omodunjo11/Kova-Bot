const { ROLES } = require("../constants/roles");
const { assignRole } = require("./user-service");

const SELF_SELECTABLE_ROLES = new Set([
  ROLES.COLLECTOR_LEAD,
  ROLES.COLLECTOR_MEMBER,
  ROLES.END_USER,
  ROLES.LENDER_PARTNER,
]);

function needsOnboarding(user) {
  return !user.role;
}

function getRoleOnboardingPrompt() {
  return [
    "Welcome to Kova. Before we continue, choose your role:",
    "1) Collector Lead",
    "2) Collector Member",
    "3) End User",
    "4) Lender/Partner",
    "",
    "Reply with 1, 2, 3, or 4.",
  ].join("\n");
}

function parseRoleSelection(text) {
  const clean = String(text || "").trim().toLowerCase();
  if (clean === "1") return ROLES.COLLECTOR_LEAD;
  if (clean === "2") return ROLES.COLLECTOR_MEMBER;
  if (clean === "3") return ROLES.END_USER;
  if (clean === "4") return ROLES.LENDER_PARTNER;
  return null;
}

async function maybeHandleOnboardingReply(user, messageText) {
  if (!needsOnboarding(user)) return { handled: false };

  const selectedRole = parseRoleSelection(messageText);
  if (!selectedRole || !SELF_SELECTABLE_ROLES.has(selectedRole)) {
    return { handled: true, responseText: getRoleOnboardingPrompt() };
  }

  const updated = await assignRole({
    targetUserId: user.id,
    role: selectedRole,
    reason: "Self-selected on first WhatsApp message",
  });

  return {
    handled: true,
    user: updated,
    responseText: `Great, your role is set to ${selectedRole.replaceAll("_", " ")}. You can start chatting now.`,
  };
}

module.exports = { needsOnboarding, getRoleOnboardingPrompt, maybeHandleOnboardingReply };
