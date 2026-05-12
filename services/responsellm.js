const axios = require("axios");
const { callAIJSON } = require("./aiservice");



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
    const parsed = await callAIJSON({
      instructions: `
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