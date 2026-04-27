const dotenv = require("dotenv");

dotenv.config();
const app = require("./app");
const run = require("./mdb");

process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("🔥 UNHANDLED PROMISE REJECTION:", reason);
});

module.exports = { app, run };