const express = require("express");


// ✅ NEW
const v2Routes = require("./v2");

const router = express.Router();



// ✅ NEW
router.use("/v2", v2Routes);

module.exports = router;