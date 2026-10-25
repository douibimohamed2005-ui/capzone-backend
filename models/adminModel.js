const db = require("../config/db");

// GET ALL ADMINS (to check if exists)
exports.getAllAdmins = (callback) => {
  db.query("SELECT * FROM admin", callback);
};
// FIND ADMIN BY EMAIL
exports.getAdminByEmail = (email, callback) => {
  db.query("SELECT * FROM admin WHERE email = ?", [email], callback);
};

// CREATE ADMIN
exports.createAdmin = (data, callback) => {
  const sql = "INSERT INTO admin (email, password) VALUES (?, ?)";
  db.query(sql, data, callback);
};

// Serialize the one-admin check and insert across requests and app instances.
exports.createFirstAdmin = (email, hashedPassword, callback) => {
  db.getConnection((connectionError, connection) => {
    if (connectionError) return callback(connectionError);

    const release = () => connection.release();
    connection.query("SELECT GET_LOCK(?, 10) AS acquired", ["capzone_admin_registration"], (lockError, lockRows) => {
      if (lockError) {
        connection.destroy();
        return callback(lockError);
      }
      if (lockRows[0].acquired !== 1) {
        release();
        return callback(null, { locked: false });
      }

      connection.query("SELECT COUNT(*) AS count FROM admin", (selectError, rows) => {
        if (selectError) return releaseWithError(selectError);
        if (Number(rows[0].count) > 0) return releaseWithResult({ exists: true });

        connection.query(
          "INSERT INTO admin (email, password) VALUES (?, ?)",
          [email, hashedPassword],
          (insertError, result) => {
            if (insertError) return releaseWithError(insertError);
            releaseWithResult({ created: true, insertId: result.insertId });
          }
        );
      });

      function releaseWithError(error) {
        connection.query("SELECT RELEASE_LOCK(?)", ["capzone_admin_registration"], (unlockError) => {
          if (unlockError) connection.destroy();
          else release();
          callback(error);
        });
      }

      function releaseWithResult(result) {
        connection.query("SELECT RELEASE_LOCK(?)", ["capzone_admin_registration"], (unlockError) => {
          if (unlockError) {
            connection.destroy();
            return callback(unlockError);
          }
          release();
          callback(null, result);
        });
      }
    });
  });
};

// SAVE OTP (code + expiry) ON THE ADMIN ROW
exports.saveOtp = (email, otpCode, expiresAt, callback) => {
  const sql = "UPDATE admin SET otp_code = ?, otp_expires = ? WHERE email = ?";
  db.query(sql, [otpCode, expiresAt, email], callback);
};

// GET ADMIN OTP INFO
exports.getOtpByEmail = (email, callback) => {
  db.query("SELECT otp_code, otp_expires FROM admin WHERE email = ?", [email], callback);
};

// CLEAR OTP AFTER USE
exports.clearOtp = (email, callback) => {
  const sql = "UPDATE admin SET otp_code = NULL, otp_expires = NULL WHERE email = ?";
  db.query(sql, [email], callback);
};

// UPDATE PASSWORD
exports.updatePassword = (email, hashedPassword, callback) => {
  const sql = "UPDATE admin SET password = ? WHERE email = ?";
  db.query(sql, [hashedPassword, email], callback);
};
