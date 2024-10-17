// jwtGenerator.js

const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const generateToken = async (userId, usertype) => {
  const payload = {
    user: {
      id: userId,
      usertype: usertype,
    },
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
};

module.exports = generateToken;
