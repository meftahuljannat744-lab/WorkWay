
const { rateLimit } = require("express-rate-limit");

// Login: প্রতি IP থেকে ১৫ মিনিটে সর্বোচ্চ ৫টি request
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes."
  }
});

// OTP: 
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 10 minutes."
  }
});

module.exports = {
  loginLimiter,
  otpLimiter
};
