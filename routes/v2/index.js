const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const connectMongo = require("../../mdb");

// ✅ ADD CHAT ROUTES
const chatRoutes = require("./chatRoutes");
const { chat } = require("../../services/chat");
router.use("/", chatRoutes);

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
      _id: crypto.randomUUID(),
      title,
      memory: memory || null,
      profile,
      project: project || null,
      recent_message: recent_message || null,
      pinned: false,
      archived: false,
      deleted: false,
      share_id: null,
      share_url: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    await conversations.insertOne(newConversation);

    res.status(201).json({
      id: newConversation._id,
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
    const { conversation, skill, text, attachment, user, pending_tool } = req.body;

    if (!conversation || !text) {
      return res.status(400).json({ error: "conversation and text required" });
    }

    const db = await connectMongo();
    const messages = db.collection("v2_messages");

    const newMessage = {
      _id: crypto.randomUUID(),
      conversation,
      skill: skill || null,
      text,
      attachment: attachment || [],
      created_at: new Date()
    };

    await messages.insertOne(newMessage);
    let response = await chat(newMessage.text, user, { skill: newMessage.skill, conversation, pending_tool });
    await db.collection("v2_conversations").updateOne(
      { _id: conversation },
      {
        $set: {
          recent_message: text,
          updated_at: new Date()
        }
      }
    );

    res.status(201).json(response);
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
        skill: row.skill,
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
    const {
      profile,
      project,
      page = 1,
      limit = 25,
      include_archived = false
    } = req.body;

    if (!profile) {
      return res.status(400).json({ error: "profile required" });
    }

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Number(limit) : 25;
    const offset = (safePage - 1) * safeLimit;

    const db = await connectMongo();
    const conversations = db.collection("v2_conversations");

    const query = {
      profile,
      deleted: { $ne: true }
    };

    if (!include_archived) {
      query.archived = { $ne: true };
    }

    if (project !== undefined && project !== null && project !== "") {
      query.project = project;
    } else {
      query.project = null;
    }

    const rows = await conversations
      .find(query)
      .sort({ pinned: -1, updated_at: -1, created_at: -1 })
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
        pinned: row.pinned || false,
        archived: row.archived || false,
        deleted: row.deleted || false,
        share_id: row.share_id || null,
        share_url: row.share_url || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// SHARE LINK
// =========================
router.post("/share_link", async (req, res) => {
  try {
    const { conversation, base_url } = req.body;

    if (!conversation) {
      return res.status(400).json({ error: "conversation required" });
    }

    const db = await connectMongo();
    const conversations = db.collection("v2_conversations");

    const share_id = crypto.randomUUID();
    const share_url = `${base_url || "http://localhost:3000"}/share/${share_id}`;

    await conversations.updateOne(
      { _id: conversation },
      {
        $set: {
          share_id,
          share_url,
          updated_at: new Date()
        }
      }
    );

    res.json({
      conversation,
      share_id,
      share_url
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// RENAME CONVERSATION
// =========================
router.post("/rename_conversation", async (req, res) => {
  try {
    const { conversation, title } = req.body;

    if (!conversation || !title) {
      return res.status(400).json({
        error: "conversation and title required"
      });
    }

    const db = await connectMongo();

    await db.collection("v2_conversations").updateOne(
      { _id: conversation },
      {
        $set: {
          title,
          updated_at: new Date()
        }
      }
    );

    res.json({
      conversation,
      title,
      renamed: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// ARCHIVE CONVERSATION
// =========================
router.post("/archive_conversation", async (req, res) => {
  try {
    const { conversation, archived = true } = req.body;

    if (!conversation) {
      return res.status(400).json({
        error: "conversation required"
      });
    }

    const db = await connectMongo();

    await db.collection("v2_conversations").updateOne(
      { _id: conversation },
      {
        $set: {
          archived: Boolean(archived),
          updated_at: new Date()
        }
      }
    );

    res.json({
      conversation,
      archived: Boolean(archived)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// PIN CHAT
// =========================
router.post("/pin_chat", async (req, res) => {
  try {
    const { conversation, pinned = true } = req.body;

    if (!conversation) {
      return res.status(400).json({
        error: "conversation required"
      });
    }

    const db = await connectMongo();

    await db.collection("v2_conversations").updateOne(
      { _id: conversation },
      {
        $set: {
          pinned: Boolean(pinned),
          updated_at: new Date()
        }
      }
    );

    res.json({
      conversation,
      pinned: Boolean(pinned)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// DELETE CONVERSATION
// =========================
router.post("/delete_conversation", async (req, res) => {
  try {
    const { conversation, hard_delete = false } = req.body;

    if (!conversation) {
      return res.status(400).json({
        error: "conversation required"
      });
    }

    const db = await connectMongo();

    if (hard_delete) {
      await db.collection("v2_messages").deleteMany({
        conversation
      });

      await db.collection("v2_conversations").deleteOne({
        _id: conversation
      });

      return res.json({
        conversation,
        deleted: true,
        hard_delete: true
      });
    }

    await db.collection("v2_conversations").updateOne(
      { _id: conversation },
      {
        $set: {
          deleted: true,
          archived: true,
          deleted_at: new Date(),
          updated_at: new Date()
        }
      }
    );

    res.json({
      conversation,
      deleted: true,
      hard_delete: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;