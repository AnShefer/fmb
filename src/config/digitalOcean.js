
const { S3 } =require("@aws-sdk/client-s3")

require("dotenv").config();

const s3Client = new S3({
  endpoint: "https://syd1.digitaloceanspaces.com",
  forcePathStyle: false,
  region: "syd1",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

module.exports = s3Client;
