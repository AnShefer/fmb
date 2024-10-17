// authMiddleware.js

const { HIGH_SECURITY_TOKEN } = process.env;

function SecurityCheckPost(req, res, next) {
  const authToken = req.headers["x-api-key"];
  
  if (!authToken || authToken !== `${HIGH_SECURITY_TOKEN}`) {
    return res.status(401).json({ message: "Unauthorized Not Allowed" });
  }
  // Proceed to the next middleware or route handler
  next();
}

module.exports = SecurityCheckPost;
