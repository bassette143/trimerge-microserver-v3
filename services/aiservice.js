const axios = require("axios");
const OpenAI = require("openai");

const AI_PROVIDER = process.env.AI_PROVIDER || "ollama";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const DEFAULT_OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ||
  process.env.ROUTER_MODEL ||
  "qwen2.5:latest";

const openaikey = process.env.OPENAI_API?.trim();
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const openai = openaikey
  ? new OpenAI({
      apiKey: openaikey
    })
  : null;

// ===============================
// FORMAT RECENT CHATS
// ===============================
const formatRecentChatsForOpenAI = (recentChats = []) => {
  return recentChats.slice(-10).map(chat => ({
    role: chat.role === "assistant" ? "assistant" : "user",
    content: chat.message || chat.text || ""
  }));
};

const formatRecentChatsForOllama = (recentChats = []) => {
  return recentChats
    .slice(-10)
    .map(chat => `${chat.role}: ${chat.message || chat.text || ""}`)
    .join("\n");
};

// ===============================
// CALL OLLAMA
// ===============================
const callOllama = async ({
  instructions,
  recentChats = [],
  model = DEFAULT_OLLAMA_MODEL,
  stream = false
}) => {
  const recentChatText = formatRecentChatsForOllama(recentChats);

  const fullPrompt = `
${instructions}

Recent chats:
${recentChatText}
`;

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model,
    stream,
    prompt: fullPrompt
  });

  return response.data.response.trim();
};

// ===============================
// CALL OPENAI
// ===============================
const callOpenAI = async ({
  instructions,
  recentChats = [],
  model = OPENAI_MODEL
}) => {
  if (!openaikey || openaikey === "your_key_here") {
    throw new Error(
      "OPENAI_API is missing or still set to a placeholder value."
    );
  }

  const input = [
    {
      role: "system",
      content: instructions
    },
    ...formatRecentChatsForOpenAI(recentChats)
  ];

  const response = await openai.responses.create({
    model,
    input
  });

  return response.output_text.trim();
};

// ===============================
// CALL AI PROVIDER
// ===============================
const callAI = async ({
  instructions,
  recentChats = [],
  model
}) => {
  if (AI_PROVIDER === "openai") {
    return await callOpenAI({
      instructions,
      recentChats,
      model: model || OPENAI_MODEL
    });
  }

  return await callOllama({
    instructions,
    recentChats,
    model: model || DEFAULT_OLLAMA_MODEL,
    stream: false
  });
};

// ===============================
// CALL AI AND PARSE JSON
// ===============================
const callAIJSON = async ({
  instructions,
  recentChats = [],
  model
}) => {
  const rawText = await callAI({
    instructions,
    recentChats,
    model
  });

  const jsonStart = rawText.indexOf("{");
  const jsonEnd = rawText.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("LLM did not return JSON");
  }

  return JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));
};

module.exports = {
  callAI,
  callAIJSON,
  callOllama,
  callOpenAI
};