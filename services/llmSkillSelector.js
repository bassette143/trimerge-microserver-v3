const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const ROUTER_MODEL = process.env.ROUTER_MODEL || "qwen2.5:latest";

// =========================
// MAIN SELECTOR
// Receives skills from chat.js
// =========================
const selectSkill = async (prompt, user, skills = [], options = {}) => {
  console.log("SELECTING SKILL FOR PROMPT:", prompt, user, skills);
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: ROUTER_MODEL,
      stream: false,
      prompt: `
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

    const rawText = response.data.response.trim();

    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("LLM did not return JSON");
    }

    const parsed = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));

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