const dotenv = require("dotenv");

dotenv.config();
const app = require("./app");
const run = require("./mdb");
const PORT = process.env.PORT || 3000;

process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("🔥 UNHANDLED PROMISE REJECTION:", reason);
});

app.listen(PORT, () => {

  run().catch(console.dir);
  console.log(`✅ Server running on http://localhost:${PORT}`);
  
});
