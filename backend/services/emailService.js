const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmailAlert = async ({
  to,
  subject,
  message,
}) => {
  try {
    await transporter.sendMail({
      from: `"BAAREAI Alert" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
        <h2>BAAREAI Crime Alert</h2>
        <p>${message}</p>
      `,
    });

    console.log("EMAIL SENT:", to);
  } catch (error) {
    console.error("EMAIL ERROR:", error.message);
  }
};

module.exports = {
  sendEmailAlert,
};