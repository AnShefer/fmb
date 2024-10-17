const s3Client = require("../config/digitalOcean");

function deleteFileFromDO(bucketName, key, callback) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  s3Client.deleteObject(params, (error, data) => {
    console.log(data);
    if (error) {
      console.error("Error deleting file from Digital Ocean:", error);
      callback(new Error("Error deleting file from storage"));
    } else {
      callback(null, data);
    }
  });
}

module.exports = { deleteFileFromDO };
/**
 * 
 * https://forever-messages-dev-01.syd1.digitaloceanspaces.com/1724132113514-recorded-video.mp4
 * https://forever-messages-dev-01.syd1.digitaloceanspaces.com/1724132503094
 */