const router = require("express").Router();
const { SettingsController } = require("../controllers");
const { verifyToken } = require("../middlewares/Authmuddleware");

router.get("/settings/max-file-size", SettingsController.getMaxFileSize);

module.exports = router;
