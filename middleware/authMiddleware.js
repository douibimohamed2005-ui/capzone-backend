/* Takes token from header
Verifies it
If correct → continue
If wrong → block request */

const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  // format: Bearer TOKEN
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next(); // go to next step (route)
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
