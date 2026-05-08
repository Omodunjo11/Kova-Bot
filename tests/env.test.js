const test = require("node:test");
const assert = require("node:assert/strict");

function loadEnvModule() {
  const envPath = require.resolve("../src/config/env");
  delete require.cache[envPath];
  return require("../src/config/env");
}

test("validateEnv fails when required variables are missing", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  const { validateEnv } = loadEnvModule();
  assert.throws(() => validateEnv(), /Missing required env vars/);

  process.env.DATABASE_URL = originalDatabaseUrl;
});
