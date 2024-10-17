const axios = require("axios");
const BarcodeEmailer = require("../utils/BarcodeEmailer");
const { deleteFileFromDO } = require("../utils/DeleteFiles");
const {
  generateToken,
  decryptToken,
} = require("../utils/generate-video-token");

const saveErrorLogs = require("../utils/saveLogs");
const { tagModel, MainUserModel, OrderModel } = require("../models");

require("dotenv").config();

const getTagInfo = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    let responseData = [];
    const tag = await tagModel.findOne({ mainUser: req.user.id });
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    const tagFile = tag.file.trim();

    if (tagFile !== "") {
      const videoToken = generateToken(req.user.id, "tag", tag._id, "video");

      const secureUrl = `${process.env.SERVER_URL}/api/v1/tag/stream/${videoToken}`;
      const downloadUrl = `${process.env.SERVER_URL}/api/v1/tag/download/${videoToken}`;
      const videoBlob = {
        ...tag._doc,
        file: secureUrl,
        downloadUrl,
      };
  
      responseData.push(videoBlob);
    }
    
    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTag = async (req, res) => {
  const orderData = req.body;

  try {
    const existingTag = await tagModel.findOne({
      mainUser: req.user.id,
    });
    if (existingTag) {
      return res.status(400).json({ message: "Tag already exists" });
    }

    //create new order

    const newOrder = new OrderModel({
      userAccount: req.user.id,
      orderDate: new Date(),
      firstName: orderData.firstName,
      lastName: orderData.lastName,
      phone: orderData.phone,
      color: orderData.color,
      shippingAddress: orderData.shippingAddress,
    });

    // Validate schema
    let validationError = newOrder.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    await newOrder.save();

    // create new tag
    const newTag = new tagModel({
      activated: true,
      mainUser: req.user.id,
    });

    // Validate schema
    validationError = newTag.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    await newTag.save();

    // Find the main user and update the tag ID
    mainUser = await MainUserModel.findOneAndUpdate(
      { _id: req.user.id },
      { $set: { tag: newTag._id } },
      { new: true }
    );

    res.status(201).json({ message: "Tag created successfully" });

    BarcodeEmailer({
      user: { fullName: mainUser.fullname, id: req.user.id },
      order: { invoiceNumber: newOrder.invoiceNumber, colour: newOrder.color, },
      shippingAddress: newOrder.shippingAddress,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating tag:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

async function uploadMedia(req, res) {
  try {
    const { tagId, type, title, description, recordedDate } = req.body;
    const UserId = req.user.id;

    // Validate type
    if (type !== "image" && type !== "video") {
      return res.status(400).json({ message: "Invalid media type" });
    }

    // Find the user
    const User = await MainUserModel.findById(UserId);
    if (!User) {
      return res.status(404).json({ message: "User not found" });
    }

    // Handle file upload
    let fileUrl = req?.file?.location;
    if (!fileUrl) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Check and prepend https if not present
    if (!fileUrl.startsWith("https://")) {
      fileUrl = "https://" + fileUrl;
    }

    // Create a new media entry based on the type
    const tag = await tagModel.findOneAndUpdate(
      { _id: tagId },
      { $set: { title, description, recordedDate, file: fileUrl } },
      { new: true }
    );

    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    res.status(201).json({
      message: `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } uploaded successfully`,
      tag,
    });
  } catch (err) {
    await saveErrorLogs(err, "TagController uploadMedia");
    console.error("Error uploading media:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function editMedia(req, res) {
  try {
    const { tagId, type, title, description, recordedDate } = req.body;

    // Validate type
    if (type !== "image" && type !== "video") {
      return res.status(400).json({ message: "Invalid media type" });
    }

    // Find the Tag
    const tag = await tagModel.findById(tagId);
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    // Check if the requesting user is authorized to edit media
    if (tag.mainUser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to perform this action",
      });
    }

    // Update media details
    if (title) tag.title = title;
    if (description) tag.description = description;
    if (recordedDate) tag.recordedDate = recordedDate;

    // Handle file upload if a new file is provided
    let fileUrl = req?.file?.location;
    if (fileUrl) {
      if (!fileUrl.startsWith("https://")) {
        fileUrl = "https://" + fileUrl;
      }
      tag.file = fileUrl;
    }

    // Save the updated media
    await tag.save();

    res.status(200).json({
      message: `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } updated successfully`,
      tag,
    });
  } catch (err) {
    await saveErrorLogs(err, "TagController editMedia");
    console.error("Error updating media:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Delete Media
async function deleteMedia(req, res) {
  try {
    const { tagId, type } = req.body;

    // Validate type
    if (type !== "image" && type !== "video") {
      return res.status(400).json({ message: "Invalid media type" });
    }

    // Find the Tag
    const tag = await tagModel.findById(tagId);
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    // Check if the requesting user is authorized to delete media
    if (tag.mainUser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to perform this action",
      });
    }

    const mediaKey = tag.file;
    const key = mediaKey.split("/").pop();
    console.log(key);

    deleteFileFromDO("forever-messages-dev-01", key, async (error) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
      }

      tag.title = "";
      tag.description = "";
      tag.recordedDate = "";
      tag.file = "";
      await tag.save();

      res.status(200).json({
        message: `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } deleted successfully`,
      });
    });
  } catch (err) {
    await saveErrorLogs(err, "TagController deleteMedia");
    console.error("Error deleting media:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

const getStreamVideo = async (req, res) => {
  console.log("--------------Streaming Media-----------------------------");
  // Error handler for streaming process
  const handleStreamError = (err, message) => {
    res.status(500).send(message || "Error streaming media");
  };

  try {
    // Validate referrer Shefer
    /* if (req.headers.referer !== `${process.env.CLIENT_URL}/`) {
      return res.redirect(`${process.env.CLIENT_URL}/404`);
    } */

    // Validate token
    const { token } = req.params;
    if (!token) return res.redirect(`${process.env.CLIENT_URL}/404`);

    // Decrypt token
    const data = decryptToken(token);
    if (!data || !data.user) throw new Error("Invalid token data");

    
    console.log(data);
    const media = await tagModel.findById(data.user.videoId);
    if (!media) throw new Error("Media not found");

    // Set up request options
    const requestOptions = {
      url: media.file,
      method: "GET",
      responseType: "stream",
      headers: {},
    };

    // Support range requests if present
    const range = req.headers.range;
    if (range) {
      requestOptions.headers["Range"] = range;
    }

    // Stream media from external server
    const response = await axios(requestOptions);

    // Detect Safari browser (including iPhone)
    const isSafari =
      /Safari/.test(req.headers["user-agent"]) &&
      !/Chrome/.test(req.headers["user-agent"]);
    const isIphoneSafari = /iPhone/.test(req.headers["user-agent"]) && isSafari;

    // Set headers based on browser type
    const headers = {
      "Content-Type": response.headers["content-type"],
    };
    if (range) {
      headers["Accept-Ranges"] = "bytes";
      headers["Content-Range"] = response.headers["content-range"];
    }
    if (isSafari || isIphoneSafari) {
      headers["Content-Length"] = response.headers["content-length"];
    }

    // Set the headers in the response
    res.set(headers);

    // Pipe the response data stream to the client
    response.data.pipe(res);

    // Handle errors in the data stream
    response.data.on("error", (err) =>
      handleStreamError(err, "Error streaming media")
    );

    // End the response when the stream finishes
    response.data.on("end", () => res.end());
  } catch (error) {
    // Log and respond with the error
    console.error("Error in getStreamVideo:", error);
    await saveErrorLogs(error, "MediaController getStreamVideo");
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTagInfo,
  createTag,
  uploadMedia,
  editMedia,
  deleteMedia,
  getStreamVideo,
};
