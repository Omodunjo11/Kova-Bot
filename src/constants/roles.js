const ROLES = Object.freeze({
  COLLECTOR_LEAD: "COLLECTOR_LEAD",
  COLLECTOR_MEMBER: "COLLECTOR_MEMBER",
  END_USER: "END_USER",
  LENDER_PARTNER: "LENDER_PARTNER",
  KOVA_ADMIN: "KOVA_ADMIN",
});

const ROLE_LABELS = Object.freeze({
  [ROLES.COLLECTOR_LEAD]: "Collector Lead",
  [ROLES.COLLECTOR_MEMBER]: "Collector Member",
  [ROLES.END_USER]: "End User",
  [ROLES.LENDER_PARTNER]: "Lender/Partner",
  [ROLES.KOVA_ADMIN]: "Kova Admin",
});

module.exports = { ROLES, ROLE_LABELS };
