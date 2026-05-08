const { prisma } = require("../lib/prisma");
const { ROLES } = require("../constants/roles");

function normalizeNumber(number) {
  return String(number || "").replace(/[^\d+]/g, "");
}

async function getOrCreateUserByWhatsApp(whatsappNumber) {
  const normalized = normalizeNumber(whatsappNumber);
  let user = await prisma.user.findUnique({ where: { whatsappNumber: normalized } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        whatsappNumber: normalized,
      },
    });
  }
  return user;
}

async function assignRole({ targetUserId, role, actorUserId = null, reason = null }) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { role },
  });

  await prisma.roleAssignment.create({
    data: {
      targetUserId,
      actorUserId,
      assignedRole: role,
      reason,
    },
  });

  return updated;
}

module.exports = { normalizeNumber, getOrCreateUserByWhatsApp, assignRole };
