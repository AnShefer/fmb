const MainUserController = require("./mainUserController");
const MediaController = require("./MediaController");
const SettingsController = require("./settingsController");
const SubUserController = require("./subUserController");
const ContactusController = require("./contactus");
const AdminController = require("./AdminController");
const ErrorLogsController = require("./ErrorsController");
const TagController = require("./TagController");
module.exports = {
  MainUserController: MainUserController,
  MediaController: MediaController,
  SettingsController: SettingsController,
  SubUserController: SubUserController,
  ContactusController: ContactusController,
  AdminController: AdminController,
  ErrorLogsController: ErrorLogsController,
  TagController: TagController
};
