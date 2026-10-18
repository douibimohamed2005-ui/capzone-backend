const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const dashboardController = require("../controllers/dashboardController");

// 📊 DASHBOARD
router.get("/", auth, dashboardController.getDashboard);

module.exports = router;
