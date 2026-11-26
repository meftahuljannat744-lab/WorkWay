
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

const sendVerificationOtp = async (email, otp) => {
  return await transporter.sendMail({
    from: `"WorkWay" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "WorkWay - Email Verification OTP",
    text: `Your WorkWay verification OTP is ${otp}. It will expire in 5 minutes. Do not share this OTP with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2 style="color: #8B6248;">Welcome to WorkWay!</h2>
        <p>Your email verification OTP is:</p>
        <h1 style="letter-spacing: 6px;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
        <p>Please do not share this code with anyone.</p>
      </div>
    `
  });
};

const sendPasswordResetLink = async (email, resetUrl) => {
  return transporter.sendMail({
    from: `"WorkWay" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "WorkWay - Reset your password",
    text: `Use this link to reset your WorkWay password. It expires in 30 minutes: ${resetUrl}\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2 style="color: #8B6248;">Reset your WorkWay password</h2>
        <p>This link expires in 30 minutes.</p>
        <p><a href="${resetUrl}">Choose a new password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `
  });
};

module.exports = { sendVerificationOtp, sendPasswordResetLink };
