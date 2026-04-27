const dotenv = require("dotenv");

dotenv.config();
const app = require("./app");
const run = require("./mdb");
const { PORT, OLLAMA_URL, ROUTER_MODEL, OLLAMA_MODEL } = require("./config");
const { getTodayDate } = require("./helpers/dateHelpers");

process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("🔥 UNHANDLED PROMISE REJECTION:", reason);
});

app.listen(PORT, () => {

  run().catch(console.dir);
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ OLLAMA_URL: ${OLLAMA_URL}`);
  console.log(`✅ ROUTER_MODEL: ${ROUTER_MODEL}`);
  console.log(`✅ OLLAMA_MODEL: ${OLLAMA_MODEL}`);
  console.log(`✅ Local today: ${getTodayDate()}`);
});
