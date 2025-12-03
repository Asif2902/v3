class RateLimiter {
  constructor(maxCallsPerSecond) {
    this.maxCallsPerSecond = maxCallsPerSecond;
    this.queue = [];
    this.interval = 1000 / maxCallsPerSecond;
    this.timer = setInterval(() => this.processQueue(), this.interval);
    this.failureCount = 0;
    this.circuitOpen = false;
    this.lastFailureTime = 0;
    this.circuitTimeout = 30000;
  }

  processQueue() {
    if (this.queue.length > 0 && !this.circuitOpen) {
      const { fn, resolve, reject, retryCount = 0 } = this.queue.shift();
      fn().then(result => {
        this.failureCount = 0;
        this.circuitOpen = false;
        resolve(result);
      }).catch(error => {
        this.failureCount++;
        if (this.failureCount >= 3) {
          this.circuitOpen = true;
          this.lastFailureTime = Date.now();
        }

        if (retryCount < 2 && this.shouldRetry(error)) {
          setTimeout(() => {
            this.queue.unshift({ fn, resolve, reject, retryCount: retryCount + 1 });
          }, 1000 * (retryCount + 1));
        } else {
          reject(error);
        }
      });
    } else if (this.circuitOpen && Date.now() - this.lastFailureTime > this.circuitTimeout) {
      this.circuitOpen = false;
      this.failureCount = 0;
    }
  }

  shouldRetry(error) {
    return error.message.includes('timeout') || 
           error.message.includes('network') ||
           error.message.includes('502') ||
           error.message.includes('503') ||
           error.message.includes('rate limit');
  }

  schedule(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
    });
  }
}

const rpcRateLimiter = new RateLimiter(10);

function rateLimitedCall(fn, ...args) {
  return rpcRateLimiter.schedule(() => fn(...args));
}
