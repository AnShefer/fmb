const {
  ImageModel,
  VideoModel,
  SubUserModel,
  MainUserModel,
} = require("../models");
const { deleteFileFromDO } = require("../utils/DeleteFiles");
const axios = require("axios");
const {
  generateToken,
  decryptToken,
} = require("../utils/generate-video-token");
const fs = require("fs");
const s3Client = require("../config/digitalOcean");
const generatePresignedUrl = require("../utils/DownloadFiles");
const saveErrorLogs = require("../utils/saveLogs");

async function getFileAsBlob(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });

  return Buffer.from(response.data, "binary").toString("base64");
}

async function uploadMedia(req, res) {
  try {
    const { subUserId, type, title, description, recordedDate } = req.body;

    // Validate type
    if (type !== "image" && type !== "video") {
      return res.status(400).json({ message: "Invalid media type" });
    }

    // Find the subuser
    const subUser = await SubUserModel.findById(subUserId);
    if (!subUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (subUser.mainUser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to perform this action",
      });
    }

    // Check for duplicate title within the user's media across both images and videos
    const existingImage = await ImageModel.findOne({
      subUser: subUserId,
      title,
    });

    const existingVideo = await VideoModel.findOne({
      subUser: subUserId,
      title,
    });

    if (existingImage || existingVideo) {
      return res.status(400).json({
        message: `Media with this title already exists. Please choose a different title.`,
      });
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
    let media;
    if (type === "image") {
      media = new ImageModel({
        title,
        description,
        recordedDate,
        file: fileUrl,
        subUser: subUser._id,
      });
    } else if (type === "video") {
      media = new VideoModel({
        title,
        description,
        recordedDate,
        file: fileUrl,
        subUser: subUser._id,
      });
    }

    // Save the media
    await media.save();

    // Update the subuser with the new media
    if (type === "image") {
      subUser.images.push(media._id);
    } else if (type === "video") {
      subUser.videos.push(media._id);
    }
    await subUser.save();

    res.status(201).json({
      message: `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } uploaded successfully`,
      media,
    });
  } catch (err) {
    await saveErrorLogs(err, "MediaController uploadMedia");
    console.error("Error uploading media:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function editMedia(req, res) {
  try {
    const { subUserId, type, mediaId, title, description, recordedDate } =
      req.body;

    // Validate type
    if (type !== "image" && type !== "video") {
      return res.status(400).json({ message: "Invalid media type" });
    }

    // Find the subuser
    const subUser = await SubUserModel.findById(subUserId);
    if (!subUser) {
      return res.status(404).json({ message: "SubUser not found" });
    }

    // Check if the requesting user is authorized to edit media
    if (subUser.mainUser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to perform this action",
      });
    }

    // Find the media
    let media;
    if (type === "image") {
      media = await ImageModel.findById(mediaId);
    } else if (type === "video") {
      media = await VideoModel.findById(mediaId);
    }

    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }

    // Check for duplicate title within the user's media if the title is being updated
    if (title && title !== media.title) {
      const existingImage = await ImageModel.findOne({
        subUser: subUserId,
        title,
        _id: { $ne: mediaId }, // Exclude the current media item
      });

      const existingVideo = await VideoModel.findOne({
        subUser: subUserId,
        title,
        _id: { $ne: mediaId }, // Exclude the current media item
      });

      if (existingImage || existingVideo) {
        return res.status(400).json({
          message: `Media with this title already exists. Please choose a different title.`,
        });
      }
    }

    // Update media details
    if (title) media.title = title;
    if (description) media.description = description;
    if (recordedDate) media.recordedDate = recordedDate;

    // Handle file upload if a new file is provided
    let fileUrl = req?.file?.location;
    if (fileUrl) {
      if (!fileUrl.startsWith("https://")) {
        fileUrl = "https://" + fileUrl;
      }
      media.file = fileUrl;
    }

    // Save the updated media
    await media.save();

    res.status(200).json({
      message: `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } updated successfully`,
      media,
    });
  } catch (err) {
    await saveErrorLogs(err, "MediaController editMedia");
    console.error("Error updating media:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getMedia(req, res) {
  try {
    const { subUserId } = req.params;

    // Find the subuser
    const subUser = await SubUserModel.findById(subUserId)
      .populate("images")
      .sort({ createdAt: -1 })
      .populate("videos")
      .sort({ createdAt: -1 });
    if (!subUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the requesting user is authorized to view media
    if (subUser.mainUser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to perform this action",
      });
    }

    // Get images and videos
    const images = await ImageModel.find({ subUser: subUserId }).sort({
      createdAt: -1,
    });
    const videos = await VideoModel.find({ subUser: subUserId }).sort({
      createdAt: -1,
    });

    const imageBlobs = await Promise.all(
      images.map(async (image) => {
        // const blob = await getFileAsBlob(image.file);
        const videoToken = await generateToken(
          subUser._id,
          subUser.usertype,
          image._id,
          "image"
        );
        const secure_url = `${process.env.SERVER_URL}/api/v1/media/stream/${videoToken}`;
        const download_url = `${process.env.SERVER_URL}/api/v1/media/download/${videoToken}`;
        return {
          ...image._doc,

          file: secure_url,
          download_url,
          // fileBlob: blob, // Add the blob as a new field
        };
      })
    );

    const videoBlobs = await Promise.all(
      videos.map(async (video) => {
        // const blob = await getFileAsBlob(video.file);
        const videoToken = await generateToken(
          subUser._id,
          subUser.usertype,
          video._id,
          "video"
        );
        const secure_url = `${process.env.SERVER_URL}/api/v1/media/stream/${videoToken}`;
        const download_url = `${process.env.SERVER_URL}/api/v1/media/download/${videoToken}`;
        return {
          ...video._doc, // Include other fields in the document

          file: secure_url,
          download_url: download_url,
          // fileBlob: blob, // Add the blob as a new field
        };
      })
    );

    res.status(200).json({
      images: imageBlobs,
      videos: videoBlobs,
    });
  } catch (err) {
    await saveErrorLogs(err, "MediaController getMedia");
    console.error("Error retrieving media:", err);
    res.status(500).json({ message: err.message });
  }
}

// Delete Media
async function deleteMedia(req, res) {
  try {
    const { subUserId, mediaId, type } = req.body;

    // Validate type
    if (type !== "image" && type !== "video") {
      return res.status(400).json({ message: "Invalid media type" });
    }

    // Find the subuser
    const subUser = await SubUserModel.findById(subUserId);
    if (!subUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the requesting user is authorized to delete media
    if (subUser.mainUser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to perform this action",
      });
    }

    // Find the media
    let media;
    if (type === "image") {
      media = await ImageModel.findById(mediaId);
      if (!media) {
        return res.status(404).json({ message: "Image not found" });
      }
    } else if (type === "video") {
      media = await VideoModel.findById(mediaId);
      if (!media) {
        return res.status(404).json({ message: "Video not found" });
      }
    }

    const mediaKey = media.file;
    const key = mediaKey.split("/").pop();
    console.log(key);

    deleteFileFromDO("forever-messages-dev-01", key, async (error) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
      }

      if (type === "image") {
        subUser.images.pull(mediaId);
      } else if (type === "video") {
        subUser.videos.pull(mediaId);
      }

      await media.deleteOne();

      await subUser.save();

      res.status(200).json({
        message: `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } deleted successfully`,
      });
    });
  } catch (err) {
    await saveErrorLogs(err, "MediaController deleteMedia");
    console.error("Error deleting media:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
const getStreamVideo = async (req, res) => {
 
  // Error handler for streaming process
  const handleStreamError = (err, message) => {
    
    res.status(500).send(message || "Error streaming media");
  };

  try {
    // Validate referrer Shefer
   /*  if (req.headers.referer !== `${process.env.CLIENT_URL}/`) {
      return res.redirect(`${process.env.CLIENT_URL}/404`);
    } */

    // Validate token
    const { token } = req.params;
    if (!token) return res.redirect(`${process.env.CLIENT_URL}/404`);

    // Decrypt token
    const data = decryptToken(token);
    if (!data || !data.user) throw new Error("Invalid token data");

    // Fetch media based on type
    const mediaModel = data.user.type === "image" ? ImageModel : VideoModel;
    const media = await mediaModel.findById(data.user.videoId);
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

const downloadVideo = async (req, res) => {
  const token = req.params.token;
  const data = decryptToken(token);
  const type = data.user.type;
  let mediaKey = null;

  try {
    // Fetch the media based on type
    if (type === "image") {
      const image = await ImageModel.findById(data.user.videoId);
      mediaKey = image.file;
    } else if (type === "video") {
      const video = await VideoModel.findById(data.user.videoId);
      mediaKey = video.file;
    } else {
      return res.status(400).send("Invalid media type");
    }
    const createKeyFromURL = mediaKey.split("/").pop();
    const key = createKeyFromURL;
    const signedURL = await generatePresignedUrl(
      "forever-messages-dev-01",
      key
    );
    res.status(200).json({ signedURL });
  } catch (error) {
    await saveErrorLogs(error, "MediaController downloadVideo");
    console.error("Error fetching file:", error);
    res.status(500).send("Error fetching file");
  }
};
module.exports = {
  uploadMedia,
  editMedia,
  getMedia,
  deleteMedia,
  getStreamVideo,
  downloadVideo,
};
