
const nodemailer = require("nodemailer");

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_APP_PASSWORD;

const isLocalDevelopment = process.env.NODE_ENV !== "production";

if (!emailUser || !emailPassword) {
  console.warn(
    "EMAIL CONFIG: Gmail credentials missing. Local development email mode enabled."
  );
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPassword
  }
});

const verifyEmailTransporter = async () => {
  if (!emailUser || !emailPassword) {
    console.warn("EMAIL SERVICE: Gmail is not configured.");
    return false;
  }

  try {
    await transporter.verify();
    console.log("EMAIL SERVICE: Gmail SMTP connection successful.");
    return true;
  } catch (error) {
    console.error("EMAIL SERVICE ERROR:", error.message);
    return false;
  }
};

// Send Email Verification OTP
const sendVerificationOtp = async (email, otp) => {
  if (!emailUser || !emailPassword) {
    if (isLocalDevelopment) {
      console.log("\n==================================");
      console.log("WORKWAY EMAIL VERIFICATION OTP:");
      console.log("Email:", email);
      console.log("OTP:", otp);
      console.log("Expires in: 5 minutes");
      console.log("==================================\n");

      return { messageId: "local-development-otp" };
    }

    throw new Error("Email service is not configured.");
  }

  try {
    return await transporter.sendMail({
      from: `"WorkWay" <${emailUser}>`,
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
  } catch (error) {
    console.error("OTP EMAIL ERROR:", error.message);
    throw error;
  }
};

// Send Password Reset Link
const sendPasswordResetLink = async (email, resetUrl) => {
  if (!emailUser || !emailPassword) {
    if (isLocalDevelopment) {
      console.log("\n==================================");
      console.log("WORKWAY PASSWORD RESET LINK:");
      console.log(resetUrl);
      console.log("==================================\n");

      return { messageId: "local-development-reset" };
    }

    throw new Error("Email service is not configured.");
  }

  try {
    return await transporter.sendMail({
      from: `"WorkWay" <${emailUser}>`,
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
  } catch (error) {
    console.error("PASSWORD RESET EMAIL ERROR:", error.message);
    throw error;
  }
};

module.exports = {
  sendVerificationOtp,
  sendPasswordResetLink,
  verifyEmailTransporter
};
