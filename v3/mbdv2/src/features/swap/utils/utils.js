function debounce(func, delay) {
  let timer;
  let isTyping = false;

  return function (...args) {
    isTyping = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (isTyping) {
        isTyping = false;
        func.apply(this, args);
      }
    }, delay);
  };
}

function getCacheKey(params) {
  return JSON.stringify(params);
}

function notify(message, type = "info") {
  const notifications = document.getElementById("notifications");
  const div = document.createElement("div");
  div.className = `notification ${type}`;

  const messageSpan = document.createElement("span");
  messageSpan.className = "notification-message";
  messageSpan.innerHTML = message;

  const closeBtn = document.createElement("span");
  closeBtn.className = "notification-close";
  closeBtn.innerHTML = "×";
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    div.classList.add('hide');
    setTimeout(() => div.remove(), 300);
  };

  div.appendChild(messageSpan);
  div.appendChild(closeBtn);
  notifications.appendChild(div);

  setTimeout(() => { 
    div.classList.add('hide');
    setTimeout(() => div.remove(), 300);
  }, 6000);
}

function formatAddress(addr) {
  return addr.substring(0, 6) + '***' + addr.substring(addr.length - 4);
}
