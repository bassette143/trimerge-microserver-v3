const axios = require("axios");
const { callAIJSON } = require("./aiservice");



// =========================
// MAIN SELECTOR
// Receives skills from chat.js
// =========================
const selectSkill = async (prompt, user, skills = [], options = {}) => {
  console.log("SELECTING SKILL FOR PROMPT:", prompt, user, skills);
  try {
    const parsed = await callAIJSON({
      instructions: `
You are a strict skill selector.

Return ONLY valid JSON.
No markdown.
No explanations.

Your job:
Select the best skill for the user's prompt from the provided skills list.

User:
${user}

Prompt:
${prompt}

Available skills:
${JSON.stringify(skills, null, 2)}

Return exactly this JSON shape:
{
  "skill": "selected_skill_id"
}
`
    });

    if (!parsed.skill) {
      throw new Error("LLM response missing skill");
    }
    console.log("LLM SELECTED SKILL:", parsed);
    return {
      skill: parsed.skill
    };
  } catch (error) {
    console.error("LLM SKILL SELECTOR ERROR:", error.message);

    return {
      error: true,
      message: "Failed to select skill",
      details: error.message
    };
  }
};

module.exports = { selectSkill };