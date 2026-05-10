const { ROLES } = require("../constants/roles");

const ACTIONS = Object.freeze({
  VIEW_GROUP_SUMMARY: "view_group_summary",
  RECORD_PAYMENT: "record_payment",
  SEND_REMINDER: "send_reminder",
  ADD_MEMBER: "add_member",
  MEMBER_SCORE_LOOKUP: "member_score_lookup",
  VIEW_SELF_SCORE: "view_self_score",
  VIEW_LENDER_SCORE: "view_lender_score",
  ASSIGN_ROLE: "assign_role",
});

const POLICY = Object.freeze({
  [ROLES.COLLECTOR_LEAD]: new Set([
    ACTIONS.VIEW_GROUP_SUMMARY,
    ACTIONS.RECORD_PAYMENT,
    ACTIONS.SEND_REMINDER,
    ACTIONS.ADD_MEMBER,
    ACTIONS.MEMBER_SCORE_LOOKUP,
    ACTIONS.VIEW_SELF_SCORE,
  ]),
  [ROLES.COLLECTOR_MEMBER]: new Set([
    ACTIONS.VIEW_GROUP_SUMMARY,
    ACTIONS.RECORD_PAYMENT,
    ACTIONS.SEND_REMINDER,
    ACTIONS.MEMBER_SCORE_LOOKUP,
    ACTIONS.VIEW_SELF_SCORE,
  ]),
  [ROLES.END_USER]: new Set([ACTIONS.VIEW_SELF_SCORE]),
  [ROLES.LENDER_PARTNER]: new Set([ACTIONS.VIEW_LENDER_SCORE]),
  [ROLES.KOVA_ADMIN]: new Set(Object.values(ACTIONS)),
});

function can(role, action) {
  if (!role || !POLICY[role]) return false;
  return POLICY[role].has(action);
}

module.exports = { ACTIONS, can };
