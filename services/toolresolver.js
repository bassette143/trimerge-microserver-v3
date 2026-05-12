const axios = require("axios");
const { ObjectId } = require("mongodb");
const connectMongo = require("../mdb");
const { summarizeToolResult } = require("./responsellm");
const { callAIJSON, callAI } = require("./aiservice");



// ===============================
// EXECUTE TOOL PLACEHOLDER
// Replace this with your real tool runner
// ===============================
const executeTool = async ({ tool, staff, user, arguments }) => {
  let toolResult = {
    success: true,
    message: `Tool ${tool.name} executed successfully.`,
    tool: tool.name,
    arguments
  };
 

const conversationalResponse = await summarizeToolResult({
  tool,
  toolResult,
  arguments: arguments,
  user,
  staff,
  memory: "", // Replace with actual memory if available
  recentChats: [] // Replace with actual recent chats if available
});

return {
  status: "completed",
  tool: tool.name,
  arguments: arguments,
  result: toolResult,
  response: conversationalResponse.response
};
  
};

// ===============================
// SAVE PENDING TOOL
// ===============================
const savePendingTool = async ({
  conversation,
  tool,
  staff,
  user,
  originalPrompt,
  arguments,
  missingArguments
}) => {
  const db = await connectMongo();

  const result = await db.collection("pending_tools").insertOne({
    conversation,
    status: "waiting_for_tool_arguments",
    tool,
    staff,
    user,
    original_prompt: originalPrompt,
    arguments,
    missing_arguments: missingArguments,
    created_at: new Date(),
    updated_at: new Date()
  });

  return result.insertedId;
};

// ===============================
// ASK USER FOR MISSING ARGUMENTS
// ===============================
const askForMissingArguments = async ({
  tool,
  prompt,
  staff,
  user,
  memory,
  recentChats,
  missingArguments,
  currentArguments
}) => {
  const response = await callAI({
    instructions: `
You are speaking as this staff member.

Return ONLY plain text.
No JSON.
No markdown.

I am this staff member:
${JSON.stringify(staff, null, 2)}

I am helping this user:
${JSON.stringify(user, null, 2)}

The user originally said:
"${prompt}"

The selected tool is:
${JSON.stringify(tool, null, 2)}

Current resolved arguments:
${JSON.stringify(currentArguments || {}, null, 2)}

Missing arguments:
${JSON.stringify(missingArguments || [], null, 2)}

Memory:
${JSON.stringify(memory || {}, null, 2)}

Recent chats:
${JSON.stringify(recentChats || [], null, 2)}

My job:
Ask the user for ONLY the missing information needed to use this tool.

Rules:
- Speak naturally as the staff member.
- Be short and clear.
- Do not ask for information already available.
- Do not mention JSON, arguments, registry, or tool resolver.
- If one thing is missing, ask one simple question.
- If multiple things are missing, ask for them in one short sentence.
`
  });

  return response;
};

// ===============================
// RETRIEVE MISSING ARGUMENTS FROM USER REPLY
// ===============================
const retrieveMissingArguments = async ({
  tool,
  originalPrompt,
  currentArguments,
  missingArguments,
  userReply
}) => {
  const parsed = await callAIJSON({
    instructions: `
You are a strict missing argument retriever.

Return ONLY valid JSON.
No markdown.
No explanations.

The user was previously asked for missing information.

Original user prompt:
"${originalPrompt}"

The selected tool:
${JSON.stringify(tool, null, 2)}

Current tool arguments:
${JSON.stringify(currentArguments, null, 2)}

Still missing arguments:
${JSON.stringify(missingArguments, null, 2)}

The user replied:
"${userReply}"

Your job:
Use the user's reply to update ONLY the missing arguments.

Rules:
- Use ONLY the argument names from the selected tool.
- Do NOT add extra argument names.
- Do NOT overwrite existing values unless the user clearly corrected them.
- Do NOT guess.
- Only fill missing arguments if the user's reply clearly provides the value.
- Convert values to match the argument type.
- If an argument is still missing, keep it null.
- Return all arguments, including the ones already filled.
- Any argument still null must be listed in missing_arguments.

Return exactly this JSON shape:
{
  "arguments": {
    "argument_name": "argument_value_or_null"
  },
  "missing_arguments": [],
  "reason": "short reason"
}
`
  });

  return parsed;
};

// ===============================
// INITIAL TOOL RESOLVER
// Stores pending tool if missing arguments exist
// ===============================
const tool_resolver = async (payload) => {
  const {
    conversation,
    tool,
    prompt,
    staff,
    user,
    memory,
    recentChats
  } = payload;

  try {
    const parsed = await callAIJSON({
      instructions: `
You are a strict tool argument resolver.

Return ONLY valid JSON.
No markdown.
No explanations.

I am this staff member:
${JSON.stringify(staff, null, 2)}

I am helping this user:
${JSON.stringify(user, null, 2)}

The user prompted me with:
"${prompt}"

Memory:
${JSON.stringify(memory || {}, null, 2)}

Recent chats:
${JSON.stringify(recentChats || [], null, 2)}

The selected tool is:
${JSON.stringify(tool, null, 2)}

Your job:
Fill in the arguments for this selected tool.

Rules:
- Use ONLY the argument names listed in the selected tool registry.
- Do NOT invent extra arguments.
- Do NOT guess missing values.
- Do NOT create fake route names, fake IDs, fake emails, fake dates, or fake data.
- Only infer a value if it is clearly stated in the prompt, memory, or recent chats.
- Convert each inferred value to match the argument type.
- If the value is not clearly available, return null.
- Add any null argument names to missing_arguments.

Important:
For API endpoint tools:
- If the user says "post request", "get request", "delete request", or "put request", you may infer the method.
- You may NOT infer the route unless the user clearly gives a route path like "/users", "/staff", or "/new_message".

Return exactly this JSON shape:
{
  "tool": "selected_tool_id_or_name",
  "arguments": {
    "argument_name": "argument_value_or_null"
  },
  "missing_arguments": [],
  "reason": "short reason"
}
`
    });

   
    const missingArguments = parsed.missing_arguments || [];

    if (missingArguments.length > 0) {
      const pendingToolId = await savePendingTool({
        conversation,
        tool,
        staff,
        user,
        originalPrompt: prompt,
        arguments: parsed.arguments,
        missingArguments
      });

      const message = await askForMissingArguments({
        tool,
        prompt,
        staff,
        user,
        memory,
        recentChats,
        missingArguments,
        currentArguments: parsed.arguments
      });

      return {
        status: "needs_more_info",
        pendingToolId,
        tool: parsed.tool,
        arguments: parsed.arguments,
        missing_arguments: missingArguments,
        reason: parsed.reason,
        message
      };
    }

    const toolResult = await executeTool({
      tool,
      arguments: parsed.arguments, user, staff
      
    });

    return {
      status: "completed",
      tool: parsed.tool,
      arguments: parsed.arguments,
      result: toolResult
    };
  } catch (error) {
    console.error("TOOL RESOLVER ERROR:", error.message);

    return {
      error: true,
      message: "Failed to resolve tool arguments",
      details: error.message
    };
  }
};

// ===============================
// HANDLE USER REPLY TO PENDING TOOL
// ===============================
const continue_pending_tool = async ({
  pendingToolId, conversation,
  userReply,
  memory,
  recentChats
}) => {
  try {
    const db = await connectMongo();

    const pendingTool = await db.collection("pending_tools").findOne(pendingToolId?{
      _id: new ObjectId(pendingToolId)
    }:{
      conversation,
      
      });
      console.log("PENDING TOOL FOUND:", pendingTool);
    if (!pendingTool) {
      return {
        error: true,
        message: "Pending tool not found."
      };
    }

    const updated = await retrieveMissingArguments({
      tool: pendingTool.tool,
      originalPrompt: pendingTool.original_prompt,
      currentArguments: pendingTool.arguments,
      missingArguments: pendingTool.missing_arguments,
      userReply
    });
    console.log("RETRIEVED ARGUMENTS:", updated);
    const stillMissing = updated.missing_arguments || [];

    if (stillMissing.length > 0) {
      await db.collection("pending_tools").updateOne(
        { _id: new ObjectId(pendingToolId) },
        {
          $set: {
            arguments: updated.arguments,
            missing_arguments: stillMissing,
            updated_at: new Date()
          }
        }
      );

      const message = await askForMissingArguments({
        tool: pendingTool.tool,
        prompt: pendingTool.original_prompt,
        staff: pendingTool.staff,
        user: pendingTool.user,
        memory,
        recentChats,
        missingArguments: stillMissing,
        currentArguments: updated.arguments
      });

      return {
        status: "needs_more_info",
        pendingToolId,
        tool: pendingTool.tool.name,
        arguments: updated.arguments,
        missing_arguments: stillMissing,
        reason: updated.reason,
        message
      };
    }

    const toolResult = await executeTool({
      tool: pendingTool.tool,
      arguments: updated.arguments, user: pendingTool.user, staff: pendingTool.staff
    });
    console.log("TOOL EXECUTION RESULT:", toolResult);
    

    await db.collection("pending_tools").deleteOne({
      _id: new ObjectId(pendingToolId)
    });

    return {
      status: "completed",
      tool: pendingTool.tool.name,
      arguments: updated.arguments,
      result: toolResult
    };
  } catch (error) {
    console.error("CONTINUE PENDING TOOL ERROR:", error.message);

    return {
      error: true,
      message: "Failed to continue pending tool.",
      details: error.message
    };
  }
};

module.exports = {
  tool_resolver,
  continue_pending_tool
};