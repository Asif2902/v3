let transactionHistory = JSON.parse(localStorage.getItem('transactionHistory')) || [];
let notificationState = JSON.parse(localStorage.getItem('notificationState')) || {
  lastViewedTimestamp: 0,
  viewedTransactionIds: []
};

if (Array.isArray(notificationState.viewedTransactionIds)) {
  notificationState.viewedTransactionIds = new Set(notificationState.viewedTransactionIds);
} else if (!notificationState.viewedTransactionIds) {
  notificationState.viewedTransactionIds = new Set();
}

function setupNotificationSystem() {
  const notificationButton = document.getElementById("notificationButton");
  const notificationModal = document.getElementById("notificationModal");
  const closeNotification = document.getElementById("closeNotification");
  const clearNotifications = document.getElementById("clearNotifications");

  if (notificationButton) {
    notificationButton.addEventListener("click", function() {
      notificationModal.style.display = "block";
      updateTransactionList();
      markNotificationsAsRead();
    });
  }

  if (closeNotification) {
    closeNotification.addEventListener("click", function() {
      notificationModal.style.display = "none";
    });
  }

  if (clearNotifications) {
    clearNotifications.addEventListener("click", function() {
      transactionHistory = [];
      notificationState.viewedTransactionIds = new Set();
      notificationState.lastViewedTimestamp = Date.now();
      localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));
      localStorage.setItem('notificationState', JSON.stringify({
        lastViewedTimestamp: notificationState.lastViewedTimestamp,
        viewedTransactionIds: Array.from(notificationState.viewedTransactionIds)
      }));
      updateTransactionList();
      updateNotificationBadge();
    });
  }

  window.addEventListener("click", function(event) {
    if (event.target === notificationModal) {
      notificationModal.style.display = "none";
    }
  });

  updateNotificationBadge();
}

function addTransactionToHistory(fromToken, toToken, fromAmount, toAmount, txHash, status, mode) {
  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return num.toFixed(4).replace(/\.?0+$/, '');
  };

  const transaction = {
    id: Date.now(),
    fromToken: {
      symbol: fromToken.symbol,
      logo: fromToken.logo || "https://monbridgedex.xyz/unknown.png",
      amount: formatAmount(fromAmount)
    },
    toToken: {
      symbol: toToken.symbol,
      logo: toToken.logo || "https://monbridgedex.xyz/unknown.png", 
      amount: formatAmount(toAmount)
    },
    txHash: txHash,
    status: status,
    mode: mode,
    timestamp: new Date().toISOString()
  };

  transactionHistory.unshift(transaction);
  if (transactionHistory.length > 50) {
    transactionHistory = transactionHistory.slice(0, 50);
  }

  localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));

  updateNotificationBadge();
}

function updateNotificationBadge() {
  const badge = document.getElementById("notificationBadge");
  if (badge) {
    const unreadCount = getUnreadNotificationCount();
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}

function getUnreadNotificationCount() {
  return transactionHistory.filter(tx => 
    !notificationState.viewedTransactionIds.has(tx.id)
  ).length;
}

function markNotificationsAsRead() {
  transactionHistory.forEach(tx => {
    notificationState.viewedTransactionIds.add(tx.id);
  });

  notificationState.lastViewedTimestamp = Date.now();
  localStorage.setItem('notificationState', JSON.stringify({
    lastViewedTimestamp: notificationState.lastViewedTimestamp,
    viewedTransactionIds: Array.from(notificationState.viewedTransactionIds)
  }));

  updateNotificationBadge();
}

function clearNotificationBadge() {
  markNotificationsAsRead();
}

function updateTransactionList() {
  const transactionList = document.getElementById("transactionList");
  const clearButton = document.getElementById("clearNotifications");

  if (!transactionList) return;

  if (transactionHistory.length === 0) {
    transactionList.innerHTML = '<div class="no-transactions"><p>No transactions yet</p></div>';
    if (clearButton) clearButton.style.display = "none";
    return;
  }

  if (clearButton) clearButton.style.display = "block";

  transactionList.innerHTML = transactionHistory.map(tx => {
    const date = new Date(tx.timestamp).toLocaleString();
    return `
      <div class="transaction-item" onclick="openExplorer('${tx.txHash}')">
        <div class="transaction-header">
          <div class="transaction-tokens">
            <img src="${tx.fromToken.logo}" alt="${tx.fromToken.symbol}" />
            <span>${tx.fromToken.amount} ${tx.fromToken.symbol}</span>
            <span class="transaction-arrow">→</span>
            <img src="${tx.toToken.logo}" alt="${tx.toToken.symbol}" />
            <span>${tx.toToken.amount} ${tx.toToken.symbol}</span>
          </div>
          <div class="transaction-status ${tx.status}">${tx.status === 'confirmed' ? 'Confirmed' : 'Failed'}</div>
        </div>
        <div class="transaction-details">
          <span class="transaction-mode">${tx.mode}</span>
          <span>${date}</span>
        </div>
      </div>
    `;
  }).join('');
}

function openExplorer(txHash) {
  window.open(`${CHAIN_EXPLORER}/tx/${txHash}`, '_blank');
}
