const db = require("../config/db");

// GET ALL ADMINS (to check if exists)
exports.getAllAdmins = (callback) => {
  db.query("SELECT * FROM Admin", callback);
};

// FIND ADMIN BY EMAIL
exports.getAdminByEmail = (email, callback) => {
  db.query("SELECT * FROM Admin WHERE email = ?", [email], callback);
};

// CREATE ADMIN
exports.createAdmin = (data, callback) => {
  const sql = "INSERT INTO Admin (email, password) VALUES (?, ?)";
  db.query(sql, data, callback);
};

// SAVE OTP (code + expiry) ON THE ADMIN ROW
exports.saveOtp = (email, otpCode, expiresAt, callback) => {
  const sql = "UPDATE Admin SET otp_code = ?, otp_expires = ? WHERE email = ?";
  db.query(sql, [otpCode, expiresAt, email], callback);
};

// GET ADMIN OTP INFO
exports.getOtpByEmail = (email, callback) => {
  db.query("SELECT otp_code, otp_expires FROM Admin WHERE email = ?", [email], callback);
};

// CLEAR OTP AFTER USE
exports.clearOtp = (email, callback) => {
  const sql = "UPDATE Admin SET otp_code = NULL, otp_expires = NULL WHERE email = ?";
  db.query(sql, [email], callback);
};

// UPDATE PASSWORD
exports.updatePassword = (email, hashedPassword, callback) => {
  const sql = "UPDATE Admin SET password = ? WHERE email = ?";
  db.query(sql, [hashedPassword, email], callback);
};
