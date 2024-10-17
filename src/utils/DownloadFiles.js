const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3Client = require("../config/digitalOcean");
async function generatePresignedUrl(bucketName, objectKey) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL valid for 1 hour
    console.log("Pre-signed URL:", url);
    return url;
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
  }
}
module.exports = generatePresignedUrl;
