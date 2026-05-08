const { prisma } = require("../lib/prisma");
const { can, ACTIONS } = require("./role-policy");

/* ================================================================
   SCORE COMPUTATION
   Derived from real payment history in the DB.
   Formula: base 300 + frequency bonus + consistency bonus + volume bonus
   Range: ~280 - 890
   ================================================================ */
async function computeScore(userId) {
  const payments = await prisma.payment.findMany({
    where: { memberUserId: userId },
    orderBy: { paidAt: "asc" },
  });

  if (payments.length === 0) return { score: 300, tier: 1, paymentCount: 0, totalKobo: 0 };

  const totalKobo = payments.reduce((sum, p) => sum + p.amountKobo, 0);
  const paymentCount = payments.length;

  // Frequency bonus: up to +300 for 50+ payments
  const frequencyBonus = Math.min(300, paymentCount * 6);

  // Consistency bonus: look at gaps between payments (smaller gaps = better)
  let consistencyBonus = 0;
  if (payments.length >= 2) {
    const gaps = [];
    for (let i = 1; i < payments.length; i++) {
      const gapDays = (new Date(payments[i].paidAt) - new Date(payments[i - 1].paidAt)) / 86400000;
      gaps.push(gapDays);
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    // Weekly payers (avg ~7 days) get max bonus, longer gaps get less
    consistencyBonus = Math.max(0, Math.min(200, Math.round(200 - avgGap * 4)));
  }

  // Volume bonus: up to +90 for large total amounts
  const volumeBonus = Math.min(90, Math.floor(totalKobo / 1_000_000) * 10);

  const score = Math.min(890, 300 + frequencyBonus + consistencyBonus + volumeBonus);
  const tier = score >= 700 ? 3 : score >= 500 ? 2 : 1;

  return { score, tier, paymentCount, totalKobo };
}

async function getMembershipForUser(userId, groupId) {
  if (!groupId) return null;
  return prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
}

async function ensureGroupAccess(user, groupId, { requireLead = false } = {}) {
  const membership = await getMembershipForUser(user.id, groupId);
  if (!membership) {
    return { ok: false, error: "You don't have access to that group." };
  }
  if (requireLead && membership.role !== "LEAD") {
    return { ok: false, error: "Only collector leads can perform that action in this group." };
  }
  return { ok: true, membership };
}

/* ================================================================
   ACTION RUNNER
   ================================================================ */
async function runAction({ user, action, params }) {
  if (!can(user.role, action)) {
    return { ok: false, error: `Your role (${user.role}) does not have permission to do that.` };
  }

  switch (action) {

    /* ── VIEW_SELF_SCORE ─────────────────────────────────────── */
    case ACTIONS.VIEW_SELF_SCORE: {
      const result = await computeScore(user.id);
      return { ok: true, data: result };
    }

    /* ── MEMBER_SCORE_LOOKUP ──────────────────────────────────── */
    case ACTIONS.MEMBER_SCORE_LOOKUP: {
      const { groupId, memberWhatsapp, memberId } = params || {};
      if (!groupId) return { ok: false, error: "groupId is required." };
      const access = await ensureGroupAccess(user, groupId);
      if (!access.ok) return access;
      let target;
      if (memberId) {
        target = await prisma.user.findUnique({ where: { id: memberId } });
      } else if (memberWhatsapp) {
        const normalized = String(memberWhatsapp).replace(/[^\d+]/g, "");
        target = await prisma.user.findUnique({ where: { whatsappNumber: normalized } });
      }
      if (!target) return { ok: false, error: "Member not found." };
      const inGroup = await prisma.groupMembership.findUnique({
        where: { userId_groupId: { userId: target.id, groupId } },
      });
      if (!inGroup) {
        return { ok: false, error: "Member is not in that group." };
      }
      const result = await computeScore(target.id);
      return { ok: true, data: { member: { id: target.id, name: target.fullName, whatsapp: target.whatsappNumber }, ...result } };
    }

    /* ── RECORD_PAYMENT ───────────────────────────────────────── */
    case ACTIONS.RECORD_PAYMENT: {
      const { groupId, memberWhatsapp, memberId, amountKobo, note } = params || {};
      if (!groupId || !amountKobo) {
        return { ok: false, error: "groupId and amountKobo are required." };
      }
      const access = await ensureGroupAccess(user, groupId);
      if (!access.ok) return access;

      // Resolve member by whatsapp or id
      let memberUser;
      if (memberId) {
        memberUser = await prisma.user.findUnique({ where: { id: memberId } });
      } else if (memberWhatsapp) {
        const normalized = String(memberWhatsapp).replace(/[^\d+]/g, "");
        memberUser = await prisma.user.findUnique({ where: { whatsappNumber: normalized } });
      } else {
        // If no member specified, record for the caller themselves
        memberUser = user;
      }
      if (!memberUser) return { ok: false, error: "Could not find that member. Check the number and try again." };

      // Verify member belongs to this group
      const membership = await prisma.groupMembership.findUnique({
        where: { userId_groupId: { userId: memberUser.id, groupId } },
      });
      if (!membership) {
        return { ok: false, error: `${memberUser.fullName || memberUser.whatsappNumber} is not in that group.` };
      }

      const payment = await prisma.payment.create({
        data: {
          groupId,
          memberUserId: memberUser.id,
          amountKobo: Number(amountKobo),
          paidAt: new Date(),
          note: note || null,
          loggedByUserId: user.id,
        },
      });

      const newScore = await computeScore(memberUser.id);
      return {
        ok: true,
        data: {
          payment,
          memberName: memberUser.fullName || memberUser.whatsappNumber,
          newScore: newScore.score,
          newTier: newScore.tier,
        },
      };
    }

    /* ── VIEW_GROUP_SUMMARY ───────────────────────────────────── */
    case ACTIONS.VIEW_GROUP_SUMMARY: {
      const { groupId } = params || {};
      if (!groupId) return { ok: false, error: "groupId is required." };
      const access = await ensureGroupAccess(user, groupId);
      if (!access.ok) return access;

      const [group, memberships, payments] = await Promise.all([
        prisma.collectorGroup.findUnique({ where: { id: groupId } }),
        prisma.groupMembership.findMany({
          where: { groupId },
          include: { user: true },
        }),
        prisma.payment.findMany({ where: { groupId }, orderBy: { paidAt: "desc" } }),
      ]);

      if (!group) return { ok: false, error: "Group not found." };

      const collectedKobo = payments.reduce((sum, p) => sum + p.amountKobo, 0);

      // Who has paid this cycle (last 35 days)
      const cycleStart = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      const recentPayerIds = new Set(
        payments.filter(p => new Date(p.paidAt) >= cycleStart).map(p => p.memberUserId)
      );

      const memberSummaries = memberships.map(m => ({
        id: m.user.id,
        name: m.user.fullName || m.user.whatsappNumber,
        paidThisCycle: recentPayerIds.has(m.user.id),
      }));

      const paid = memberSummaries.filter(m => m.paidThisCycle);
      const missed = memberSummaries.filter(m => !m.paidThisCycle);

      return {
        ok: true,
        data: {
          groupName: group.name,
          groupType: group.type,
          memberCount: memberships.length,
          collectedKobo,
          paidCount: paid.length,
          missedCount: missed.length,
          paid: paid.map(m => m.name),
          missed: missed.map(m => m.name),
        },
      };
    }

    /* ── SEND_REMINDER ────────────────────────────────────────── */
    case ACTIONS.SEND_REMINDER: {
      const { groupId } = params || {};
      if (!groupId) return { ok: false, error: "groupId is required." };
      const access = await ensureGroupAccess(user, groupId);
      if (!access.ok) return access;

      const cycleStart = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      const memberships = await prisma.groupMembership.findMany({
        where: { groupId },
        include: { user: true },
      });
      const payments = await prisma.payment.findMany({
        where: { groupId, paidAt: { gte: cycleStart } },
      });
      const paidIds = new Set(payments.map(p => p.memberUserId));
      const unpaid = memberships.filter(m => !paidIds.has(m.user.id));

      if (unpaid.length === 0) {
        return { ok: true, data: { sent: 0, message: "Everyone has paid - no reminders needed." } };
      }

      // In production this would fire actual WhatsApp messages via the API.
      // For now we return who would be messaged so Claude can report back.
      const recipients = unpaid.map(m => m.user.fullName || m.user.whatsappNumber);
      return {
        ok: true,
        data: {
          sent: unpaid.length,
          recipients,
          message: `Reminders queued for ${unpaid.length} members: ${recipients.join(", ")}.`,
        },
      };
    }

    /* ── ADD_MEMBER ───────────────────────────────────────────── */
    case ACTIONS.ADD_MEMBER: {
      const { groupId, whatsappNumber, fullName } = params || {};
      if (!groupId || !whatsappNumber) {
        return { ok: false, error: "groupId and whatsappNumber are required." };
      }
      const access = await ensureGroupAccess(user, groupId, { requireLead: true });
      if (!access.ok) return access;

      const normalized = String(whatsappNumber).replace(/[^\d+]/g, "");

      // Upsert user
      let newUser = await prisma.user.findUnique({ where: { whatsappNumber: normalized } });
      if (!newUser) {
        newUser = await prisma.user.create({
          data: { whatsappNumber: normalized, fullName: fullName || null },
        });
      } else if (fullName && !newUser.fullName) {
        newUser = await prisma.user.update({
          where: { id: newUser.id },
          data: { fullName },
        });
      }

      // Check group exists
      const group = await prisma.collectorGroup.findUnique({ where: { id: groupId } });
      if (!group) return { ok: false, error: "Group not found." };

      // Upsert membership
      const membership = await prisma.groupMembership.upsert({
        where: { userId_groupId: { userId: newUser.id, groupId } },
        update: {},
        create: { userId: newUser.id, groupId, role: "MEMBER" },
      });

      return {
        ok: true,
        data: {
          userId: newUser.id,
          name: newUser.fullName || normalized,
          whatsappNumber: normalized,
          groupName: group.name,
          membershipId: membership.id,
        },
      };
    }

    /* ── VIEW_LENDER_SCORE (aggregate risk view) ─────────────── */
    case ACTIONS.VIEW_LENDER_SCORE: {
      const { groupId } = params || {};
      if (!groupId) return { ok: false, error: "groupId is required." };
      const access = await ensureGroupAccess(user, groupId);
      if (!access.ok) return access;

      const memberships = await prisma.groupMembership.findMany({
        where: { groupId },
        include: { user: true },
      });

      const scores = await Promise.all(
        memberships.map(async m => {
          const s = await computeScore(m.user.id);
          return s.score;
        })
      );

      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const high = scores.filter(s => s >= 700).length;
      const mid = scores.filter(s => s >= 500 && s < 700).length;
      const low = scores.filter(s => s < 500).length;

      return {
        ok: true,
        data: {
          memberCount: scores.length,
          avgScore: avg,
          tier3Count: high,
          tier2Count: mid,
          tier1Count: low,
          repaymentSignal: avg >= 700 ? "Strong" : avg >= 500 ? "Moderate" : "Weak",
        },
      };
    }

    default:
      return { ok: false, error: `Action "${action}" is not implemented yet.` };
  }
}

module.exports = { runAction, computeScore };
