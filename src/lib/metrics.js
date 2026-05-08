const counters = {
  webhookInbound: 0,
  webhookSignatureRejected: 0,
  queueEnqueued: 0,
  queueProcessed: 0,
  queueFailed: 0,
  twilioSendSuccess: 0,
  twilioSendFailure: 0,
  claudeFailure: 0,
};

function increment(metric, value = 1) {
  if (!(metric in counters)) return;
  counters[metric] += value;
}

function snapshot() {
  return { ...counters };
}

module.exports = { increment, snapshot };
