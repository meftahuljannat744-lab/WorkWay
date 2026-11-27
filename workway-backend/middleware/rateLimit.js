
const { rateLimit } = require("express-rate-limit");

// Login: 15 minutes, maximum 5 requests
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

// OTP: 10 minutes, maximum 5 requests
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

// Password reset: 15 minutes, maximum 10 requests
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset requests. Please try again later."
  }
});

module.exports = {
  loginLimiter,
  otpLimiter,
  passwordResetLimiter
};
