function createNotification(message, type = "info", containerId = "notifications") {
  const notifications = document.getElementById(containerId);
  if (!notifications) {
    console.log(`${type.toUpperCase()}: ${message}`);
    return null;
  }

  const div = document.createElement("div");
  div.className = "notification " + type;
  
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

  return div;
}

function lpNotify(message, type = "info") {
  return createNotification(message, type, "lpNotifications");
}

function removeLpNotify(message, type = "info", forceShow = false) {
  const importantKeywords = [
    "approved", "approved successfully", "simulation successful", 
    "simulation failed", "transaction failed", "transaction sent:",
    "liquidity added successfully", "liquidity removed successfully",
    "view explorer", "confirmed", "failed"
  ];
  
  const shouldShow = forceShow || importantKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (!shouldShow) {
    console.log(`Filtered notification: ${message}`);
    return null;
  }
  
  return createNotification(message, type, "removeLpNotifications");
}

function globalNotify(message, type = "info") {
  return createNotification(message, type, "notifications");
}

window.createNotification = createNotification;
window.lpNotify = lpNotify;
window.removeLpNotify = removeLpNotify;
window.globalNotify = globalNotify;
