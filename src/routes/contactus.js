const router = require("express").Router();
const { ContactusController } = require("../controllers");
const SecurityCheckPost = require("../middlewares/checkPost");

router.post("/", SecurityCheckPost, ContactusController.contactUs);

module.exports = router;
