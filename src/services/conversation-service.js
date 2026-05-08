const { prisma } = require("../lib/prisma");
const { getOrCreateUserByWhatsApp } = require("./user-service");
const { needsOnboarding, getRoleOnboardingPrompt, maybeHandleOnboardingReply } = require("./onboarding-service");
const { getRoleAwareReply } = require("../lib/claude");
const { ROLES } = require("../constants/roles");

const DAILY_LIMITS = {
  [ROLES.END_USER]: 15,
  [ROLES.COLLECTOR_MEMBER]: 25,
  [ROLES.COLLECTOR_LEAD]: 40,
  [ROLES.LENDER_PARTNER]: 20,
  [ROLES.KOVA_ADMIN]: Infinity,
};

async function checkRateLimit(user) {
  if (!user.role) return { allowed: true };

  const limit = DAILY_LIMITS[user.role] ?? 15;
  if (limit === Infinity) return { allowed: true };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await prisma.conversationEvent.count({
    where: {
      userId: user.id,
      direction: "INBOUND",
      createdAt: { gte: startOfDay },
    },
  });

  if (count >= limit) {
    return {
      allowed: false,
      message: `You've reached your daily limit of ${limit} messages. Your limit resets at midnight. Upgrade your plan for more access.`,
    };
  }

  return { allowed: true };
}

async function logEvent(userId, direction, messageText, extras = {}) {
  await prisma.conversationEvent.create({
    data: {
      userId,
      direction,
      messageText: messageText || "",
      whatsappMsgId: extras.whatsappMsgId || null,
      roleSnapshot: extras.roleSnapshot || null,
      intent: extras.intent || null,
      actionName: extras.actionName || null,
      actionResult: extras.actionResult || null,
    },
  });
}

async function handleIncomingMessage({ whatsappNumber, messageText, whatsappMessageId }) {
  let user = await getOrCreateUserByWhatsApp(whatsappNumber);
  await logEvent(user.id, "INBOUND", messageText, {
    whatsappMsgId: whatsappMessageId,
    roleSnapshot: user.role || null,
  });

  const rateCheck = await checkRateLimit(user);
  if (!rateCheck.allowed) {
    await logEvent(user.id, "OUTBOUND", rateCheck.message, { roleSnapshot: user.role, intent: "rate_limit" });
    return rateCheck.message;
  }

  if (needsOnboarding(user)) {
    const onboardingHandled = await maybeHandleOnboardingReply(user, messageText);
    if (onboardingHandled.handled) {
      if (onboardingHandled.user) user = onboardingHandled.user;
      await logEvent(user.id, "OUTBOUND", onboardingHandled.responseText, {
        roleSnapshot: user.role || null,
        intent: "onboarding",
      });
      return onboardingHandled.responseText;
    }
    return getRoleOnboardingPrompt();
  }

  const responseText = await getRoleAwareReply({ user, messageText });
  await logEvent(user.id, "OUTBOUND", responseText, {
    roleSnapshot: user.role || null,
    intent: "claude_chat",
  });

  return responseText;
}

module.exports = { handleIncomingMessage };
