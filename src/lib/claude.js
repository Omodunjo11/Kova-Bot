const Anthropic = require("@anthropic-ai/sdk");
const { anthropicApiKey } = require("../config/env");
const { runAction, computeScore } = require("../services/kova-tools");
const { ACTIONS } = require("../services/role-policy");

const client = new Anthropic({ apiKey: anthropicApiKey });

/* ================================================================
   KOVA KNOWLEDGE BASE - injected into every system prompt
   ================================================================ */
const KOVA_KB = `
ABOUT KOVA:
Kova is the behavioral underwriting layer for emerging markets. We digitise recurring payments (Ajo savings groups, rent, school fees, bills, SME inventory) and convert real repayment behavior into TradeScores that lenders can use. Mission: Making everyday economic activity visible, portable, and valuable.

TRADESCORE:
- Range: 300-890
- Tier 1 (300-499): Safety First. Unlocks KovaHealth (N55,000/yr), baseline credit access, score tracking.
- Tier 2 (500-699): Growth Mode. Lock N50k, unlock N100k credit line. KovaBusiness inventory financing.
- Tier 3 (700+): Credit Ready. Larger working capital, inventory financing, auto loans, mortgage access, premium lender rates.
- Score signals: payment frequency, consistency (variance), missed windows, network/community trust.
- Key insight: N5,000 paid daily for 200 days = HIGH TRUST. N500,000 paid twice = WEAK SIGNAL. Consistency beats income.

KOVA PRODUCTS:
- KovaCredit: Credit line that grows with TradeScore. No payslip, no collateral.
- KovaSavings: Lock N1, unlock N2 in credit. N50k locked = N100k credit line.
- KovaHealth: N55,000/yr emergency + hospital cover. Available from Tier 1.
- KovaBusiness: N65,000 inventory financing for traders. Available from Tier 2+.
- Vouch: Members stake their score to guarantee others. Social collateral.

AJO (rotating savings groups):
Ajo is a rotating savings system where members contribute a fixed amount each cycle and one member receives the lump sum. It runs on trust and community - Kova digitises these contributions to build a portable, lender-grade TradeScore. Every on-time contribution increases score. Late payments cause a small dip. Missed payments cause a larger impact.

NIGERIA CONTEXT:
Nigeria has the largest informal economy in Africa. ~85% of workers lack formal credit access. Kova's beachhead market. Dense daily transactions, strong savings culture, POS and mobile money at scale. 1 collector typically manages 25-100 members. We acquire networks, not individuals.

MESSAGING RULES:
- Be warm, direct, and concise. Max 3-4 short paragraphs.
- Use Nigerian context naturally (Ajo, Naira N, Lagos, etc.)
- Never reveal another user's private data.
- Format numbers in Naira: N50,000 not NGN50000.
- When referencing scores always explain what tier it means.
- For Pidgin speakers, respond naturally in Pidgin if they write in Pidgin.
`;

/* ================================================================
   CLAUDE TOOL DEFINITIONS
   These map directly to the ACTIONS in role-policy.js.
   Claude decides which tool to call based on user message.
   ================================================================ */
const KOVA_TOOLS = [
  {
    name: "view_self_score",
    description: "Get the calling user's own TradeScore and tier. Use when end user asks about their score, credit eligibility, or what they can unlock.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "view_group_summary",
    description: "Get a summary of a collector group: member count, who paid, who missed, amount collected. Use when collector asks about their group status.",
    input_schema: {
      type: "object",
      properties: {
        groupId: { type: "string", description: "The Kova group ID to summarise" },
      },
      required: ["groupId"],
    },
  },
  {
    name: "record_payment",
    description: "Record that a member has made a payment. Use when a collector says someone paid. Updates their TradeScore immediately.",
    input_schema: {
      type: "object",
      properties: {
        groupId: { type: "string", description: "The group the payment belongs to" },
        memberWhatsapp: { type: "string", description: "WhatsApp number of the member who paid (if known)" },
        memberId: { type: "string", description: "Kova user ID of the member (if known)" },
        amountKobo: { type: "number", description: "Amount paid in kobo (e.g. N5000 = 500000 kobo)" },
        note: { type: "string", description: "Optional note, e.g. 'late payment' or 'partial'" },
      },
      required: ["groupId", "amountKobo"],
    },
  },
  {
    name: "send_reminder",
    description: "Queue WhatsApp reminders to all members who have not paid this cycle. Use when collector asks to send nudges or reminders.",
    input_schema: {
      type: "object",
      properties: {
        groupId: { type: "string", description: "The group to send reminders for" },
      },
      required: ["groupId"],
    },
  },
  {
    name: "add_member",
    description: "Add a new member to a collector group. Use when collector says they want to add someone.",
    input_schema: {
      type: "object",
      properties: {
        groupId: { type: "string", description: "The group to add the member to" },
        whatsappNumber: { type: "string", description: "WhatsApp number of the new member" },
        fullName: { type: "string", description: "Full name of the new member" },
      },
      required: ["groupId", "whatsappNumber"],
    },
  },
  {
    name: "member_score_lookup",
    description: "Look up a specific member's TradeScore. Use when a collector asks about a particular member's score or credit status.",
    input_schema: {
      type: "object",
      properties: {
        memberWhatsapp: { type: "string", description: "WhatsApp number of the member to look up" },
        memberId: { type: "string", description: "Kova user ID of the member to look up" },
      },
      required: [],
    },
  },
  {
    name: "view_lender_score",
    description: "Get aggregate risk/score data for a group. For lender partners only.",
    input_schema: {
      type: "object",
      properties: {
        groupId: { type: "string", description: "The group to analyse" },
      },
      required: ["groupId"],
    },
  },
];

/* Map tool name -> ACTIONS constant */
const TOOL_TO_ACTION = {
  view_self_score: ACTIONS.VIEW_SELF_SCORE,
  view_group_summary: ACTIONS.VIEW_GROUP_SUMMARY,
  record_payment: ACTIONS.RECORD_PAYMENT,
  send_reminder: ACTIONS.SEND_REMINDER,
  add_member: ACTIONS.ADD_MEMBER,
  member_score_lookup: ACTIONS.MEMBER_SCORE_LOOKUP,
  view_lender_score: ACTIONS.VIEW_LENDER_SCORE,
};

/* ================================================================
   ROLE-AWARE SYSTEM PROMPT
   ================================================================ */
function buildSystemPrompt(user) {
  const role = user.role || "UNASSIGNED";
  const name = user.fullName ? `Their name is ${user.fullName}.` : "";
  const lang = user.language ? `Preferred language: ${user.language}. Respond in that language or dialect when possible.` : "";

  const roleInstructions = {
    END_USER: `
You are speaking with a Kova member. ${name} ${lang}
They can ONLY see their own score and payment history. Never discuss other members' data.
Help them understand their TradeScore, what tier they are in, what products they can unlock, and how to improve.
If they ask about credit, check their score first using view_self_score before answering.
Be encouraging and concrete - give them specific steps to improve.`,

    COLLECTOR_MEMBER: `
You are speaking with a Kova collector member. ${name} ${lang}
They can view group summaries, record payments, send reminders, and look up member scores.
They CANNOT add members or change roles.
When they mention someone paid, record it immediately with record_payment.
When they ask who has not paid, use view_group_summary.`,

    COLLECTOR_LEAD: `
You are speaking with a Kova collector lead (group manager). ${name} ${lang}
They have full group operations: view summaries, record payments, send reminders, add members, look up scores.
They manage 25-100 members. Be efficient - give them the operational info they need fast.
When marking payments, always confirm the amount recorded and the member's new score.
Suggest reminders proactively when many members have missed.`,

    LENDER_PARTNER: `
You are speaking with a Kova lender partner. ${name} ${lang}
They can view aggregate risk data and group-level TradeScore summaries.
They CANNOT see individual user details beyond what is aggregated.
Present data in terms of repayment probability, tier distribution, and default risk.`,

    KOVA_ADMIN: `
You are speaking with a Kova admin. ${name} ${lang}
Full system access. Speak technically. Help with platform operations, data queries, role management.`,

    UNASSIGNED: `
You are speaking with someone who has not yet set their role. Guide them to complete onboarding first.
Tell them to reply with: 1 for Collector Lead, 2 for Collector Member, 3 for Member/End User, 4 for Lender Partner.`,
  };

  return [
    KOVA_KB,
    "---",
    `CURRENT USER ROLE: ${role}`,
    roleInstructions[role] || roleInstructions.UNASSIGNED,
    "---",
    "Always be concise (WhatsApp format). Use line breaks not walls of text. Respond only about what the user asked.",
  ].join("\n");
}

/* ================================================================
   MAIN ENTRY POINT - agentic tool loop
   ================================================================ */
async function getRoleAwareReply({ user, messageText }) {
  const systemPrompt = buildSystemPrompt(user);

  const messages = [{ role: "user", content: messageText }];

  // Agentic loop: Claude may call multiple tools before giving final reply
  for (let turn = 0; turn < 5; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: systemPrompt,
      tools: KOVA_TOOLS,
      messages,
    });

    // If Claude is done (no tool calls), return the text
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find(c => c.type === "text");
      return textBlock ? textBlock.text : "How can I help you with your Kova account?";
    }

    // Process tool calls
    if (response.stop_reason === "tool_use") {
      // Add Claude's response (with tool_use blocks) to message history
      messages.push({ role: "assistant", content: response.content });

      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const action = TOOL_TO_ACTION[block.name];
        let result;

        if (!action) {
          result = { ok: false, error: `Unknown tool: ${block.name}` };
        } else {
          result = await runAction({ user, action, params: block.input });
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      // Feed results back to Claude
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop reason - return whatever text we have
    const textBlock = response.content.find(c => c.type === "text");
    return textBlock ? textBlock.text : "Something went wrong. Please try again.";
  }

  return "I ran into an issue processing your request. Please try again.";
}

module.exports = { getRoleAwareReply };
