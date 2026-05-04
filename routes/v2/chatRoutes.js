const express = require("express");
const router = express.Router();

const { chat } = require("../../services/chat");

router.post("/chat", async (req, res) => {
  try {
    const { prompt, user, options } = req.body;

    const result = await chat(prompt, user, options);

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: true,
      message: err.message
    });
  }
});

module.exports = router;