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
      });
      console.log("PENDING TOOL RESPONSE:", response);
      return response;
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
    } else {
      skillDecision = { skill: skillDecision };
    }

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
    const randomStaff = matchedStaff.find((staff) => staff._id === "69f506e2b4859eff3993f55e") || null;
    
    // =========================
    // STEP 8: RETURN RESPONSE
    // =========================
    
   let tools = mockToolsData.tools.staff[randomStaff?._id]?.tool || [];
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
  recentChats: [], 
   // Replace with actual recent chats if available
});
console.log("TOOL ARGUMENTS RESULT:", toolArguments);
let agentmessage = {
        conversation: options.conversation_id, text: toolArguments.message || toolArguments.result.response, position:matchedPositions.find((position) => position._id === randomStaff?.position)?.name || "Unknown Position", staff: randomStaff?._id || "Unknown Staff", tool: toolSelection.tool, arguments: toolArguments.arguments, timestamp: new Date()}
 
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

module.exports = { chat };