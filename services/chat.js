const axios = require("axios");

const { selectSkill } = require("./llmSkillSelector");
const connectMongo = require("../mdb");

const API_BASE_URL = process.env.API_BASE_URL || "https://trimerge-iq.onrender.com";
const SKILLS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const chat = async (prompt, user, options = {}) => {
  try {
    const db = await connectMongo();
    let skillDecision = options.skill;
    // Use skills passed from Postman first
    let skills = null;
    let skillsSource = "provided_in_request";

    // =========================
    // STEP 1: GET SKILLS
    // =========================
    if (!skillDecision) {
      const cachedSkills = await db.collection("skills_cache").findOne({
        cacheKey: "all_skills",
        expiresAt: { $gt: new Date() }
      });

      if (cachedSkills) {
        skills = cachedSkills.skills;
        skillsSource = "mongo_cache";
      } else {
        const skillsResponse = await axios.get(`${API_BASE_URL}/skills`, {
          timeout: 30000
        });

        skills = skillsResponse.data;
        skillsSource = "backend_api";

        await db.collection("skills_cache").updateOne(
          { cacheKey: "all_skills" },
          {
            $set: {
              cacheKey: "all_skills",
              skills,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + SKILLS_CACHE_TTL)
            }
          },
          { upsert: true }
        );
      }

       skillDecision = await selectSkill(prompt, user, skills, options);
    }

    // =========================
    // STEP 2: ASK LLM TO SELECT SKILL
    // =========================
     

    if (!skillDecision || !skillDecision.skill) {
      return {
        error: true,
        message: "LLM did not select a valid skill.",
        skillDecision
      };
    }

    // =========================
    // TEMP RETURN FOR STEP 1 TESTING
    // =========================
    return {
      success: true,
      step: "skill_selection_complete",
      skillsSource,
      selectedSkill: skillDecision,
      skillsFound: Array.isArray(skills) ? skills.length : "unknown",
      skills
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