import { useState, useRef, useEffect, useCallback } from "react";

/* ================================================================
   BACKEND WEBHOOK CONFIG
   Set your endpoint here - Airtable, Make.com, Zapier, Supabase, etc.
   POST body: { event, data, timestamp }
   Leave empty to disable.
   ================================================================ */
const WEBHOOK_URL = "";

async function sendToBackend(event, data) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
    });
  } catch (_) {}
}

/* ================================================================
   STATIC DATA
   ================================================================ */
const COLLECTORS_STATIC = [
  {
    id: "ajo", label: "Ajo Group", emoji: "🔄", name: "Adebayo's Market Women Circle",
    type: "Ajo savings group (rotating)", cycle: "Weekly", amount: 5000, period: "Week 18 of 20",
    pot: 100000, nextPayout: "Chioma (Week 19)",
    members: [
      { name:"Chioma Eze",       phone:"+234 803 123 4567", score:780, tier:2, status:"Good",     paid:true,  date:"May 2",  late:false, weeks:18 },
      { name:"Amaka Nwankwo",    phone:"+234 807 345 6789", score:820, tier:2, status:"Good",     paid:true,  date:"May 2",  late:false, weeks:18 },
      { name:"Funke Adeyemi",    phone:"+234 802 987 6543", score:720, tier:2, status:"Good",     paid:true,  date:"May 3",  late:false, weeks:17 },
      { name:"Ngozi Obi",        phone:"+234 806 444 5566", score:890, tier:3, status:"Good",     paid:true,  date:"May 1",  late:false, weeks:20 },
      { name:"Tunde Afolabi",    phone:"+234 810 678 9012", score:520, tier:1, status:"At Risk",  paid:true,  date:"May 4",  late:true,  weeks:14 },
      { name:"Emeka Okafor",     phone:"+234 808 456 7890", score:380, tier:1, status:"Critical", paid:false, date:null,     late:false, weeks:9  },
      { name:"Oluwaseun Bakare", phone:"+234 805 234 5678", score:580, tier:1, status:"At Risk",  paid:false, date:null,     late:false, weeks:12 },
      { name:"Biodun Adeleke",   phone:"+234 809 111 2233", score:460, tier:1, status:"At Risk",  paid:false, date:null,     late:false, weeks:10 },
      { name:"Fatima Bello",     phone:"+234 803 987 1234", score:640, tier:2, status:"Good",     paid:true,  date:"May 2",  late:false, weeks:16 },
      { name:"Ada Okonkwo",      phone:"+234 805 876 2345", score:730, tier:2, status:"Good",     paid:true,  date:"May 3",  late:false, weeks:19 },
      { name:"Sadiq Musa",       phone:"+234 807 765 3456", score:410, tier:1, status:"At Risk",  paid:false, date:null,     late:false, weeks:8  },
      { name:"Kemi Fashola",     phone:"+234 809 654 4567", score:810, tier:2, status:"Good",     paid:true,  date:"May 1",  late:false, weeks:18 },
    ]
  },
  {
    id: "rent", label: "Rent", emoji: "🏠", name: "Alhaji Musa's 14 Properties",
    type: "Landlord rent collection", cycle: "Monthly", amount: 85000, period: "May 2026",
    members: [
      { name:"Kemi Balogun",   phone:"+234 801 222 3344", score:810, tier:2, status:"Good",     paid:true,  date:"May 1",  late:false, weeks:24 },
      { name:"Dare Ogunleye",  phone:"+234 804 333 4455", score:650, tier:2, status:"Good",     paid:true,  date:"May 3",  late:false, weeks:18 },
      { name:"Patience Udo",   phone:"+234 803 555 6677", score:490, tier:1, status:"At Risk",  paid:true,  date:"May 7",  late:true,  weeks:14 },
      { name:"Chukwu Nnaji",   phone:"+234 805 777 8899", score:730, tier:2, status:"Good",     paid:true,  date:"May 2",  late:false, weeks:22 },
      { name:"Yemi Ajala",     phone:"+234 807 888 9900", score:330, tier:1, status:"Critical", paid:false, date:null,     late:false, weeks:6  },
      { name:"Hauwa Abubakar", phone:"+234 809 000 1122", score:410, tier:1, status:"At Risk",  paid:false, date:null,     late:false, weeks:9  },
      { name:"Tola Adeyemi",   phone:"+234 801 111 2233", score:760, tier:2, status:"Good",     paid:true,  date:"May 2",  late:false, weeks:20 },
      { name:"Bola Okafor",    phone:"+234 803 222 3344", score:540, tier:1, status:"At Risk",  paid:true,  date:"May 6",  late:true,  weeks:11 },
    ]
  },
  {
    id: "school", label: "School Fees", emoji: "🎓", name: "Bright Minds Academy",
    type: "School fee collection", cycle: "Termly", amount: 120000, period: "Term 2 - 2026",
    members: [
      { name:"Mrs. Adeleke (Tobi)", phone:"+234 802 111 2233", score:770, tier:2, status:"Good",     paid:true,  date:"Apr 28", late:false, weeks:6 },
      { name:"Mr. Okafor (Ifenna)", phone:"+234 804 222 3344", score:820, tier:2, status:"Good",     paid:true,  date:"Apr 29", late:false, weeks:7 },
      { name:"Mrs. Hassan (Zara)",  phone:"+234 806 333 4455", score:540, tier:1, status:"At Risk",  paid:true,  date:"May 5",  late:true,  weeks:5 },
      { name:"Mr. Bello (Dami)",    phone:"+234 808 444 5566", score:390, tier:1, status:"Critical", paid:false, date:null,     late:false, weeks:3 },
      { name:"Mrs. Nwosu (Chidi)",  phone:"+234 803 555 6677", score:610, tier:2, status:"Good",     paid:false, date:null,     late:false, weeks:6 },
      { name:"Mr. Lawal (Sade)",    phone:"+234 805 666 7788", score:480, tier:1, status:"At Risk",  paid:false, date:null,     late:false, weeks:4 },
    ]
  },
  {
    id: "sme", label: "SME / Traders", emoji: "📦", name: "Lagos Device Finance",
    type: "Inventory & device financing", cycle: "Weekly", amount: 22000, period: "Week 18",
    members: [
      { name:"Seun Fashola",  phone:"+234 801 987 6543", score:840, tier:3, status:"Good",     paid:true,  date:"May 2", late:false, weeks:22 },
      { name:"Bola Tinuola",  phone:"+234 803 876 5432", score:700, tier:2, status:"Good",     paid:true,  date:"May 2", late:false, weeks:18 },
      { name:"Fola Gbadebo",  phone:"+234 805 765 4321", score:460, tier:1, status:"At Risk",  paid:true,  date:"May 5", late:true,  weeks:12 },
      { name:"Kola Adesanya", phone:"+234 807 654 3210", score:280, tier:1, status:"Critical", paid:false, date:null,    late:false, weeks:5  },
      { name:"Ade Bankole",   phone:"+234 809 543 2109", score:590, tier:1, status:"At Risk",  paid:false, date:null,    late:false, weeks:11 },
      { name:"Tola Olatunji", phone:"+234 801 432 1098", score:760, tier:2, status:"Good",     paid:true,  date:"May 3", late:false, weeks:19 },
    ]
  },
  {
    id: "utility", label: "Utility / Bills", emoji: "⚡", name: "EkoGrid Power Co-op",
    type: "Utility & bill collection", cycle: "Monthly", amount: 18000, period: "May 2026",
    members: [
      { name:"Mama Jumoke",     phone:"+234 802 100 2003", score:750, tier:2, status:"Good",     paid:true,  date:"May 1", late:false, weeks:30 },
      { name:"Baba Taiwo",      phone:"+234 804 200 3004", score:680, tier:2, status:"Good",     paid:true,  date:"May 2", late:false, weeks:26 },
      { name:"Sista Ngozi",     phone:"+234 806 300 4005", score:510, tier:1, status:"At Risk",  paid:true,  date:"May 6", late:true,  weeks:18 },
      { name:"Oga Remi",        phone:"+234 808 400 5006", score:420, tier:1, status:"At Risk",  paid:false, date:null,    late:false, weeks:14 },
      { name:"Aunty Shade",     phone:"+234 803 500 6007", score:310, tier:1, status:"Critical", paid:false, date:null,    late:false, weeks:8  },
      { name:"Uncle Emeka",     phone:"+234 805 600 7008", score:870, tier:3, status:"Good",     paid:true,  date:"May 1", late:false, weeks:34 },
      { name:"Damilola Peters", phone:"+234 807 700 8009", score:620, tier:2, status:"Good",     paid:true,  date:"May 3", late:false, weeks:22 },
    ]
  },
];

const TIERS = {
  1: { label:"Tier 1 - Safety First",  desc:"Building habits. Health & emergency protection, baseline credit access, score growth begins.", unlocks:["KovaHealth (N55,000/yr)", "Baseline credit access", "Score tracking begins"] },
  2: { label:"Tier 2 - Growth Mode",   desc:"Lock N1, unlock N2 in credit. N50k locked, N100k credit line. Business growth funding.", unlocks:["N50k locked - N100k credit line","Business growth funding","KovaBusiness inventory financing","Accelerated score momentum"] },
  3: { label:"Tier 3 - Credit Ready",  desc:"Score above 700 - trust is proven. Larger financial tools follow naturally.", unlocks:["Larger working capital","Inventory financing","Auto loans & mortgage access","Premium rates from lenders"] },
};

/* ================================================================
   LANGUAGE STRINGS
   ================================================================ */
const LANG = {
  en: {
    code:"en", label:"English", flag:"🇬🇧",
    welcome:"Welcome to Kova!", tagline:"Build Trust. Unlock Access.",
    roleQuestion:"Are you a *Collector* or a *Member*?\n\nCollector = you collect money from a group (Ajo leader, landlord, school, trader)\nMember = you pay into a group and want to see your score",
    collectorBtn:"I am a Collector", memberBtn:"I am a Member",
    askName:"What is your name?", askPhone:"What is your phone number?",
    askGroupType:"Which type of group do you belong to?",
    askCollectorName:"Which group are you in? Type the collector's name or group name.",
    groupTypes:["Ajo / Savings Group","Rent Payment","School Fees","SME / Trader","Utility / Bills"],
    doneCollector:(n)=>`Welcome back, *${n}*! Your collector dashboard is ready.`,
    doneMember:(n)=>`Welcome, *${n}*! Let's check your Kova score and what you can unlock.`,
    welcomeBack:(n)=>`Welcome back, *${n}*!`,
    phoneHint:"e.g. 0801 234 5678", skip:"Skip", next:"Next →", langQuestion:"What language do you prefer?",
  },
  pid: {
    code:"pid", label:"Pidgin", flag:"🇳🇬",
    welcome:"Welcome to Kova!", tagline:"Build Trust. Unlock Access.",
    roleQuestion:"You be *Collector* or *Member*?\n\nCollector = you dey collect money for group (Ajo leader, landlord, school, trader)\nMember = you dey pay inside group and you wan see your score",
    collectorBtn:"I be Collector", memberBtn:"I be Member",
    askName:"Wetin be your name?", askPhone:"Wetin be your phone number?",
    askGroupType:"Which kain group you dey belong?",
    askCollectorName:"Which group you dey? Type the collector name or group name.",
    groupTypes:["Ajo / Savings Group","Rent Payment","School Fees","SME / Trader","Utility / Bills"],
    doneCollector:(n)=>`Welcome back, *${n}*! Your dashboard don ready.`,
    doneMember:(n)=>`Welcome, *${n}*! Make we check your Kova score and wetin you fit unlock.`,
    welcomeBack:(n)=>`Welcome back, *${n}*!`,
    phoneHint:"e.g. 0801 234 5678", skip:"Skip", next:"Next →", langQuestion:"Which language you prefer?",
  },
  yo: {
    code:"yo", label:"Yoruba", flag:"🟢",
    welcome:"E kaabo si Kova!", tagline:"Kora igbekele. Gba iwole.",
    roleQuestion:"Se o je *Collector* tabi *Member*?\n\nCollector = o gba owo fun ajo tabi ile\nMember = o na sinu ajo o si fe ri iwe-ere re",
    collectorBtn:"Mo je Collector", memberBtn:"Mo je Member",
    askName:"Kini oruko re?", askPhone:"Kini nọmba foonu re?",
    askGroupType:"Iru ajo wo ni o wa ninu?",
    askCollectorName:"Iru ajo wo? Kow oruko olori ajo tabi ajo naa.",
    groupTypes:["Ajo / Savings Group","Owo Ile","Owo Ile-Iwe","Onisowo / Onidata","Ina / Bills"],
    doneCollector:(n)=>`E kaabo, *${n}*! Dashboard re ti setan.`,
    doneMember:(n)=>`E kaabo, *${n}*! Jeki a wo iwe-ere Kova re.`,
    welcomeBack:(n)=>`E kaabo pada, *${n}*!`,
    phoneHint:"e.g. 0801 234 5678", skip:"Fo", next:"Tele →", langQuestion:"Ede wo ni o yan?",
  },
  ig: {
    code:"ig", label:"Igbo", flag:"🟡",
    welcome:"Nno na Kova!", tagline:"Wuo ntukwasiobi. Mepee uzo.",
    roleQuestion:"I bu *Collector* ka o bu *Member*?\n\nCollector = i na-akota ego n'otu\nMember = i na-akwu n'otu ma chefuo ihu skoonu gi",
    collectorBtn:"Abu m Collector", memberBtn:"Abu m Member",
    askName:"Gini bu aha gi?", askPhone:"Gini bu nọmba ekwentị gi?",
    askGroupType:"Kedu otu i nọ n'ime ya?",
    askCollectorName:"Kedu otu? Dee aha onye na-akota ego.",
    groupTypes:["Ajo / Savings Group","Ulo Ire","Ulo Akwukwo","Onye Ahia","Ọkụ / Bills"],
    doneCollector:(n)=>`Nnọọ, *${n}*! Dashboard gi dị njikere.`,
    doneMember:(n)=>`Nnọọ, *${n}*! Ka anyị lelee skoonu Kova gi.`,
    welcomeBack:(n)=>`Nnọọ, *${n}*!`,
    phoneHint:"e.g. 0801 234 5678", skip:"Wụfu", next:"Nọọ →", langQuestion:"Asụsụ ole ka i họrọ?",
  },
  ha: {
    code:"ha", label:"Hausa", flag:"🔵",
    welcome:"Barka da zuwa Kova!", tagline:"Gina Amana. Bude Hanya.",
    roleQuestion:"Kai *Collector* ne ko *Member*?\n\nCollector = kai ne ka tara kudi daga rukunin\nMember = kana biya cikin rukuni kana so ka ga maki ka",
    collectorBtn:"Ni ne Collector", memberBtn:"Ni ne Member",
    askName:"Menene sunanka?", askPhone:"Menene lambar wayarka?",
    askGroupType:"Wane irin rukuni kake ciki?",
    askCollectorName:"Wane rukuni? Rubuta sunan mai tattara ko sunan rukuni.",
    groupTypes:["Ajo / Savings Group","Haya","Kudin Makaranta","Dan Kasuwa","Wuta / Bills"],
    doneCollector:(n)=>`Barka, *${n}*! Dashboard naka ya shirya.`,
    doneMember:(n)=>`Barka, *${n}*! Mu duba maki Kova naka.`,
    welcomeBack:(n)=>`Barka da dawo, *${n}*!`,
    phoneHint:"e.g. 0801 234 5678", skip:"Tsallaka", next:"Gaba →", langQuestion:"Wace harshe kake so?",
  },
};

/* ================================================================
   SCORE GENERATION - deterministic from phone number
   ================================================================ */
function phoneToScore(phone) {
  if (!phone) return 500;
  const digits = phone.replace(/\D/g, "");
  let hash = 5381;
  for (let i = 0; i < digits.length; i++) {
    hash = ((hash << 5) + hash) + digits.charCodeAt(i);
    hash |= 0;
  }
  return 280 + (Math.abs(hash) % 611);
}

function scoreToTier(score) {
  return score >= 700 ? 3 : score >= 500 ? 2 : 1;
}

/* ================================================================
   COLLECTOR STATE - persisted to localStorage so markings survive
   ================================================================ */
function loadCollectors() {
  try {
    const overrides = JSON.parse(localStorage.getItem("kova_collector_state") || "{}");
    return COLLECTORS_STATIC.map(col => {
      const saved = overrides[col.id];
      if (!saved) return { ...col };
      return { ...col, members: saved.members || col.members };
    });
  } catch (_) { return COLLECTORS_STATIC.map(c => ({ ...c })); }
}

function persistCollectors(collectors) {
  try {
    const state = {};
    collectors.forEach(col => { state[col.id] = { members: col.members }; });
    localStorage.setItem("kova_collector_state", JSON.stringify(state));
  } catch (_) {}
}

/* ================================================================
   SESSION STORAGE
   ================================================================ */
function saveSession(data) {
  try {
    const sessions = JSON.parse(localStorage.getItem("kova_sessions") || "[]");
    const idx = sessions.findIndex(s => s.id === data.id);
    const updated = { ...data, updatedAt: new Date().toISOString() };
    if (idx >= 0) sessions[idx] = { ...sessions[idx], ...updated };
    else sessions.push({ ...updated, createdAt: new Date().toISOString() });
    localStorage.setItem("kova_sessions", JSON.stringify(sessions));
    localStorage.setItem("kova_current_session", JSON.stringify(updated));
    sendToBackend("session_update", updated);
  } catch (_) {}
}

function loadCurrentSession() {
  try { return JSON.parse(localStorage.getItem("kova_current_session") || "null"); }
  catch (_) { return null; }
}

function clearCurrentSession() {
  try { localStorage.removeItem("kova_current_session"); } catch (_) {}
}

function logEvent(sessionId, event) {
  try {
    const key = `kova_events_${sessionId}`;
    const events = JSON.parse(localStorage.getItem(key) || "[]");
    events.push({ ...event, ts: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(events));
    sendToBackend("event", { sessionId, ...event });
  } catch (_) {}
}

function getAllSessions() {
  try { return JSON.parse(localStorage.getItem("kova_sessions") || "[]"); }
  catch (_) { return []; }
}

function getSessionEvents(id) {
  try { return JSON.parse(localStorage.getItem(`kova_events_${id}`) || "[]"); }
  catch (_) { return []; }
}

function genId() {
  return "kova_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ================================================================
   NLP HELPERS - fuzzy name match + intent detection
   ================================================================ */
function normalizeText(t) {
  return t.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\bdon\b/g, "has")       // Pidgin: "don pay" -> "has pay"
    .replace(/\bdey\b/g, "is")        // "dey pay" -> "is pay"
    .replace(/\bno\s+pay\b/g, "not paid")
    .replace(/\babeg\b/g, "please")
    .replace(/\bwetin\b/g, "what")
    .replace(/\bna\b/g, "is")
    .replace(/\bfit\b/g, "can")
    .replace(/\bwey\b/g, "who")
    .replace(/\bsabi\b/g, "know")
    .replace(/\bhow\s+far\b/g, "what is the status")
    .replace(/\bcheck\s+am\b/g, "check it")
    .replace(/\bmark\s+am\b/g, "mark it")
    .trim();
}

function findMemberFuzzy(text, members) {
  const t = text.toLowerCase();
  // Try exact word match first
  let hit = members.find(m =>
    m.name.toLowerCase().split(/[\s()./]+/).some(w => w.length > 2 && t.includes(w))
  );
  if (hit) return hit;
  // Try partial match (first 4+ chars)
  hit = members.find(m =>
    m.name.toLowerCase().split(/\s+/).some(w =>
      w.length >= 4 && [...t.split(/\s+/)].some(tw => tw.length >= 4 && (w.startsWith(tw) || tw.startsWith(w)))
    )
  );
  return hit || null;
}

// Detect payment-marking intent: "chioma paid", "mark emeka", "record tunde", "tunde don pay"
function detectPaymentIntent(text) {
  const t = normalizeText(text);
  const patterns = [
    /(?:mark|record|confirm|log)\s+(.+?)\s+(?:as\s+)?paid/,
    /(.+?)\s+(?:has\s+)?paid/,
    /(.+?)\s+don\s+pay/,
    /paid\s+(.+)/,
    /(?:mark|confirm)\s+(.+)/,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

// Detect add-member intent: "add bisi okafor 0803456789"
function detectAddMemberIntent(text) {
  const t = text.trim();
  const m = t.match(/^(?:add|new member|register)\s+([a-zA-Z\s]+?)\s+(\+?[\d\s]{9,14})$/i);
  if (m) return { name: m[1].trim(), phone: m[2].trim() };
  // "add bisi okafor" without phone
  const m2 = t.match(/^(?:add|new member|register)\s+([a-zA-Z\s]{4,40})$/i);
  if (m2) return { name: m2[1].trim(), phone: null };
  return null;
}

/* ================================================================
   PERSONALIZED COACHING ENGINE
   ================================================================ */
function getCoachingPlan(score, weeks, status, groupType, paid, late) {
  const tier = scoreToTier(score);
  const lines = [];

  if (status === "Critical" || (!paid && weeks > 0))
    lines.push("One payment this week prevents major score damage. Even a partial amount helps.");
  else if (late)
    lines.push("Late is still better than missed. Try to pay by midweek next cycle.");

  if (weeks < 6)
    lines.push("First 6 weeks build your foundation. Consistency now has outsized impact.");
  else if (weeks < 16)
    lines.push(`${weeks} weeks on record - you're building real signal. Keep going.`);
  else
    lines.push(`${weeks} weeks of history is strong. Lenders can see your reliability.`);

  if (score < 400) {
    lines.push("Focus on one thing only: pay on time for 4 consecutive cycles. That single action moves your score the most right now.");
  } else if (score < 500) {
    lines.push("You're close to Tier 2. 8 more on-time payments gets you there.");
    if (groupType === "ajo") lines.push("Your Ajo consistency is your strongest lever. Never miss a week.");
  } else if (score < 600) {
    lines.push("Add your rent payment to Kova. It can add up to 80 points.");
    lines.push("KovaSavings: lock N25k for 30 days to accelerate your tier.");
  } else if (score < 700) {
    lines.push(`${700 - score} more points to Tier 3. KovaSavings (N50k for 30 days) is the fastest route.`);
    lines.push("Vouch for one reliable member to add community trust to your score.");
  } else {
    lines.push("You're Tier 3 - maximum access unlocked. Talk to your collector about activating larger credit.");
    lines.push("Refer a new member to Kova to strengthen your network score.");
  }

  return lines;
}

/* ================================================================
   RESPONSE ENGINES
   ================================================================ */
const fmt = n => "N" + n.toLocaleString();
const today = () => { const d = new Date(); return `${d.toLocaleString("en", {month:"short"})} ${d.getDate()}`; };
const nowt = () => { const d = new Date(); return d.getHours().toString().padStart(2,"0")+":"+d.getMinutes().toString().padStart(2,"0"); };

function getMemberResponse(raw, memberScore, memberName, lang, groupType, weeks) {
  const t = normalizeText(raw);
  const score = memberScore;
  const tier = scoreToTier(score);
  const tierData = TIERS[tier];
  const wks = weeks || 12;

  const greetPat = /\b(hi|hello|hey|start|help|wetin|nnoo|sannu|kaabo|good morning|good afternoon|what can)\b/;
  if (greetPat.test(t) || t.length < 4)
    return `👋 ${lang === "pid" ? `${memberName}, wetin you wan check today?` : `Hi ${memberName}! What would you like to check?`}\n\n• My score\n• What can I unlock?\n• How to improve\n• KovaCredit\n• What is Kova?`;

  if (/my score|check score|tradescore|trade score|my number|score|maki/.test(t))
    return `📊 *Your TradeScore: ${score}*\n\n${tier===1?"🔵":tier===2?"🟢":"🌟"} *${tierData.label}*\n${tierData.desc}\n\n*Payment weeks on record:* ${wks}\n*Progress to next tier:* ${tier<3 ? `${score} / ${tier===1?500:700} points` : "Top tier reached!"}\n\n${score<500 ? "Keep paying on time - 8 consistent weeks builds strong momentum." : score<700 ? `${700-score} more points to Tier 3 and larger credit.` : "You qualify for auto loans, mortgage access, and premium lender rates."}`;

  if (/unlock|get|access|benefit|what can|wetin i fit/.test(t))
    return `🔓 *What You Can Unlock*\n\n*Available now (Tier ${tier}):*\n${tierData.unlocks.map(u=>`• ${u}`).join("\n")}\n\n${tier<3?`*Next tier unlocks:*\n${TIERS[tier+1].unlocks.map(u=>`• ${u}`).join("\n")}`:"*You have unlocked everything - maximum access.*"}`;

  if (/improve|raise|increase|grow|better|how.*score|plan|coaching/.test(t)) {
    const tips = getCoachingPlan(score, wks, "Good", groupType, true, false);
    return `📈 *Your Personal Score Plan*\n\n${tips.map((tip,i)=>`${i+1}. ${tip}`).join("\n\n")}\n\n*Current: ${score} - Target: ${tier<3?(tier===1?500:700):score}*\nNo hidden formula. You see exactly what moves your score.`;
  }

  if (/what.*kova|kova.*do|explain kova|mission/.test(t))
    return `🌍 *What Is Kova?*\n\nKova records the payments you already make - Ajo, rent, school fees, bills - and turns them into a *TradeScore* that banks and lenders can trust.\n\n*Before Kova:* You pay consistently but banks don't see it.\n*After Kova:* Every payment builds your financial reputation.\n\nNo payslip. No collateral. Just your track record.`;

  if (/ajo|savings circle|contribution|group/.test(t))
    return `🔄 *Ajo & Your Score*\n\nEvery Ajo contribution is recorded on Kova.\n\n• On-time payment: score increases\n• Late payment: small dip\n• Missed payment: larger impact\n\nAjo consistency is one of the *strongest* score builders on Kova. N2,000 weekly - paid on time for 20 weeks - is a powerful trust signal to lenders.`;

  if (/credit|loan|borrow|money/.test(t))
    return `💳 *KovaCredit*\n\nYour score of *${score}* qualifies you for:\n\n${score<500?"• Baseline credit access (Tier 1)\n• 8 more on-time payments to unlock N50,000+":score<700?`• Up to N${Math.round(score*80).toLocaleString()} credit line\n• Lock N50k - get N100k credit`:"• Large working capital\n• Inventory financing\n• Auto loans & mortgage access"}\n\nNo paperwork. No payslip. Credit grows as your score grows.`;

  if (/health|insurance|sick|hospital|emergency/.test(t))
    return `❤️ *KovaHealth*\n\nN55,000/yr covers emergency + hospital.\n\nUnlocked at Tier 1. No employment verification needed. Tied to your Kova account.\n\nMedical bills are the top reason informal workers fall behind on payments. Health cover protects your score.`;

  if (/savings|save|lock/.test(t))
    return `🏦 *KovaSavings*\n\nLock N1 - unlock N2 in credit.\n\nN42,000 locked = N84,000 credit access\nN50,000 locked = N100,000 credit line\n\nLocked savings build score momentum AND create matched capital. The longer you save, the faster your tier advances.`;

  // short fallback with suggestions (Fix 9)
  return `_I didn't catch that._ Try:\n\n• "My score"\n• "What can I unlock?"\n• "How to improve"`;
}

function getCollectorResponse(raw, col, onMarkPaid, onAddMember) {
  const t = normalizeText(raw);
  const orig = raw;
  const members = col.members;
  const paid = members.filter(m => m.paid);
  const missed = members.filter(m => !m.paid);
  const late = members.filter(m => m.paid && m.late);
  const atRisk = members.filter(m => m.status === "At Risk" || m.status === "Critical");
  const good = members.filter(m => m.status === "Good");
  const total = paid.length * col.amount;
  const expected = members.length * col.amount;
  const pct = Math.round((paid.length / members.length) * 100);
  const avg = Math.round(members.reduce((s,m)=>s+m.score,0)/members.length);

  // Fix 3: Payment marking
  const payName = detectPaymentIntent(orig);
  if (payName) {
    const hit = findMemberFuzzy(payName, members);
    if (hit) {
      if (hit.paid) return `✅ *${hit.name}* already marked as paid (${hit.date}).`;
      onMarkPaid(hit.name);
      logEvent("collector", { type:"payment_marked", member: hit.name, group: col.id });
      sendToBackend("payment_marked", { member: hit.name, group: col.id, collectorGroup: col.name, date: today() });
      const newScore = Math.min(hit.score + 18, 900);
      return `✅ *${hit.name}* marked as paid for ${col.period}!\n\nPayment recorded: ${fmt(col.amount)} - ${today()}\nTradeScore updated: ${hit.score} → *${newScore}*\n\n${newScore >= 500 && hit.score < 500 ? "🎉 Score crossed 500 - Tier 2 unlocked!" : newScore >= 700 && hit.score < 700 ? "🌟 Score crossed 700 - Tier 3 unlocked!" : "Score is growing. Consistency compounds."}`;
    }
    return `I couldn't find a member matching "*${payName}*". Check the name and try again, or type "who missed?" to see the list.`;
  }

  // Fix 7: Add member
  const addIntent = detectAddMemberIntent(orig);
  if (addIntent) {
    onAddMember(addIntent.name, addIntent.phone);
    logEvent("collector", { type:"member_added", member: addIntent.name, group: col.id });
    sendToBackend("member_added", { member: addIntent.name, phone: addIntent.phone, group: col.id, collectorGroup: col.name });
    return `✅ *${addIntent.name}* added to ${col.name}!\n\n${addIntent.phone ? `Phone: ${addIntent.phone}` : "No phone number - you can add it later."}\nStatus: Pending first payment\nTradeScore: Building...\n\nKova will start tracking their payment history from this cycle.`;
  }

  const greetPat = /\b(hi|hello|hey|start|help|menu|what can|how far)\b/;
  if (greetPat.test(t))
    return `👋 Hi! I'm your *Kova assistant* for *${col.name}*.\n\nManaging *${members.length} members* - ${col.type} - ${col.cycle} payments of ${fmt(col.amount)}.\n\n*Quick actions:*\n• "Who paid?" / "Who missed?"\n• "Chioma paid" - mark a payment\n• "Add Bisi Okafor 0803 456 7890" - add member\n• "At-risk members" / "Remind all"\n• "Collection summary"`;

  if (/how much|total collect|amount collect|collection total|summary|overview/.test(t))
    return `💰 *${col.period} - Collection Summary*\n\nCollected: *${fmt(total)}* (${pct}%)\nExpected: *${fmt(expected)}*\nOutstanding: *${fmt(expected-total)}*\n\n${paid.length} paid - ${missed.length} missed - ${late.length} late\nGroup avg TradeScore: *${avg}*`;

  if (/who paid|paid already|confirmed|paid this/.test(t)) {
    if (!paid.length) return "No payments recorded yet this period.";
    return `✅ *Paid - ${col.period}* (${paid.length}/${members.length})\n\n`+paid.map(m=>`✅ ${m.name}${m.late?" *(late)*":""} - ${m.date} - Score ${m.score}`).join("\n");
  }

  if (/who miss|not paid|haven|didn|outstanding|default|no pay/.test(t)) {
    if (!missed.length) return "Everyone has paid! Perfect collection rate.";
    return `❌ *Missed - ${col.period}* (${missed.length} members)\n\n`+missed.map(m=>`❌ ${m.name} - Score ${m.score} (${m.status})`).join("\n")+`\n\nTip: Type *"[name] paid"* to mark someone, or *"remind all"* to send nudges.`;
  }

  if (/\blate|delay|overdue|slow\b/.test(t)) {
    if (!late.length) return "No late payments this period.";
    return `⏰ *Late Payments - ${col.period}*\n\n`+late.map(m=>`⏰ ${m.name} - paid ${m.date} (late) - Score ${m.score}`).join("\n")+`\n\n⚠️ Late payments reduce TradeScore. Consider an early payment reminder next cycle.`;
  }

  if (/at.?risk|risky|danger|critical|low score|flag|alert/.test(t)) {
    if (!atRisk.length) return "No at-risk members right now. Group health is strong.";
    return `⚠️ *At-Risk Members* (${atRisk.length})\n\n`+atRisk.map(m=>`⚠️ ${m.name}\n   Score ${m.score} - ${m.status}\n   ${m.weeks} payment weeks on record\n   ${getCoachingPlan(m.score,m.weeks,m.status,col.id,m.paid,m.late)[0]}`).join("\n\n")+`\n\nThese members need check-ins. Consistent payments move them to Tier 2 in 8-12 weeks.`;
  }

  if (/how many|member count|group size|overview/.test(t))
    return `👥 *${col.name}* - ${members.length} members\n${col.type} - ${col.cycle} - ${fmt(col.amount)}/period\n\n🟢 Good: ${good.length} - 🟡 At Risk: ${members.filter(m=>m.status==="At Risk").length} - 🔴 Critical: ${members.filter(m=>m.status==="Critical").length}\n\nAvg TradeScore: ${avg}\nThis period: ${fmt(total)} of ${fmt(expected)} (${pct}%)`;

  if (/total owed|how much left|balance|owe/.test(t)) {
    if (!missed.length) return "✅ No outstanding balances - everyone has paid!";
    return `📋 *Outstanding - ${fmt(missed.length*col.amount)}*\n\n`+missed.map(m=>`• ${m.name}: ${fmt(col.amount)}`).join("\n");
  }

  if (/remind|nudge|send message|notify|chase/.test(t)) {
    if (!missed.length) return "✅ No reminders needed - everyone is paid up!";
    return `📲 *Reminders queued* for ${missed.length} members:\n\n`+missed.map(m=>`• ${m.name} - ${m.phone}`).join("\n")+`\n\n✅ WhatsApp messages dispatched. Each message includes their current score and a payment link.`;
  }

  if (col.id==="ajo" && /pot|payout|who.s next|cycle|receive/.test(t))
    return `🔄 *Ajo Cycle - ${col.period}*\n\nGroup pot: *${fmt(col.pot||members.length*col.amount)}*\nNext to collect: *${col.nextPayout||"-"}*\n\nKova timestamps every contribution - creating a verified savings history for every member.`;

  if (/tradescore|trade score|score system|how.*score|scoring/.test(t))
    return `📊 *TradeScore - How It Works*\n\nKova models 4 signals:\n• *Frequency* - how often you pay\n• *Variance* - consistency over time\n• *Contribution gaps* - missed windows\n• *Network validation* - community trust\n\n0-499: Tier 1 - 500-699: Tier 2 - 700+: Tier 3\n\nHigh-score users are *1.7x more likely to repay*. Behavior alone predicted repayment in our first test.`;

  if (/tier|trust ladder/.test(t))
    return `🏅 *Kova Tiers*\n\n🔵 *Tier 1 - Safety First*\n${TIERS[1].desc}\nUnlocks: ${TIERS[1].unlocks.join(", ")}\n\n🟢 *Tier 2 - Growth Mode*\n${TIERS[2].desc}\nUnlocks: ${TIERS[2].unlocks.join(", ")}\n\n🌟 *Tier 3 - Credit Ready*\n${TIERS[3].desc}\nUnlocks: ${TIERS[3].unlocks.join(", ")}`;

  if (/vouch|social collateral/.test(t))
    return `🤝 *Vouch for Someone*\n\nMembers stake their own score to vouch for others.\n\n• Small Vouch: N10,000 - Low risk\n• Medium Vouch: N25,000 - Medium risk\n• Large Vouch: N50,000 - High risk\n\n⚠️ If the person defaults, your score is affected. Community trust as financial guarantee.`;

  if (/product|credit|savings|health|business|ecosystem/.test(t))
    return `🧰 *Kova Products*\n\n💳 *KovaCredit* - Credit line grows with score\n🏦 *KovaSavings* - Lock N1, unlock N2 credit\n❤️ *KovaHealth* - Emergency + hospital N55k/yr\n💼 *KovaBusiness* - N65k inventory financing\n📲 *Vouch / Borrow* - Community tools`;

  // Member lookup
  const hit = findMemberFuzzy(orig, members);
  if (hit) {
    const paidStr = hit.paid
      ? `✅ Paid ${fmt(col.amount)} on ${hit.date}${hit.late?" (late)":""}`
      : `❌ Has NOT paid this ${col.cycle.toLowerCase()}`;
    const tips = getCoachingPlan(hit.score, hit.weeks, hit.status, col.id, hit.paid, hit.late);
    return `👤 *${hit.name}*\n📞 ${hit.phone}\n📊 TradeScore: *${hit.score}* (${hit.status}) - Tier ${hit.tier}\n⏱️ ${hit.weeks} payment weeks on record\n\n${TIERS[hit.tier].label}\n${paidStr}\n\n📈 *Coaching:*\n${tips.slice(0,2).map(t=>`• ${t}`).join("\n")}`;
  }

  // short fallback (Fix 9)
  return `_Didn't catch that._ Try:\n\n• "[Name] paid" - mark a payment\n• "Who missed?" - see unpaid list\n• "Summary" - collection overview`;
}

/* ================================================================
   QUICK REPLY SUGGESTIONS
   ================================================================ */
function contextualQRs(lastText, role) {
  const t = (lastText||"").toLowerCase();
  if (role==="member") {
    if (/score|tier/.test(t))            return ["How to improve","What can I unlock?","KovaCredit","KovaHealth"];
    if (/unlock|credit|product/.test(t)) return ["My score","KovaSavings","KovaHealth","What is Kova?"];
    if (/improve|plan|coaching/.test(t)) return ["My score","KovaCredit","KovaSavings","What is Ajo?"];
    return ["My score","What can I unlock?","How to improve","KovaCredit"];
  }
  if (/paid|miss|collect|owed/.test(t))  return ["Who missed?","Remind all","At-risk members","Total owed"];
  if (/score|tier|coaching/.test(t))     return ["How to improve score?","Tiers explained","Kova products"];
  if (/product|credit|savings/.test(t))  return ["KovaCredit","KovaSavings","KovaHealth","KovaBusiness"];
  if (/risk|critical|alert/.test(t))     return ["Who missed?","Remind all","Collection summary"];
  return ["Who paid?","Who missed?","At-risk members","Collection summary"];
}

/* ================================================================
   BUBBLE TEXT RENDERER
   ================================================================ */
function BubbleText({ text }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return <>
    {parts.map((p, i) => i%2===1
      ? <strong key={i}>{p}</strong>
      : p.split("\n").map((line,j,arr)=>(
          <span key={`${i}-${j}`}>{line.startsWith("_")&&line.endsWith("_")
            ? <em>{line.slice(1,-1)}</em> : line}{j<arr.length-1&&<br/>}</span>
        ))
    )}
  </>;
}

/* ================================================================
   ADMIN DATA EXTRACTION PANEL
   ================================================================ */
function AdminPanel({ onClose }) {
  const sessions = getAllSessions();
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState(null);

  const csvRows = sessions.map(s =>
    [s.id,s.name||"",s.phone||"",LANG[s.language]?.label||s.language||"",s.role||"",s.groupType||"",s.collectorGroup||"",s.createdAt||"",s.updatedAt||"",s.messageCount||0].join(",")
  );
  const csv = ["ID,Name,Phone,Language,Role,GroupType,CollectorGroup,CreatedAt,UpdatedAt,Messages",...csvRows].join("\n");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:760,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{background:"#075E54",color:"#fff",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontWeight:700,fontSize:15}}>Kova - Data Extraction</div>
            <div style={{fontSize:11,opacity:0.7}}>{sessions.length} sessions - {WEBHOOK_URL ? "webhook active" : "webhook not set"}</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{navigator.clipboard.writeText(JSON.stringify(sessions,null,2));setCopied(true);setTimeout(()=>setCopied(false),2000);}}
              style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>
              {copied?"Copied!":"Copy JSON"}
            </button>
            <button onClick={()=>{const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`kova_${new Date().toISOString().slice(0,10)}.csv`;a.click();}}
              style={{background:"#1D9E75",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>
              Download CSV
            </button>
            {!WEBHOOK_URL && (
              <button title="Set WEBHOOK_URL in kova_bot_v2.jsx to enable"
                style={{background:"rgba(255,165,0,0.3)",color:"#fff",border:"1px solid rgba(255,165,0,0.5)",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"default"}}>
                Set Webhook
              </button>
            )}
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",borderRadius:8,padding:"6px 10px",fontSize:14,cursor:"pointer"}}>x</button>
          </div>
        </div>

        <div style={{overflowY:"auto",flex:1}}>
          {sessions.length===0 ? (
            <div style={{padding:48,textAlign:"center",color:"#888"}}>No sessions yet. Users who complete onboarding will appear here.</div>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#f5f5f5",position:"sticky",top:0}}>
                  {["Name","Phone","Language","Role","Group / Collector","Messages","Joined"].map(h=>(
                    <th key={h} style={{padding:"10px 12px",textAlign:"left",borderBottom:"1px solid #e0e0e0",fontWeight:600,color:"#333"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s,i)=>(
                  <tr key={s.id} onClick={()=>setSelected(selected===i?null:i)}
                    style={{cursor:"pointer",background:selected===i?"#e8f5f1":i%2===0?"#fff":"#fafafa",borderBottom:"1px solid #f0f0f0"}}>
                    <td style={{padding:"9px 12px",fontWeight:500}}>{s.name||"-"}</td>
                    <td style={{padding:"9px 12px",color:"#444"}}>{s.phone||"-"}</td>
                    <td style={{padding:"9px 12px"}}>{LANG[s.language]?.label||s.language||"-"}</td>
                    <td style={{padding:"9px 12px"}}>
                      <span style={{background:s.role==="collector"?"#e8f5e9":"#e3f2fd",color:s.role==="collector"?"#2e7d32":"#1565c0",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:500}}>
                        {s.role||"-"}
                      </span>
                    </td>
                    <td style={{padding:"9px 12px",color:"#555",fontSize:11}}>{s.collectorGroup||s.groupType||"-"}</td>
                    <td style={{padding:"9px 12px",textAlign:"center"}}>{s.messageCount||0}</td>
                    <td style={{padding:"9px 12px",color:"#888",fontSize:11}}>{s.createdAt?new Date(s.createdAt).toLocaleDateString():"-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {selected!==null&&sessions[selected]&&(
            <div style={{margin:"0 12px 12px",background:"#f8f9fa",borderRadius:8,padding:12}}>
              <div style={{fontWeight:600,marginBottom:8,fontSize:12}}>Session - {sessions[selected].name}</div>
              <pre style={{fontSize:11,color:"#333",whiteSpace:"pre-wrap",wordBreak:"break-all",margin:0}}>{JSON.stringify(sessions[selected],null,2)}</pre>
              <div style={{marginTop:8,fontWeight:600,fontSize:12}}>Events ({getSessionEvents(sessions[selected].id).length})</div>
              <pre style={{fontSize:11,color:"#555",whiteSpace:"pre-wrap",wordBreak:"break-all",margin:"4px 0 0"}}>{JSON.stringify(getSessionEvents(sessions[selected].id),null,2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ONBOARDING FLOW
   ================================================================ */
function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState("lang");
  const [lang, setLang] = useState(null);
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [groupType, setGroupType] = useState(null);
  const [collectorGroup, setCollectorGroup] = useState("");
  const [sessionId] = useState(genId);
  const inputRef = useRef(null);

  useEffect(()=>{ if(inputRef.current) inputRef.current.focus(); },[step]);

  const L = lang ? LANG[lang] : null;
  const G = "#1D9E75", HEADER = "#075E54";

  const finish = (gt, cg) => {
    const score = phoneToScore(phone);
    const data = {
      id: sessionId, language: lang, role, name: name.trim()||null,
      phone: phone.trim()||null, groupType: gt||groupType,
      collectorGroup: cg||collectorGroup||null,
      score, tier: scoreToTier(score), messageCount: 0,
    };
    saveSession(data);
    logEvent(sessionId, { type:"onboarding_complete", role, language: lang, groupType: gt||groupType });
    sendToBackend("new_user", data);
    onComplete(data);
  };

  const cardStyle = {background:"#fff",borderRadius:"0 12px 12px 12px",padding:"12px 16px",lineHeight:1.65,fontSize:14,marginBottom:4};
  const btnPrimary = {background:G,color:"#fff",border:"none",borderRadius:12,padding:"13px 16px",fontSize:14,cursor:"pointer",fontWeight:600,fontFamily:"inherit",width:"100%"};
  const btnSecondary = {background:"#fff",color:G,border:`2px solid ${G}`,borderRadius:12,padding:"13px 16px",fontSize:14,cursor:"pointer",fontWeight:600,fontFamily:"inherit",width:"100%"};
  const btnGhost = {background:"transparent",border:"none",color:"#999",fontSize:13,cursor:"pointer",padding:"6px 0",fontFamily:"inherit"};
  const inputStyle = {background:"#fff",border:"1px solid rgba(0,0,0,0.15)",borderRadius:12,padding:"12px 16px",fontSize:14,fontFamily:"inherit",color:"#111",outline:"none",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{maxWidth:440,margin:"0.5rem auto",borderRadius:16,overflow:"hidden",border:"0.5px solid rgba(0,0,0,0.12)",display:"flex",flexDirection:"column",minHeight:500,background:"#e5ddd5",fontFamily:"system-ui,sans-serif",fontSize:14}}>
      <div style={{background:HEADER,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:18,flexShrink:0}}>K</div>
        <div>
          <div style={{color:"#fff",fontSize:16,fontWeight:600}}>Kova</div>
          <div style={{color:"rgba(255,255,255,0.65)",fontSize:11}}>Build Trust. Unlock Access.</div>
        </div>
      </div>

      <div style={{flex:1,padding:20,display:"flex",flexDirection:"column",gap:14}}>

        {step==="lang"&&(
          <>
            <div style={cardStyle}>
              <strong>Welcome to Kova!</strong><br/>
              Build Trust. Unlock Access.<br/><br/>
              Which language do you prefer?<br/>
              <span style={{fontSize:12,color:"#999"}}>Wetin language you prefer?</span>
            </div>
            {Object.values(LANG).map(l=>(
              <button key={l.code} onClick={()=>{setLang(l.code);setStep("role");}}
                style={{background:"#fff",border:"1.5px solid rgba(0,0,0,0.1)",borderRadius:12,padding:"12px 16px",fontSize:14,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,fontFamily:"inherit",color:"#111"}}>
                <span style={{fontSize:20}}>{l.flag}</span>
                <div>
                  <div style={{fontWeight:600}}>{l.label}</div>
                  {l.code==="pid"&&<div style={{fontSize:11,color:"#999"}}>Nigerian Pidgin</div>}
                </div>
              </button>
            ))}
          </>
        )}

        {step==="role"&&L&&(
          <>
            <div style={cardStyle}><BubbleText text={L.roleQuestion}/></div>
            <button onClick={()=>{setRole("collector");setStep("name");}} style={btnPrimary}>{L.collectorBtn}</button>
            <button onClick={()=>{setRole("member");setStep("name");}} style={btnSecondary}>{L.memberBtn}</button>
          </>
        )}

        {step==="name"&&L&&(
          <>
            <div style={cardStyle}>{L.askName}</div>
            <input ref={inputRef} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&setStep("phone")} placeholder="e.g. Chioma Eze" style={inputStyle}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{logEvent(sessionId,{type:"skipped_name"});setStep("phone");}} style={{...btnGhost,flex:1,textAlign:"center"}}>Skip</button>
              <button onClick={()=>{logEvent(sessionId,{type:"entered_name",name:name.trim()});setStep("phone");}} style={{...btnPrimary,flex:3}}>{L.next}</button>
            </div>
          </>
        )}

        {step==="phone"&&L&&(
          <>
            <div style={cardStyle}>{L.askPhone}<br/><span style={{fontSize:12,color:"#999"}}>{L.phoneHint}</span></div>
            <input ref={inputRef} value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(role==="member"?setStep("groupType"):finish(null,null))} placeholder="0801 234 5678" type="tel" style={inputStyle}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{logEvent(sessionId,{type:"skipped_phone"});role==="member"?setStep("groupType"):finish(null,null);}} style={{...btnGhost,flex:1,textAlign:"center"}}>Skip</button>
              <button onClick={()=>{logEvent(sessionId,{type:"entered_phone",phone:phone.trim()});role==="member"?setStep("groupType"):finish(null,null);}} style={{...btnPrimary,flex:3}}>{role==="member"?L.next:"Enter Kova →"}</button>
            </div>
          </>
        )}

        {step==="groupType"&&L&&(
          <>
            <div style={cardStyle}>{L.askGroupType}</div>
            {L.groupTypes.map((g,i)=>(
              <button key={i} onClick={()=>{logEvent(sessionId,{type:"selected_group_type",group:g});setGroupType(g);setStep("collectorName");}}
                style={{background:"#fff",border:"1.5px solid rgba(0,0,0,0.1)",borderRadius:12,padding:"12px 16px",fontSize:14,cursor:"pointer",textAlign:"left",fontFamily:"inherit",color:"#111"}}>
                {["🔄","🏠","🎓","📦","⚡"][i]} {g}
              </button>
            ))}
            <button onClick={()=>finish(null,null)} style={btnGhost}>{L.skip}</button>
          </>
        )}

        {step==="collectorName"&&L&&(
          <>
            <div style={cardStyle}>{L.askCollectorName}</div>
            <input ref={inputRef} value={collectorGroup} onChange={e=>setCollectorGroup(e.target.value)} onKeyDown={e=>e.key==="Enter"&&finish(groupType,collectorGroup)} placeholder="e.g. Adebayo's Circle" style={inputStyle}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>finish(groupType,null)} style={{...btnGhost,flex:1,textAlign:"center"}}>{L.skip}</button>
              <button onClick={()=>finish(groupType,collectorGroup)} style={{...btnPrimary,flex:3}}>Enter Kova →</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* ================================================================
   RETURNING USER SCREEN
   ================================================================ */
function ReturningUserScreen({ session, onContinue, onSwitch }) {
  const G = "#1D9E75", HEADER = "#075E54";
  const L = LANG[session.language] || LANG.en;
  return (
    <div style={{maxWidth:440,margin:"0.5rem auto",borderRadius:16,overflow:"hidden",border:"0.5px solid rgba(0,0,0,0.12)",background:"#e5ddd5",fontFamily:"system-ui,sans-serif",fontSize:14}}>
      <div style={{background:HEADER,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:18}}>K</div>
        <div>
          <div style={{color:"#fff",fontSize:16,fontWeight:600}}>Kova</div>
          <div style={{color:"rgba(255,255,255,0.65)",fontSize:11}}>Build Trust. Unlock Access.</div>
        </div>
      </div>
      <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:"#fff",borderRadius:"0 12px 12px 12px",padding:"14px 16px",lineHeight:1.7,fontSize:14}}>
          <BubbleText text={L.welcomeBack(session.name||"there")}/>
          <br/>
          {session.role==="member"&&session.score?(
            <>TradeScore: <strong>{session.score}</strong> - Tier {session.tier}<br/></>
          ):null}
          {session.collectorGroup?(<>Group: <strong>{session.collectorGroup}</strong><br/></>):null}
          <span style={{fontSize:12,color:"#999"}}>Last active: {session.updatedAt?new Date(session.updatedAt).toLocaleDateString():"-"}</span>
        </div>
        <button onClick={onContinue} style={{background:G,color:"#fff",border:"none",borderRadius:12,padding:"13px 16px",fontSize:14,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>Continue</button>
        <button onClick={onSwitch} style={{background:"transparent",border:"none",color:"#999",fontSize:13,cursor:"pointer",fontFamily:"inherit",padding:"4px 0"}}>
          Switch account / start over
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN CHAT APP
   ================================================================ */
export default function KovaBot() {
  const [session, setSession] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showReturning, setShowReturning] = useState(false);
  const [returningSession, setReturningSession] = useState(null);
  const [collectors, setCollectors] = useState(loadCollectors);
  const [activeId, setActiveId] = useState("ajo");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [headerTaps, setHeaderTaps] = useState(0);
  const msgsRef = useRef(null);
  const inputRef = useRef(null);

  const G = "#1D9E75", HEADER = "#075E54";
  const col = collectors.find(c => c.id === activeId);

  // Fix 6: Check for returning user on mount
  useEffect(() => {
    const existing = loadCurrentSession();
    if (existing && existing.id) {
      setReturningSession(existing);
      setShowReturning(true);
    }
  }, []);

  const handleHeaderTap = () => {
    const next = headerTaps + 1;
    setHeaderTaps(next);
    if (next >= 3) { setShowAdmin(true); setHeaderTaps(0); }
    setTimeout(() => setHeaderTaps(0), 1500);
  };

  // Fix 3: Mark a payment in state
  const markPaid = useCallback((colId, memberName) => {
    setCollectors(prev => {
      const updated = prev.map(c => {
        if (c.id !== colId) return c;
        return {
          ...c,
          members: c.members.map(m => {
            if (m.name !== memberName) return m;
            return { ...m, paid: true, date: today(), late: false, score: Math.min(m.score + 18, 900) };
          })
        };
      });
      persistCollectors(updated);
      return updated;
    });
  }, []);

  // Fix 7: Add a member in state
  const addMember = useCallback((colId, name, phone) => {
    const score = phoneToScore(phone);
    const tier = scoreToTier(score);
    const newMember = {
      name, phone: phone||"TBD", score, tier,
      status: tier >= 2 ? "Good" : "At Risk",
      paid: false, date: null, late: false, weeks: 0,
    };
    setCollectors(prev => {
      const updated = prev.map(c => {
        if (c.id !== colId) return c;
        return { ...c, members: [...c.members, newMember] };
      });
      persistCollectors(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    const L = LANG[session.language] || LANG.en;
    let firstMsg;
    if (session.role === "member") {
      firstMsg = `${L.doneMember(session.name||"there")}\n\nYour TradeScore: *${session.score}* (Tier ${session.tier})\n${session.collectorGroup ? `Group: ${session.collectorGroup}` : ""}\n\nWhat would you like to check?\n\n• My score\n• What can I unlock?\n• How to improve\n• KovaCredit`;
    } else {
      const c = collectors.find(x => x.id === activeId);
      const paidCount = c.members.filter(m=>m.paid).length;
      const pct = Math.round(paidCount/c.members.length*100);
      const avg = Math.round(c.members.reduce((s,m)=>s+m.score,0)/c.members.length);
      firstMsg = `👋 ${L.doneCollector(session.name||"there")}\n\nManaging *${c.name}*\n${c.members.length} members - ${c.period}\n${paidCount}/${c.members.length} paid (${pct}%) - Avg score: ${avg}\n\nTip: Type *"[Name] paid"* to mark a payment, or *"add [Name] [phone]"* to add a member.`;
    }
    setMessages([{ role:"bot", text: firstMsg, time: nowt() }]);
  }, [activeId, session]);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, isTyping]);

  const sendMsg = useCallback((text) => {
    text = text.trim();
    if (!text || isTyping || !session) return;
    setInput("");
    setMessages(m => [...m, { role:"user", text, time: nowt() }]);
    setIsTyping(true);
    logEvent(session.id, { type:"message", direction:"user", text });
    saveSession({ ...session, messageCount: (session.messageCount||0)+1 });

    setTimeout(() => {
      let resp;
      if (session.role === "member") {
        resp = getMemberResponse(text, session.score, session.name||"there", session.language, session.groupType, 12);
      } else {
        resp = getCollectorResponse(
          text, col,
          (name) => markPaid(col.id, name),
          (name, phone) => addMember(col.id, name, phone)
        );
      }
      setIsTyping(false);
      setMessages(m => [...m, { role:"bot", text: resp, time: nowt() }]);
      logEvent(session.id, { type:"message", direction:"bot" });
    }, 600 + Math.random() * 400);
  }, [col, isTyping, session, markPaid, addMember]);

  const lastBotMsg = [...messages].reverse().find(m=>m.role==="bot")?.text||"";

  // Returning user gate
  if (showReturning && returningSession && !session) {
    return (
      <>
        <ReturningUserScreen
          session={returningSession}
          onContinue={() => { setSession(returningSession); setShowReturning(false); }}
          onSwitch={() => { clearCurrentSession(); setShowReturning(false); setReturningSession(null); }}
        />
        {showAdmin && <AdminPanel onClose={()=>setShowAdmin(false)}/>}
      </>
    );
  }

  // Onboarding gate
  if (!session) {
    return (
      <>
        <OnboardingScreen onComplete={(data)=>setSession(data)}/>
        <div style={{textAlign:"center",marginTop:8}}>
          <button onClick={()=>setShowAdmin(true)} style={{background:"none",border:"none",color:"#bbb",fontSize:11,cursor:"pointer"}}>admin</button>
        </div>
        {showAdmin && <AdminPanel onClose={()=>setShowAdmin(false)}/>}
      </>
    );
  }

  return (
    <>
      <div style={{maxWidth:440,margin:"0.5rem auto",borderRadius:16,overflow:"hidden",border:"0.5px solid rgba(0,0,0,0.12)",display:"flex",flexDirection:"column",height:680,background:"#e5ddd5",fontFamily:"system-ui,sans-serif",fontSize:14}}>

        {/* header */}
        <div onClick={handleHeaderTap} style={{background:HEADER,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0,cursor:"default"}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:16,flexShrink:0}}>K</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontSize:15,fontWeight:500}}>Kova Assistant</div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {session.role==="member" ? `Member - ${session.name||"You"}${session.collectorGroup?` - ${session.collectorGroup}`:""}` : col.type+" - "+col.name}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
            <div style={{color:"rgba(255,255,255,0.45)",fontSize:11}}>GoKova.io</div>
            <button onClick={e=>{e.stopPropagation();clearCurrentSession();setSession(null);}}
              style={{background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.6)",fontSize:10,padding:"2px 7px",borderRadius:10,cursor:"pointer"}}>
              switch
            </button>
          </div>
        </div>

        {/* collector tabs */}
        {session.role==="collector"&&(
          <div style={{background:HEADER,padding:"0 10px 8px",display:"flex",gap:5,overflowX:"auto",flexShrink:0,scrollbarWidth:"none"}}>
            {collectors.map(c=>(
              <button key={c.id} onClick={()=>setActiveId(c.id)} style={{
                background:c.id===activeId?"#fff":"rgba(255,255,255,0.12)",
                color:c.id===activeId?"#085041":"rgba(255,255,255,0.8)",
                border:"none",borderRadius:20,padding:"4px 11px",fontSize:11.5,whiteSpace:"nowrap",cursor:"pointer",
                fontWeight:c.id===activeId?600:400,flexShrink:0,transition:"all 0.15s",
              }}>{c.emoji} {c.label}</button>
            ))}
          </div>
        )}

        {/* messages */}
        <div ref={msgsRef} style={{flex:1,overflowY:"auto",padding:"10px 10px 6px",display:"flex",flexDirection:"column",gap:5}}>
          {messages.map((msg,i)=>{
            const isBot = msg.role==="bot";
            return (
              <div key={i} style={{display:"flex",flexDirection:"column",maxWidth:"84%",alignSelf:isBot?"flex-start":"flex-end"}}>
                <div style={{padding:"7px 11px",borderRadius:isBot?"0 8px 8px 8px":"8px 0 8px 8px",background:isBot?"#fff":"#dcf8c6",color:"#111",lineHeight:1.55,whiteSpace:"pre-wrap",wordBreak:"break-word",fontSize:13.5}}>
                  <BubbleText text={msg.text}/>
                </div>
                <div style={{fontSize:11,color:"#667781",marginTop:2,padding:"0 4px",textAlign:isBot?"left":"right"}}>{msg.time}</div>
              </div>
            );
          })}
          {isTyping&&(
            <div style={{alignSelf:"flex-start",display:"flex",flexDirection:"column",maxWidth:"84%"}}>
              <div style={{background:"#fff",borderRadius:"0 8px 8px 8px",padding:"10px 16px",display:"flex",gap:5,alignItems:"center"}}>
                {[0,0.2,0.4].map((d,i)=>(
                  <div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#9e9e9e",animation:`bop 1.2s ${d}s infinite ease-in-out`}}/>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* quick replies */}
        <div style={{padding:"5px 8px 2px",display:"flex",flexWrap:"wrap",gap:5,flexShrink:0}}>
          {contextualQRs(lastBotMsg,session.role).map((q,i)=>(
            <button key={i} onClick={()=>sendMsg(q)} style={{background:"#fff",border:"0.5px solid rgba(0,0,0,0.15)",color:G,fontSize:12,padding:"4px 10px",borderRadius:20,cursor:"pointer",fontFamily:"inherit"}}>
              {q}
            </button>
          ))}
        </div>

        {/* input */}
        <div style={{background:HEADER,padding:"7px 10px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg(input)}
            placeholder={session.role==="member"?"Ask about your score, credit, Kova...":"\"Chioma paid\" or \"Who missed?\"..."}
            style={{flex:1,background:"#fff",border:"none",borderRadius:20,padding:"8px 14px",fontSize:14,fontFamily:"inherit",color:"#111",outline:"none"}}/>
          <button onClick={()=>sendMsg(input)} style={{width:38,height:38,borderRadius:"50%",background:G,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:isTyping?0.5:1}}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>

      {showAdmin&&<AdminPanel onClose={()=>setShowAdmin(false)}/>}
      <style>{`@keyframes bop{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
    </>
  );
}
