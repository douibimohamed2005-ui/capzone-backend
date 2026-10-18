const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

// REGISTER (ONLY ONCE)
router.post("/register", adminController.register);

// LOGIN
router.post("/login", adminController.login);

// FORGOT PASSWORD — OTP FLOW
router.post("/forgot-password/send-otp", adminController.sendOtp);
router.post("/forgot-password/verify-otp", adminController.verifyOtp);
router.post("/forgot-password/reset", adminController.resetPassword);

module.exports = router;
