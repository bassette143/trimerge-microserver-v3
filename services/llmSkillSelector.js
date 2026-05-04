const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const ROUTER_MODEL = process.env.ROUTER_MODEL || "qwen2.5:latest";
const API_BASE_URL = process.env.API_BASE_URL || "https://trimerge-iq.onrender.com";

// =========================
// SKILL → REAL ENDPOINT MAP
// =========================
const SKILL_ENDPOINTS = {
  list_staff: {
    method: "GET",
    endpoint: `${API_BASE_URL}/staff`
  },

  list_services: {
    method: "GET",
    endpoint: `${API_BASE_URL}/services`
  },

  create_service: {
    method: "POST",
    endpoint: `${API_BASE_URL}/services`,
    payload: (prompt, user) => ({
      name: prompt,
      requested_by: user
    })
  },

  list_clients: {
    method: "GET",
    endpoint: `${API_BASE_URL}/clients`
  },

  list_projects: {
    method: "GET",
    endpoint: `${API_BASE_URL}/projects`
  },

  list_positions: {
    method: "GET",
    endpoint: `${API_BASE_URL}/positions`
  },

  list_skills: {
    method: "GET",
    endpoint: `${API_BASE_URL}/skills`
  }
};

// =========================
// MAIN SELECTOR
// =========================
const selectSkill = async (prompt, user, options = {}) => {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: ROUTER_MODEL,
      stream: false,
      prompt: `
You are a strict API router.

Return ONLY valid JSON.
No explanations.

Available skills:
- list_staff
- list_services
- create_service
- list_clients
- list_projects
- list_positions
- list_skills

Rules:
- Staff, employees → list_staff
- Services → list_services
- Create/order/request → create_service
- Clients → list_clients
- Projects → list_projects
- Positions/jobs → list_positions
- Skills → list_skills
- If unsure → list_staff

User:
${user}

Prompt:
${prompt}

Return:
{
  "skill": "list_staff"
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
    const selected = SKILL_ENDPOINTS[parsed.skill];

    if (!selected) {
      throw new Error(`Unknown skill: ${parsed.skill}`);
    }

    return {
      skill: parsed.skill,
      method: selected.method,
      endpoint: selected.endpoint,
      payload:
        typeof selected.payload === "function"
          ? selected.payload(prompt, user, options)
          : null
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