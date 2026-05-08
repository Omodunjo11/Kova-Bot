const { info, error } = require("../lib/logger");
const { increment } = require("../lib/metrics");

const queue = [];
let processing = false;

async function processQueue(worker) {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift();
    try {
      await worker(item.payload);
      increment("queueProcessed");
    } catch (err) {
      increment("queueFailed");
      error("queue_job_failed", {
        requestId: item.requestId,
        error: err.message,
      });
    }
  }

  processing = false;
}

function enqueue(payload, worker) {
  const requestId = payload.requestId;
  queue.push({ requestId, payload });
  increment("queueEnqueued");
  info("queue_job_enqueued", { requestId, pending: queue.length });
  void processQueue(worker);
}

function getQueueDepth() {
  return queue.length + (processing ? 1 : 0);
}

module.exports = { enqueue, getQueueDepth };
