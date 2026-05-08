const { prisma } = require("../lib/prisma");
const { ROLES } = require("../constants/roles");
const { assignRole } = require("./user-service");

/* ================================================================
   ONBOARDING STATE MACHINE
   Steps per role type:

   All users:
     1. language  - detect or ask preferred language
     2. role      - pick Collector Lead / Member / End User / Lender
     3. name      - ask their name

   COLLECTOR_LEAD / COLLECTOR_MEMBER only:
     4. group     - ask group name (we create it or link to existing)

   END_USER only:
     4. collector - ask which collector/group they belong to

   LENDER_PARTNER:
     done after name

   On completion: write language, fullName, role to DB.
   ================================================================ */

const SELF_SELECTABLE_ROLES = new Set([
  ROLES.COLLECTOR_LEAD,
  ROLES.COLLECTOR_MEMBER,
  ROLES.END_USER,
  ROLES.LENDER_PARTNER,
]);

const LANGUAGE_MAP = {
  en: "English",
  pid: "Pidgin",
  yo: "Yoruba",
  ig: "Igbo",
  ha: "Hausa",
};

/* ── Onboarding state is stored as JSON in a dedicated DB table.
   We use the ConversationEvent table with intent="onboarding_state"
   and actionResult holding the JSON state blob. ── */

async function getOnboardingState(userId) {
  const event = await prisma.conversationEvent.findFirst({
    where: { userId, intent: "onboarding_state" },
    orderBy: { createdAt: "desc" },
  });
  if (!event || !event.actionResult) return {};
  try { return JSON.parse(event.actionResult); } catch (_) { return {}; }
}

async function saveOnboardingState(userId, state) {
  await prisma.conversationEvent.create({
    data: {
      userId,
      direction: "INTERNAL",
      messageText: "",
      intent: "onboarding_state",
      actionResult: JSON.stringify(state),
    },
  });
}

/* ── needsOnboarding: true if role not yet set ── */
function needsOnboarding(user) {
  return !user.role;
}

/* ── Language detection: check for common words ── */
function detectLanguage(text) {
  const t = text.toLowerCase();
  if (/\b(wetin|abeg|dey|don|oga|wahala|na|sabi|abi|nawa)\b/.test(t)) return "pid";
  if (/\b(e kaabo|bawo|ejo|dupe|beeni|rara)\b/.test(t)) return "yo";
  if (/\b(nno|biko|oya|kedu|nnoo|daalu)\b/.test(t)) return "ig";
  if (/\b(sannu|yaya|nagode|toh|yauwa|ina kwana)\b/.test(t)) return "ha";
  return "en";
}

/* ── Build prompt in the right language ── */
function t(lang, key) {
  const strings = {
    askRole: {
      en: "Welcome to Kova! Build Trust. Unlock Access.\n\nWhat best describes you?\n\n1) Collector Lead (I collect money from a group)\n2) Collector Member (I help collect for a group)\n3) Member / End User (I pay into a group)\n4) Lender / Partner\n\nReply with 1, 2, 3, or 4.",
      pid: "Welcome to Kova! Build Trust. Unlock Access.\n\nWetin describe you?\n\n1) Collector Lead (I dey collect money for group)\n2) Collector Member (I dey help collect)\n3) Member (I dey pay inside group)\n4) Lender / Partner\n\nReply with 1, 2, 3, or 4.",
      yo: "E kaabo si Kova! Build Trust. Unlock Access.\n\nEwo lo ṣe apejuwe re?\n\n1) Olori Ajo (Mo gba owo fun ajo)\n2) Omo Ajo (Mo ran olori ajo lowo)\n3) Egbe Ajo (Mo na sinu ajo)\n4) Aladani / Alabaṣiṣẹ\n\nDahun pelu 1, 2, 3, tabi 4.",
      ig: "Nno na Kova! Build Trust. Unlock Access.\n\nKedu nke na-akọwa gi?\n\n1) Onye ndu otu (A na-akota ego n'otu)\n2) Onye otu (Ana-enyere ndu aka)\n3) Onye otu (Ana-akwu n'otu)\n4) Onye mbinye ego / Onye mmekọ\n\nZa ya site na 1, 2, 3, ma o bu 4.",
      ha: "Barka da zuwa Kova! Build Trust. Unlock Access.\n\nWanne ya kwatanta kai?\n\n1) Shugaban Mai Tattarawa (Ina tattara kudi)\n2) Memba mai tattarawa (Ina taimakawa)\n3) Mambobi (Ina biya cikin rukuni)\n4) Mai ba da bashi / Abokin hulda\n\nAmsa da 1, 2, 3, ko 4.",
    },
    askName: {
      en: "What is your name?",
      pid: "Wetin be your name?",
      yo: "Kini oruko re?",
      ig: "Gini bu aha gi?",
      ha: "Menene sunanka?",
    },
    askGroupName: {
      en: "What is the name of your group or collection?",
      pid: "Wetin be the name of your group?",
      yo: "Kini oruko ajo re?",
      ig: "Gini bu aha otu gi?",
      ha: "Menene sunan rukunin ka?",
    },
    askCollectorGroup: {
      en: "Which collector or group do you belong to? Type their name or phone number.",
      pid: "Which collector you dey under? Type their name or number.",
      yo: "Tani olori ajo re? Ko oruko tabi nọmba foonu won.",
      ig: "Onye bu isi otu gi? Dee aha ya ma o bu nọmba ekwentị ya.",
      ha: "Wane mai tattarawa kake cikin rukuninsa? Rubuta sunansa ko lambarsa.",
    },
    doneCollector: {
      en: (name, group) => `Welcome, ${name}! Your Kova collector account is set up.\n\nGroup: ${group || "Not linked yet"}\n\nYou can now:\n• Check who paid: "who paid?"\n• Record a payment: "Chioma paid N5000"\n• Add a member: "add 0803 456 7890 Bisi"\n• Send reminders: "send reminders"\n• Group summary: "summary"`,
      pid: (name, group) => `Welcome, ${name}! Your Kova account don set.\n\nGroup: ${group || "No group yet"}\n\nYou fit:\n• Check who pay: "who pay?"\n• Record payment: "Chioma pay N5000"\n• Add member: "add 0803 456 7890 Bisi"\n• Send reminder: "send reminder"\n• Summary: "summary"`,
      yo: (name, group) => `E kaabo, ${name}! Akanti Kova re ti ṣetan.\n\nAjo: ${group || "Ko si ajo bi o ti je"}\n\nO le:\n• Ẹ wo tani ti san: "tani ti san?"\n• Gbasilẹ isanwo: "Chioma san N5000"\n• Fi ẹgbẹ kun: "fi 0803 456 7890 Bisi"\n• Firanṣẹ iranti: "firanṣẹ iranti"`,
      ig: (name, group) => `Nnọọ, ${name}! Akaunt Kova gi adị njikere.\n\nOtu: ${group || "Enweghi otu ọ bụ ugbu a"}\n\nI nwere ike:\n• Lee onye kwụrụ: "onye kwụrụ?"\n• Dekọ ụgwọ: "Chioma kwụrụ N5000"\n• Tinye onye otu ọhụrụ: "tinye 0803 456 7890 Bisi"\n• Zipu ihe ncheta: "zipu ihe ncheta"`,
      ha: (name, group) => `Barka, ${name}! Asusun Kova naka ya shirya.\n\nRukuni: ${group || "Ba rukuni tukuna"}\n\nZa ka iya:\n• Duba wanda ya biya: "wanda ya biya?"\n• Yi rikodin biya: "Chioma ta biya N5000"\n• Kara mambobi: "kara 0803 456 7890 Bisi"\n• Aika tunatarwa: "aika tunatarwa"`,
    },
    doneMember: {
      en: (name, score, tier) => `Welcome, ${name}! Your Kova account is ready.\n\nYour TradeScore: ${score} (Tier ${tier})\n\nYou can ask:\n• "My score" - see your TradeScore\n• "What can I unlock?" - see your benefits\n• "How to improve" - your growth plan\n• "KovaCredit" - credit you qualify for`,
      pid: (name, score, tier) => `Welcome, ${name}! Your Kova account don ready.\n\nYour TradeScore: ${score} (Tier ${tier})\n\nYou fit ask:\n• "My score"\n• "What I fit unlock?"\n• "How to improve"\n• "KovaCredit"`,
      yo: (name, score, tier) => `E kaabo, ${name}! Akanti Kova re ti ṣetan.\n\nTradeScore re: ${score} (Tier ${tier})\n\nO le beere:\n• "Score mi"\n• "Kini Mo le gba?"\n• "Bii o ṣe le dara si"`,
      ig: (name, score, tier) => `Nnọọ, ${name}! Akaunt Kova gi adị njikere.\n\nTradeScore gi: ${score} (Tier ${tier})\n\nI nwere ike ajụ:\n• "Score m"\n• "Gịnị ka m nwere ike nweta?"\n• "Otu esi emezi ya"`,
      ha: (name, score, tier) => `Barka, ${name}! Asusun Kova naka ya shirya.\n\nTradeScore naka: ${score} (Tier ${tier})\n\nZa ka iya tambaya:\n• "Maki na"\n• "Menene zan iya samu?"\n• "Yadda ake inganta"`,
    },
  };

  const langStrings = strings[key];
  if (!langStrings) return key;
  return langStrings[lang] || langStrings.en;
}

/* ================================================================
   MAIN HANDLER
   ================================================================ */
async function maybeHandleOnboardingReply(user, messageText) {
  if (!needsOnboarding(user)) return { handled: false };

  const state = await getOnboardingState(user.id);
  const lang = state.language || detectLanguage(messageText) || "en";
  const raw = String(messageText || "").trim();

  /* ── STEP 1: No role set, no state yet - ask for role ── */
  if (!state.step) {
    // If they already typed a number, process it immediately
    const roleFromNumber = parseRoleNumber(raw);
    if (roleFromNumber) {
      const newState = { step: "name", language: lang, role: roleFromNumber };
      await saveOnboardingState(user.id, newState);
      return { handled: true, responseText: t(lang, "askName") };
    }
    // Otherwise show the menu
    await saveOnboardingState(user.id, { step: "role", language: lang });
    return { handled: true, responseText: t(lang, "askRole") };
  }

  /* ── STEP: Awaiting role selection ── */
  if (state.step === "role") {
    const selectedRole = parseRoleNumber(raw);
    if (!selectedRole) {
      return { handled: true, responseText: t(lang, "askRole") };
    }
    const newState = { ...state, step: "name", role: selectedRole };
    await saveOnboardingState(user.id, newState);
    return { handled: true, responseText: t(lang, "askName") };
  }

  /* ── STEP: Awaiting name ── */
  if (state.step === "name") {
    const name = raw.length >= 2 ? raw : null;
    // Decide next step based on role
    const role = state.role;
    const nextStep = needsGroupStep(role) ? "group" : "done";
    const newState = { ...state, step: nextStep, name };
    await saveOnboardingState(user.id, newState);

    if (nextStep === "done") {
      return finishOnboarding(user, newState);
    }

    const prompt = isCollectorRole(role) ? t(lang, "askGroupName") : t(lang, "askCollectorGroup");
    return { handled: true, responseText: prompt };
  }

  /* ── STEP: Awaiting group info ── */
  if (state.step === "group") {
    const groupInput = raw;
    const newState = { ...state, step: "done", groupInput };
    await saveOnboardingState(user.id, newState);
    return finishOnboarding(user, newState);
  }

  /* ── Fallback: re-show menu ── */
  return { handled: true, responseText: t(lang, "askRole") };
}

/* ================================================================
   FINISH ONBOARDING - write everything to DB
   ================================================================ */
async function finishOnboarding(user, state) {
  const { role, name, language, groupInput } = state;
  const lang = language || "en";

  // 1. Assign role
  const updated = await assignRole({
    targetUserId: user.id,
    role,
    reason: "Self-selected during WhatsApp onboarding",
  });

  // 2. Write name + language
  const finalUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: name || null,
      language: lang,
    },
  });

  let groupName = null;

  // 3. Handle group linking
  if (groupInput) {
    if (isCollectorRole(role)) {
      // Create or find a group by name for this collector
      let group = await prisma.collectorGroup.findFirst({
        where: { name: { equals: groupInput, mode: "insensitive" } },
      });
      if (!group) {
        group = await prisma.collectorGroup.create({
          data: {
            name: groupInput,
            type: role === ROLES.COLLECTOR_LEAD ? "Ajo" : "Ajo",
          },
        });
      }
      // Add collector as LEAD or MEMBER
      await prisma.groupMembership.upsert({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
        update: {},
        create: {
          userId: user.id,
          groupId: group.id,
          role: role === ROLES.COLLECTOR_LEAD ? "LEAD" : "MEMBER",
        },
      });
      groupName = group.name;
    } else {
      // End user - try to find their collector by name or phone
      const normalized = String(groupInput).replace(/[^\d+]/g, "");
      const collectorUser = normalized.length >= 7
        ? await prisma.user.findUnique({ where: { whatsappNumber: normalized } })
        : await prisma.user.findFirst({ where: { fullName: { contains: groupInput, mode: "insensitive" } } });

      if (collectorUser) {
        // Find a group the collector leads
        const membership = await prisma.groupMembership.findFirst({
          where: { userId: collectorUser.id, role: "LEAD" },
          include: { group: true },
        });
        if (membership) {
          await prisma.groupMembership.upsert({
            where: { userId_groupId: { userId: user.id, groupId: membership.groupId } },
            update: {},
            create: { userId: user.id, groupId: membership.groupId, role: "END_USER" },
          });
          groupName = membership.group.name;
        }
      }
    }
  }

  // 4. Compute their score
  const { score, tier } = await require("./kova-tools").computeScore(user.id);
  const displayName = name || "there";

  let responseText;
  if (isCollectorRole(role)) {
    const fn = t(lang, "doneCollector");
    responseText = typeof fn === "function" ? fn(displayName, groupName) : fn;
  } else {
    const fn = t(lang, "doneMember");
    responseText = typeof fn === "function" ? fn(displayName, score, tier) : fn;
  }

  return { handled: true, user: finalUser, responseText };
}

/* ================================================================
   HELPERS
   ================================================================ */
function parseRoleNumber(text) {
  const clean = String(text || "").trim();
  if (clean === "1") return ROLES.COLLECTOR_LEAD;
  if (clean === "2") return ROLES.COLLECTOR_MEMBER;
  if (clean === "3") return ROLES.END_USER;
  if (clean === "4") return ROLES.LENDER_PARTNER;
  return null;
}

function needsGroupStep(role) {
  return [ROLES.COLLECTOR_LEAD, ROLES.COLLECTOR_MEMBER, ROLES.END_USER].includes(role);
}

function isCollectorRole(role) {
  return [ROLES.COLLECTOR_LEAD, ROLES.COLLECTOR_MEMBER].includes(role);
}

module.exports = { needsOnboarding, maybeHandleOnboardingReply };
