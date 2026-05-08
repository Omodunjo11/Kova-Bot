const { prisma } = require("../lib/prisma");
const { getOrCreateUserByWhatsApp } = require("./user-service");
const { needsOnboarding, getRoleOnboardingPrompt, maybeHandleOnboardingReply } = require("./onboarding-service");
const { getRoleAwareReply } = require("../lib/claude");

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
