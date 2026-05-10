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

const LANGUAGE_KEYWORDS = {
  en: ["english", "change to english", "switch to english"],
  pid: ["pidgin", "naija", "change to pidgin", "switch to pidgin"],
  yo: ["yoruba", "change to yoruba", "switch to yoruba"],
  ig: ["igbo", "change to igbo", "switch to igbo"],
  ha: ["hausa", "change to hausa", "switch to hausa"],
};

function detectLanguageChange(text) {
  const t = text.toLowerCase().trim();
  for (const [code, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) return { code };
  }
  return null;
}

async function enrichUserWithGroup(user) {
  if (!user.role || !["COLLECTOR_LEAD", "COLLECTOR_MEMBER"].includes(user.role)) return user;
  const membership = await prisma.groupMembership.findFirst({
    where: { userId: user.id, role: { in: ["LEAD", "MEMBER"] } },
    include: { group: true },
  });
  if (!membership) return user;
  return { ...user, primaryGroupId: membership.groupId, primaryGroupName: membership.group.name };
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
      processingStatus: extras.processingStatus || "COMPLETED",
      retryCount: extras.retryCount || 0,
      errorMessage: extras.errorMessage || null,
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

  // Handle language change command
  const langChange = detectLanguageChange(messageText);
  if (langChange) {
    await prisma.user.update({ where: { id: user.id }, data: { language: langChange.code } });
    user = { ...user, language: langChange.code };
    const confirmations = {
      en: "Language changed to English.",
      pid: "Language don change to Pidgin.",
      yo: "Ede ti yipada si Yoruba.",
      ig: "Asụsụ agbanwee na Igbo.",
      ha: "An canza yaren zuwa Hausa.",
    };
    const reply = confirmations[langChange.code] || "Language updated.";
    await logEvent(user.id, "OUTBOUND", reply, { roleSnapshot: user.role, intent: "language_change" });
    return reply;
  }

  // Inject user's group ID automatically so collectors don't have to know it
  const enrichedUser = await enrichUserWithGroup(user);

  const responseText = await getRoleAwareReply({ user: enrichedUser, messageText });
  await logEvent(user.id, "OUTBOUND", responseText, {
    roleSnapshot: user.role || null,
    intent: "claude_chat",
  });

  return responseText;
}

module.exports = { handleIncomingMessage };
