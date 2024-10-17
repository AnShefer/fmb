const sendEmail = require("../utils/nodeMailer");
const saveErrorLogs = require("../utils/saveLogs");
require("dotenv").config();

const contactUs = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const userConfirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dddddd; border-radius: 10px;">
        <img src="https://forever-messages-dev-01.syd1.cdn.digitaloceanspaces.com/Eamil%20Logo.png" alt="Forever Messages Logo" style="max-width: 100px;">
        <h2 style="color: #4CAF50;">Thank you for contacting us!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you shortly.</p>
        <p>Best regards,<br>Forever Messages</p>
        <p style="color: #ff0000;">Note: This is an automatically generated message. Please do not reply to this email.</p>
      </div>
    `;

    const userEmailResponse = await sendEmail({
      to: email,
      subject: "Confirmation of your message",
      html: userConfirmationHtml,
    });

    if (!userEmailResponse.success) {
      return res
        .status(400)
        .json({ message: "Please try with a valid email." });
    }

    const adminEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dddddd; border-radius: 10px;">
      <img src="https://forever-messages-dev-01.syd1.cdn.digitaloceanspaces.com/Eamil%20Logo.png" alt="Forever Messages Logo" style="max-width: 100px; margin-bottom: 20px;">
      <h2 style="color: #333;">New Contact Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong> ${message}</p>
    </div>
  `;

    const adminEmailResponse = await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "New Contact Message",
      html: adminEmailHtml,
    });

    if (!adminEmailResponse.success) {
      console.error("Failed to send admin email:", adminEmailResponse.error);
      return res.status(500).json({
        message:
          "Failed to send your message to admin. Please try again later.",
      });
    }

    res
      .status(200)
      .json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    await saveErrorLogs(error, "contactUs");
    console.error("Error sending email:", error);
    res.status(500).json({
      message: "Failed to send your message. Please try again later.",
    });
  }
};

module.exports = {
  contactUs,
};
