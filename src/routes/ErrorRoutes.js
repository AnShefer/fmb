const router = require("express").Router();
const { ErrorLogsController } = require("../controllers");
const SecurityCheckPost = require("../middlewares/checkPost");

// Get error logs
router.get("/logs", ErrorLogsController.getErrorLogs);

module.exports = router;
