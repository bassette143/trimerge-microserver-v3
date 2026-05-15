const axios = require("axios");



const { selectSkill } = require("./llmSkillSelector");
const connectMongo = require("../mdb");
const { mockToolsData } = require("./toolsmockdata");
const { selectStaffTool } = require("./llmstaffselector");
const { tool_resolver, continue_pending_tool } = require("./toolresolver");

const API_BASE_URL =
  process.env.API_BASE_URL || "https://trimerge-iq.onrender.com";

const SKILLS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const chat = async (prompt, user, options = {}) => {
  console.log("CHAT CALLED WITH:", { prompt, user, options });
  try {
    const db = await connectMongo();
    const messages = db.collection("v2_messages");
    if (options.pending_tool) {
      let response = await continue_pending_tool({
        pendingToolId: options.pending_tool,
        userReply: prompt,  
        recentChats: await getrecentmessages(options.conversation_id)  
      });
      console.log("PENDING TOOL RESPONSE:", response);
      let agentmessage = {
        conversation: options.conversation,agent:true, text: response.message || response.result?.response, pending_tool:response.pendingToolId || null, tool: response.tool, arguments: response.arguments,  created_at: new Date()}
 
      await messages.insertOne(agentmessage);
      return agentmessage;
    }
    let skillDecision = options.skill;

    let skills = null;
    let skillsSource = "provided_in_request";

    // =========================
    // STEP 1: GET SKILLS
    // =========================
    if (!skillDecision) {
      const cachedSkills = true?null:await db.collection("skills_cache").findOne({
        cacheKey: "all_skills",
        expiresAt: { $gt: new Date() }
      });

      if (cachedSkills) {
        skills = cachedSkills.skills;
        skillsSource = "mongo_cache";
      } else {
        console.log("Fetching skills from backend API...");
        const skillsResponse = await axios.get(`${API_BASE_URL}/skills`, {
          timeout: 30000
        });
        console.log("Skills fetched from backend API:", skillsResponse.data);
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
      if (skillDecision.mode === "generic_response") {
       let agentmessage = {
        conversation: options.conversation, agent:true, text: skillDecision.response || null, pending_tool:null, tool: null, arguments: null,  created_at: new Date()}
        await messages.insertOne(agentmessage);
        return agentmessage;
      }
    } else {
      skillDecision = { skill: skillDecision };
    }
    console.log("SKILL DECISION:", skillDecision, "SKILLS SOURCE:", skillsSource);
    // =========================
    // STEP 2: VALIDATE SELECTED SKILL
    // =========================
    if (!skillDecision || !skillDecision.skill) {
      return {
        error: true,
        message: "LLM did not return a skill.",
        skillDecision
      };
    }

    const skillsArray = Array.isArray(skills)
      ? skills
      : skills?.skills || [];

    const matchedSkill = skillsArray.find(
      (s) =>
        s._id === skillDecision.skill ||
        s.id === skillDecision.skill ||
        s.name === skillDecision.skill
    );

    if (!matchedSkill) {
      return {
        error: true,
        message: "Selected skill is not in the available skills list.",
        selectedSkill: skillDecision.skill,
        availableSkills: skillsArray
      };
    }

    // =========================
    // STEP 3: GET POSITIONS
    // =========================
    const positionsResponse = await axios.get(`${API_BASE_URL}/positions`, {
      timeout: 30000
    });

    const positionsData = positionsResponse.data;

    const positionsArray = Array.isArray(positionsData)
      ? positionsData
      : positionsData.positions || [];

    // =========================
    // STEP 4: FILTER POSITIONS BY SELECTED SKILL
    // =========================
    const matchedPositions = positionsArray.filter((position) => {
      const skillId = matchedSkill._id 
      const skillName = matchedSkill.name;

      return (
       
       
          position.skills.find((s) => {
            
              return s === skillId || s === skillName;
            

            
          })
      );
    });
    console.log("MATCHED POSITIONS:", matchedPositions);
    // =========================
    // STEP 5: GET STAFF
    // =========================
    const staffResponse = await axios.get(`${API_BASE_URL}/staff`, {
      timeout: 30000
    });

    const staffData = staffResponse.data;

    const staffArray = Array.isArray(staffData)
      ? staffData
      : staffData.staff || [];

    // =========================
    // STEP 6: FILTER STAFF BY MATCHED POSITIONS
    // =========================
    const matchedPositionIds = matchedPositions.map(
      (position) => position._id 
    );

    const matchedStaff = staffArray.filter((staff) =>
      matchedPositionIds.includes(staff.position)
    );
    console.log("MATCHED STAFF:", matchedStaff);

    // =========================
    // STEP 7: SELECT RANDOM STAFF
    // =========================
    const randomStaff = matchedStaff[0];
    
    // =========================
    // STEP 8: RETURN RESPONSE
    // =========================
    
   const toolsResponse = await axios.get(`${API_BASE_URL}/get_staff_tools/${randomStaff?._id}`, {
      timeout: 30000
    });
   let tools = toolsResponse.data || [];
   let toolSelection = await selectStaffTool({
  prompt,
  user,
  staff: randomStaff,
  position: matchedPositions.find((position) => position._id === randomStaff?.position),
  tools,
  memory: {}, // Replace with actual memory if available
  recentChats: [] // Replace with actual recent chats if available  
})
console.log("TOOL SELECTION RESULT:", toolSelection);



const toolArguments = await tool_resolver({
  tool: toolSelection.tool,
  prompt,
  staff: randomStaff,
  user,
  conversation: options.conversation_id,
  memory: {}, 
// Replace with actual memory if available
  recentChats: await getrecentmessages(options.conversation_id)  
   // Replace with actual recent chats if available
});
console.log("TOOL ARGUMENTS RESULT:", toolArguments);
let agentmessage = {
        conversation: options.conversation, agent:true, text: toolArguments.message || toolArguments.result?.response, pending_tool:toolArguments.pendingToolId || null, position:matchedPositions.find((position) => position._id === randomStaff?.position)?.name || "Unknown Position", staff: randomStaff?._id || "Unknown Staff", tool: toolSelection.tool, arguments: toolArguments.arguments,  created_at: new Date()}
 
      await messages.insertOne(agentmessage);
return agentmessage
  } catch (error) {
    console.error("CHAT ERROR:", error.message);

    return {
      error: true,
      message: "Chat failed",
      details: error.message
    };
  }
};
const getrecentmessages = async (conversationId) => {
  try {
    const db = await connectMongo();
    const messages = db.collection("v2_messages");
    const recentMessages = await messages.find({ conversation: conversationId })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

 

const formattedMessages = recentMessages.reverse().map(msg => ({
  role: msg.agent ? "assistant" : "user",
  content: msg.text
}));
return formattedMessages;
  } catch (error) {
    console.error("GET RECENT MESSAGES ERROR:", error.message);
    return [];
  }
};

module.exports = { chat, getrecentmessages };