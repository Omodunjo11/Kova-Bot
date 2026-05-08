const { prisma } = require("../lib/prisma");
const { can, ACTIONS } = require("./role-policy");

async function runAction({ user, action, params }) {
  if (!can(user.role, action)) {
    return { ok: false, error: `Not allowed for role ${user.role}` };
  }

  switch (action) {
    case ACTIONS.VIEW_SELF_SCORE: {
      // Placeholder scoring source. Replace with real scoring service.
      const score = 520;
      return { ok: true, data: { score, tier: score >= 700 ? 3 : score >= 500 ? 2 : 1 } };
    }
    case ACTIONS.RECORD_PAYMENT: {
      const { groupId, memberUserId, amountKobo, note } = params || {};
      if (!groupId || !memberUserId || !amountKobo) {
        return { ok: false, error: "groupId, memberUserId and amountKobo are required" };
      }
      const payment = await prisma.payment.create({
        data: {
          groupId,
          memberUserId,
          amountKobo: Number(amountKobo),
          paidAt: new Date(),
          note: note || null,
          loggedByUserId: user.id,
        },
      });
      return { ok: true, data: payment };
    }
    case ACTIONS.VIEW_GROUP_SUMMARY: {
      const { groupId } = params || {};
      if (!groupId) return { ok: false, error: "groupId is required" };
      const [memberships, payments] = await Promise.all([
        prisma.groupMembership.count({ where: { groupId } }),
        prisma.payment.findMany({ where: { groupId } }),
      ]);
      const collectedKobo = payments.reduce((sum, p) => sum + p.amountKobo, 0);
      return { ok: true, data: { memberCount: memberships, paymentCount: payments.length, collectedKobo } };
    }
    default:
      return { ok: false, error: `Action ${action} not implemented yet` };
  }
}

module.exports = { runAction };
