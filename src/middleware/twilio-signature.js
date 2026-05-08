const twilio = require("twilio");
const { publicBaseUrl, twilioAuthToken, twilioSignatureValidationEnabled } = require("../config/env");
const { increment } = require("../lib/metrics");

function validateTwilioSignature(req, res, next) {
  if (!twilioSignatureValidationEnabled) return next();

  const signature = req.header("x-twilio-signature");
  if (!signature) {
    increment("webhookSignatureRejected");
    return res.status(403).json({ error: "Missing Twilio signature header." });
  }

  const url = new URL(req.originalUrl, publicBaseUrl).toString();
  const isValid = twilio.validateRequest(twilioAuthToken, signature, url, req.body);
  if (!isValid) {
    increment("webhookSignatureRejected");
    return res.status(403).json({ error: "Invalid Twilio signature." });
  }

  return next();
}

module.exports = { validateTwilioSignature };
