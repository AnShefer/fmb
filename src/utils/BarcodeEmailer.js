const jwt = require("jsonwebtoken");
const bwipjs = require("bwip-js");
const fs = require('fs').promises;
const sharp = require("sharp");
const sendEmail = require("../utils/nodeMailer");
const saveErrorLogs = require("../utils/saveLogs");

require("dotenv").config();

const generateBarcode = (data, options = {}) => {
  const payload = {
    user: { id: data.user.id, type: "video" },
  };

  const qrToken = jwt.sign(payload, process.env.JWT_SECRET_QR);
  const urlData = `${process.env.CLIENT_URL}/tag-video-records/?token=${qrToken}`;

  return new Promise((resolve, reject) => {
    const defaultOptions = {
      bcid: "qrcode", 
      text: urlData, 
      scale: 3, 
      height: 150,
      width: 150,
      /* backgroundcolor: "ffffff", */
      barcolor: "1236ca",
      includetext: false,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    bwipjs.toBuffer(mergedOptions, (err, png) => {
      if (err) {
        reject(err);
      } else {
        resolve(png);
      }
    });
  });
};

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Функция для наложения QR-кода на фоновое изображение
async function overlayQRCode(backgroundPath, qrCodeBuffer, outputPath) {

  if (!(await fileExists(backgroundPath))) {
    throw new Error(`Background image not found: ${backgroundPath}`);
  }

  const background = sharp(backgroundPath);
  const metadata = await background.metadata();
  const qrCode = sharp(qrCodeBuffer).resize(150, 150);

  // Позиционирование QR-кода (в данном случае по центру)
  const x = Math.floor((metadata.width - 150) / 2-2);
  const y = Math.floor(138);

  await background
  .composite([{ input: await qrCode.toBuffer(), top: y, left: x }])
  .toFile(outputPath);
}; 

const sendQRCode = async (Data, imagePath) => {
  try {
   
    const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dddddd; border-radius: 10px;">
                <img src="https://forever-messages-dev-01.syd1.cdn.digitaloceanspaces.com/Eamil%20Logo.png" alt="Forever Messages Logo" style="max-width: 100px;">
                <h2 style="color: black;">TAG Order # ${Data.order.invoiceNumber}</h2>
                <h3> Shipping address </h3>
                <p style="color: black;">${Data.user.fullName}</p>
                <p style="color: black;">${Data.shippingAddress.streetAddress}</p>
                <p style="color: black;">${Data.shippingAddress.suburb} ${Data.shippingAddress.state} ${Data.shippingAddress.postcode}</p>
                <p style="color: black;">Australia</p>
              </div>
            `;
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "New TAG order",
      html: emailHtml,
      attachments: [
        {
          filename: "qr_code.png",
          path: imagePath
        }
      ]
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending email with barcode:', error);
    throw error;
  }
};

const BarcodeEmailer = async (Data) => {
  
  try {
    const qrCode = await generateBarcode(Data);
    const backgroundPath = 'src/utils/emailTemplate/qr-bg.png';
    const outputPath = `src/utils/emailTemplate/qr-${Data.user.id}.png`;

    fs.readFile(backgroundPath, (err, data) => {
      if (err) throw err;
      console.log(data);  // Убедись, что файл читается
    });


    await overlayQRCode(backgroundPath, qrCode, outputPath);

    sendQRCode(Data, outputPath );
  } catch (error) {
    await saveErrorLogs(error, "BarcodeEmailer");
    console.error("Error creare QR :", error);
    throw error;
  }
};

module.exports = BarcodeEmailer;
