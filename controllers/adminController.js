const adminModel = require("../models/adminModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const logRegistrationDbError = (stage, error) => {
  const message = String(error.sqlMessage || error.message || "Database error")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .slice(0, 300);
  console.error(`Admin registration ${stage} failed`, {
    code: error.code || "UNKNOWN",
    message,
  });
};

// ── EMAIL TRANSPORTER ──
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// REGISTER (ONLY ONE ADMIN)
exports.register = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (password.length < 6 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Password must be 6 to 72 bytes long." });
  }

  try {
    console.info("Admin registration request received");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.info("Admin registration password hashing succeeded");

    adminModel.createFirstAdmin(email, hashedPassword, (err, result) => {
      if (err) {
        logRegistrationDbError("database operation", err);
        return res.status(500).json({ message: "Registration could not be completed. Check server logs for the registration error code." });
      }
      if (result?.locked === false) {
        return res.status(503).json({ message: "Registration is busy. Please try again." });
      }
      if (result?.exists) {
        return res.status(400).json({ message: "Admin already exists. Only one admin allowed." });
      }
      console.info("Admin registration insert succeeded");
      return res.status(201).json({ message: "Admin created successfully" });
    });
  } catch (error) {
    console.error("Admin registration password hashing failed", { code: error.code || error.name || "UNKNOWN" });
    return res.status(500).json({ message: "Registration could not be completed. Check server logs for the registration error code." });
  }
};

// LOGIN
exports.login = (req, res) => {
  const { email, password } = req.body;

  adminModel.getAdminByEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(400).json({ message: "Admin not found" });
    }

    const admin = results[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ message: "Login successful", token });
  });
};

// ── FORGOT PASSWORD: STEP 1 — Send OTP ──
exports.sendOtp = (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required." });

  adminModel.getAdminByEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Always return success to avoid email enumeration
    if (results.length === 0) {
      return res.json({ message: "If this email exists, an OTP has been sent." });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    adminModel.saveOtp(email, otpCode, expiresAt, async (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Send email
      try {
        await transporter.sendMail({
          from: `"Admin Portal" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Your Password Reset OTP",
          html: `
            <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;background:#0d1117;color:#f1f5f9;border-radius:12px;border:1px solid #1e2d3d;">
              <h2 style="color:#2563eb;margin-bottom:8px;">Admin Portal</h2>
              <p style="color:#94a3b8;margin-bottom:24px;">Your one-time password reset code:</p>
              <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#f1f5f9;text-align:center;background:#111827;padding:20px;border-radius:8px;border:1px solid #1e2d3d;">
                ${otpCode}
              </div>
              <p style="color:#4b5e78;font-size:13px;margin-top:20px;">This code expires in <strong style="color:#94a3b8;">10 minutes</strong>. Do not share it with anyone.</p>
            </div>
          `,
        });

        res.json({ message: "If this email exists, an OTP has been sent." });
      } catch (mailErr) {
        console.error("Email error:", mailErr);
        res.status(500).json({ message: "Failed to send OTP email. Check server email config." });
      }
    });
  });
};

// ── FORGOT PASSWORD: STEP 2 — Verify OTP ──
exports.verifyOtp = (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  adminModel.getOtpByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const { otp_code, otp_expires } = results[0];

    if (!otp_code) {
      return res.status(400).json({ message: "No OTP was requested. Please start over." });
    }

    if (new Date() > new Date(otp_expires)) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (otp.trim() !== otp_code) {
      return res.status(400).json({ message: "Incorrect OTP code." });
    }

    res.json({ message: "OTP verified." });
  });
};

// ── FORGOT PASSWORD: STEP 3 — Reset Password ──
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  adminModel.getOtpByEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const { otp_code, otp_expires } = results[0];

    if (!otp_code) {
      return res.status(400).json({ message: "No OTP was requested. Please start over." });
    }

    if (new Date() > new Date(otp_expires)) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (otp.trim() !== otp_code) {
      return res.status(400).json({ message: "Incorrect OTP code." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    adminModel.updatePassword(email, hashedPassword, (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Clear OTP so it can't be reused
      adminModel.clearOtp(email, () => {});

      res.json({ message: "Password reset successfully." });
    });
  });
};
