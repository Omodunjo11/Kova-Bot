require("dotenv").config();

const app = require("./app");
const { port, validateEnv } = require("./config/env");

try {
  validateEnv();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Kova bot server listening on port ${port}`);
});
