const axios = require("axios");
const { callAIJSON } = require("./aiservice");



const selectStaffTool = async (payload) => {
    console.log(payload)
    const { prompt, user, staff, position, tools, memory, recentChats } = payload;
  try {
    const parsed = await callAIJSON({
      instructions: `

You are acting as this staff member in first person perspective.

Return ONLY valid JSON.
No markdown.
No explanations.

I am:
${JSON.stringify(staff, null, 2)}

My position:
${JSON.stringify(position, null, 2)}

My available tools:
${JSON.stringify(tools, null, 2)}

The user I am helping:
${user}

The user just prompted me with:
"${prompt}"

I also have memory of previous interactions, activities, and profile context:
${JSON.stringify(memory, null, 2)}

Recent conversation history:
${JSON.stringify(recentChats, null, 2)}

My job:
- Decide which ONE of my available tools I should use.
- I must ONLY choose from my provided tools.
- I cannot invent tools.
- If none of my tools fit the request, return null for tool.
- My position, responsibilities, tools, memory, and recent chats should guide my decision.

Return exactly this JSON shape:

{
  "tool": "tool_id_or_name_from_tools_array",
  "reason": "short first person reason"
}
`

    });

   

    if (!Object.prototype.hasOwnProperty.call(parsed, "tool")) {
      throw new Error("LLM response missing tool");
    }

    const selectedToolValue = parsed.tool;
    console.log("LLM SELECTED TOOL:", parsed);
    if (selectedToolValue === null) {
      return {
        tool: null,
        reason: parsed.reason || "No matching tool found."
      };
    }

    const matchedTool = tools.find(
      (tool) =>
        tool._id === selectedToolValue || tool.name === selectedToolValue
       
    );
    console.log("MATCHED TOOL:", matchedTool);
    if (!matchedTool) {
      return {
        error: true,
        message: "LLM selected a tool that is not in the staff tools array.",
        selectedTool: selectedToolValue,
        availableTools: tools
      };
    }

    return {
      tool: matchedTool,
      reason: parsed.reason || null
    };
  } catch (error) {
    console.error("LLM STAFF SELECTOR ERROR:", error.message);

    return {
      error: true,
      message: "Failed to select staff tool",
      details: error.message
    };
  }
};

module.exports = { selectStaffTool };