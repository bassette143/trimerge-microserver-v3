const axios = require("axios");

const { selectSkill } = require("./llmSkillSelector");
const connectMongo = require("../mdb");
const { mockToolsData } = require("./toolsmockdata");
const { selectStaffTool } = require("./llmstaffselector");
const { tool_resolver } = require("./toolresolver");

const API_BASE_URL =
  process.env.API_BASE_URL || "https://trimerge-iq.onrender.com";

const SKILLS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const chat = async (prompt, user, options = {}) => {
  try {
    const db = await connectMongo();
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
  memory: {}, // Replace with actual memory if available
  recentChats: [] // Replace with actual recent chats if available
});
console.log("TOOL ARGUMENTS RESULT:", toolArguments);
return {
  skill: matchedSkill,
  staff: randomStaff, 
  position: matchedPositions.find((position) => position._id === randomStaff?.position),
  toolSelection,
  toolArguments,
  skillsSource
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