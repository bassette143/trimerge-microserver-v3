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

// Start Mongo connection for Vercel/serverless
run().catch(console.error);

// CommonJS export
// app is the default export
module.exports = app;

// run remains available by name
module.exports.run = run;