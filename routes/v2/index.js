const express = require("express");
const router = express.Router();

const connectMongo = require("../../mdb");

// =========================
// TEST ROUTE
// =========================
router.get("/test", (req, res) => {
  res.json({ message: "v2 routes working with MongoDB" });
});

// =========================
// NEW CONVERSATION
// =========================
router.post("/new_conversation", async (req, res) => {
  try {
    const { title, memory, profile, project, recent_message } = req.body;

    if (!title || !profile) {
      return res.status(400).json({ error: "title and profile required" });
    }

    const db = await connectMongo();
    const conversations = db.collection("v2_conversations");

    const newConversation = {
      title,
      memory: memory || null,
      profile,
      project: project || null,
      recent_message: recent_message || null,
      created_at: new Date(),
      _id:crypto.randomUUID()
  
    };

    const result = await conversations.insertOne(newConversation);

    res.status(201).json({
      id: result.insertedId,
      ...newConversation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// NEW MESSAGE
// =========================
router.post("/new_message", async (req, res) => {
  try {
    const { conversation, tool, text, attachment } = req.body;

    if (!conversation || !text) {
      return res.status(400).json({ error: "conversation and text required" });
    }

    const db = await connectMongo();
    const messages = db.collection("v2_messages");

    const newMessage = {
      conversation,
      tool: tool || null,
      text,
      attachment: attachment || [],
      created_at: new Date(),
      _id:crypto.randomUUID()
    };

    const result = await messages.insertOne(newMessage);

    res.status(201).json({
      id: result.insertedId,
      ...newMessage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// GET MESSAGES
// =========================
router.post("/messages", async (req, res) => {
  try {
    const { conversation, page = 1, limit = 25 } = req.body;

    if (!conversation) {
      return res.status(400).json({ error: "conversation required" });
    }

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Number(limit) : 25;
    const offset = (safePage - 1) * safeLimit;

    const db = await connectMongo();
    const messages = db.collection("v2_messages");

    const rows = await messages
      .find({ conversation })
      .sort({ created_at: 1 })
      .skip(offset)
      .limit(safeLimit)
      .toArray();

    res.json({
      conversation,
      page: safePage,
      limit: safeLimit,
      messages: rows.map((row) => ({
        id: row._id,
        conversation: row.conversation,
        tool: row.tool,
        text: row.text,
        attachment: row.attachment || [],
        created_at: row.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// GET CONVERSATIONS
// =========================
router.post("/conversations", async (req, res) => {
  try {
    const { profile, project, page = 1, limit = 25 } = req.body;

    if (!profile) {
      return res.status(400).json({ error: "profile required" });
    }

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Number(limit) : 25;
    const offset = (safePage - 1) * safeLimit;

    const db = await connectMongo();
    const conversations = db.collection("v2_conversations");

    const query = { profile };

    if (project !== undefined && project !== null && project !== "") {
      query.project = project;
    } else {
      query.project = null;
    }

    const rows = await conversations
      .find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(safeLimit)
      .toArray();

    res.json({
      profile,
      project: project || null,
      page: safePage,
      limit: safeLimit,
      conversations: rows.map((row) => ({
        id: row._id,
        title: row.title,
        memory: row.memory || null,
        profile: row.profile,
        project: row.project,
        recent_message: row.recent_message,
        created_at: row.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;