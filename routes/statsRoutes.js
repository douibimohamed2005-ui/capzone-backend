const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const statsController = require("../controllers/statsController");

// All stats routes are admin-protected
router.get("/overview", auth, statsController.getOverview);
router.get("/revenue-over-time", auth, statsController.getRevenueOverTime);
router.get("/orders-by-hour", auth, statsController.getOrdersByHour);
router.get("/orders-by-weekday", auth, statsController.getOrdersByWeekday);
router.get("/by-wilaya", auth, statsController.getByWilaya);
router.get("/cancellation-trend", auth, statsController.getCancellationTrend);
router.get("/product-revenue", auth, statsController.getProductRevenue);
router.get("/stock-health", auth, statsController.getStockHealth);

module.exports = router;
