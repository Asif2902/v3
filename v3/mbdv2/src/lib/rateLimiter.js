class RateLimiter {
  constructor(maxCallsPerSecond) {
    this.maxCallsPerSecond = maxCallsPerSecond;
    this.queue = [];
    this.interval = 1000 / maxCallsPerSecond;
    this.timer = setInterval(() => this.processQueue(), this.interval);
  }

  processQueue() {
    if (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();
      fn().then(resolve).catch(reject);
    }
  }

  schedule(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
    });
  }
}

window.RateLimiter = RateLimiter;
window.globalRpcRateLimiter = new RateLimiter(1000);

function rateLimitedCall(fn, ...args) {
  return window.globalRpcRateLimiter.schedule(() => fn(...args));
}

function debounce(func, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

window.rateLimitedCall = rateLimitedCall;
window.debounce = debounce;
