const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const TOOL_RESPONSE_MODEL =
  process.env.TOOL_RESPONSE_MODEL ||
  process.env.ROUTER_MODEL ||
  "qwen2.5:latest";

// =======================================
// CONVERSATIONAL TOOL RESPONSE GENERATOR
// =======================================
const summarizeToolResult = async ({
  tool,
  toolResult,
  arguments: toolArguments,
  user,
  staff,
  memory,
  recentChats
}) => {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: TOOL_RESPONSE_MODEL,
      stream: false,
      prompt: `
You are speaking as this staff member.

Return ONLY valid JSON.
No markdown.
No explanations.

Staff member:
${JSON.stringify(staff, null, 2)}

User:
${JSON.stringify(user, null, 2)}

Tool used:
${JSON.stringify(tool, null, 2)}

Tool arguments:
${JSON.stringify(toolArguments, null, 2)}

Tool execution result:
${JSON.stringify(toolResult, null, 2)}

Memory:
${JSON.stringify(memory || {}, null, 2)}

Recent chats:
${JSON.stringify(recentChats || [], null, 2)}

Your job:
Summarize the tool execution result into a natural conversational response for the user.

Rules:
- Speak naturally as the staff member.
- Be short, clear, and conversational.
- Do not mention backend systems, JSON, databases, registry, or internal logic.
- If the tool succeeded, explain what was completed.
- If the tool failed, explain the issue politely.
- Personalize the tone using memory and recent chats when appropriate.

Return exactly this JSON shape:
{
  "response": "conversational response text",
  "success": true
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

    return parsed;

  } catch (error) {
    console.error("SUMMARIZE TOOL RESULT ERROR:", error.message);

    return {
      response: "I completed the request, but I had trouble generating a response summary.",
      success: false
    };
  }
};

module.exports = { summarizeToolResult };