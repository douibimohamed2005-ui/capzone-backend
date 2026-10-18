const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const orderController = require("../controllers/orderController");

// CLIENT
router.post("/", orderController.createOrder);

// ADMIN
router.get("/", auth, orderController.getOrders);
router.get("/:id", auth, orderController.getOrderDetails);
router.put("/:id/status", auth, orderController.updateStatus);

module.exports = router;
