const jwt = require("jsonwebtoken");

const generateToken = (userId, usertype, video, type) => {
  const payload = {
    user: {
      id: userId,
      usertype: usertype,
      videoId: video,
      type: type,
    },
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
};
const decryptToken = (token) => {
  const data = jwt.verify(token, process.env.JWT_SECRET);
  return data;
};

module.exports = {
  generateToken,
  decryptToken,
};
