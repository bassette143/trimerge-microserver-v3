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
You are a strict organizational AI skill selector for TriMerge.

Return ONLY valid JSON.
No markdown.
No explanations.

Your job:
Determine whether the user's prompt should use one of the provided skills or whether the system should respond with a generic organizational AI response.

You represent TriMerge's organizational AI assistant.

User:
${user}

Prompt:
${prompt}

Available skills:
${JSON.stringify(skills, null, 2)}

Rules:
- Select a skill ONLY if the prompt clearly matches one of the available skills.
- Do NOT invent skills.
- Do NOT force a skill match.
- If the prompt is a greeting, pleasantry, small talk, casual conversation, absurd statement, or unrelated request, do NOT return null.
- Instead, return "generic_response" as the mode.
- Generic responses should be conversational, professional, and friendly.
- Generic responses should still attempt to help the user naturally.
- Generic responses should avoid pretending a skill was used.
- Generic responses should be used for:
  - greetings
  - thank you messages
  - casual conversation
  - jokes
  - random or absurd prompts
  - prompts unrelated to available business skills
  - general conversational AI behavior

Examples:
- "hello"
- "how are you"
- "thank you"
- "tell me a joke"
- "i would like to cook rice"
- "what is your favorite color"

If the prompt clearly matches a business capability or skill, return "skill" mode.

If multiple skills match, select the closest one.

Return exactly this JSON shape:
{
  "mode": "skill_or_generic_response",
  "skill": "selected_skill_id_or_null",
  "response": "generic conversational response if needed otherwise null",
  "reason": "short reason"
}
`
    });

    if (!parsed.skill) {
      return {
        mode: "generic_response",
        skill: null,
        response: parsed.response || null,
        reason: parsed.reason || "No skill selected"
      };
    }
    console.log("LLM SELECTED SKILL:", parsed);
    return {
      mode: "skill",
      skill: parsed.skill,
      response: parsed.response || null,
      reason: parsed.reason || "Skill selected"
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