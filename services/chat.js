const crypto = require("crypto");
const axios = require("axios");

const { selectSkill } = require("./llmSkillSelector");
const connectMongo = require("../mdb");

const chat = async (prompt, user, options = { skill: "default" }) => {
  try {
    const db = await connectMongo();

    const selectedSkill = options?.skill || "default";

    // =========================
    // 1. CREATE CACHE KEY
    // =========================
    const cacheKey = crypto
      .createHash("sha256")
      .update(`${user}:${selectedSkill}:${prompt}`)
      .digest("hex");

    // =========================
    // 2. CHECK CACHE
    // =========================
    const cached = await db.collection("chat_cache").findOne({
      cacheKey,
      expiresAt: { $gt: new Date() }
    });

    if (cached) {
      return {
        fromCache: true,
        skill: cached.skill,
        method: cached.method,
        endpoint: cached.endpoint,
        response: cached.response
      };
    }

    // =========================
    // 3. SELECT SKILL WITH LLM
    // =========================
    const skillDecision = await selectSkill(prompt, user, options);

    if (!skillDecision || !skillDecision.endpoint || !skillDecision.method) {
      return {
        error: true,
        message: "Invalid skill decision.",
        skillDecision
      };
    }

    // =========================
    // 4. CALL SKILL ENDPOINT
    // Supports GET and POST
    // =========================
    let skillResult;

    if (skillDecision.method === "GET") {
      skillResult = await axios.get(skillDecision.endpoint, {
        timeout: 10000
      });
    } else if (skillDecision.method === "POST") {
      skillResult = await axios.post(
        skillDecision.endpoint,
        skillDecision.payload || {},
        { timeout: 10000 }
      );
    } else {
      return {
        error: true,
        message: `Unsupported HTTP method: ${skillDecision.method}`,
        skillDecision
      };
    }

    // =========================
    // 5. SAVE RESULT TO CACHE - 24 HOURS
    // =========================
    await db.collection("chat_cache").insertOne({
      cacheKey,
      user,
      prompt,
      skill: skillDecision.skill || selectedSkill,
      method: skillDecision.method,
      endpoint: skillDecision.endpoint,
      payload: skillDecision.payload || null,
      response: skillResult.data,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    // =========================
    // 6. RETURN RESULT
    // =========================
    return {
      fromCache: false,
      skill: skillDecision.skill || selectedSkill,
      method: skillDecision.method,
      endpoint: skillDecision.endpoint,
      response: skillResult.data
    };
  } catch (error) {
    console.error("CHAT ERROR:", error.message);

    return {
      error: true,
      message: "Chat failed",
      details: error.message
    };
  }
};

module.exports = { chat };