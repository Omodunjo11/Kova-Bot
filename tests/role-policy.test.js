const test = require("node:test");
const assert = require("node:assert/strict");

const { can, ACTIONS } = require("../src/services/role-policy");
const { ROLES } = require("../src/constants/roles");

test("collector member can record payments", () => {
  assert.equal(can(ROLES.COLLECTOR_MEMBER, ACTIONS.RECORD_PAYMENT), true);
});

test("end user cannot add member", () => {
  assert.equal(can(ROLES.END_USER, ACTIONS.ADD_MEMBER), false);
});

test("kova admin can run all actions", () => {
  for (const action of Object.values(ACTIONS)) {
    assert.equal(can(ROLES.KOVA_ADMIN, action), true);
  }
});
