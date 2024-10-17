const mainUserModel = require("./mainuserModel");
const subUserModel = require("./subUserModel");
const ImageModel = require("./ImageModel");
const VideoModel = require("./VideoModel");
const SettingsModel = require("./settingsModel");
const ErrorLogs = require("./Errors.models");
const AdminModel = require("./adminModels");
const tagModel = require("./TagModel");
const orderModel = require("./OrderModel");

module.exports = {
  MainUserModel: mainUserModel,
  SubUserModel: subUserModel,
  ImageModel: ImageModel,
  VideoModel: VideoModel,
  SettingsModel: SettingsModel,
  Admin: AdminModel,
  ErrorLogs: ErrorLogs,
  tagModel: tagModel,
  OrderModel: orderModel,
};
