let addLpTransactionHistory = JSON.parse(localStorage.getItem('addLpTransactionHistory')) || [];
let addLpNotificationState = JSON.parse(localStorage.getItem('addLpNotificationState')) || {
  lastViewedTimestamp: 0,
  viewedTransactionIds: []
};

if (Array.isArray(addLpNotificationState.viewedTransactionIds)) {
  addLpNotificationState.viewedTransactionIds = new Set(addLpNotificationState.viewedTransactionIds);
} else if (!addLpNotificationState.viewedTransactionIds) {
  addLpNotificationState.viewedTransactionIds = new Set();
}

function addLpTransactionToHistory(tokenA, tokenB, amountA, amountB, txHash, status, dexName) {
  const transaction = {
    id: Date.now(),
    tokenA: {
      symbol: tokenA.symbol,
      logo: tokenA.logo || window.unknownLogo,
      amount: formatAmount(amountA)
    },
    tokenB: {
      symbol: tokenB.symbol,
      logo: tokenB.logo || window.unknownLogo,
      amount: formatAmount(amountB)
    },
    txHash: txHash,
    status: status,
    dexName: dexName,
    timestamp: new Date().toISOString()
  };

  addLpTransactionHistory.unshift(transaction);
  if (addLpTransactionHistory.length > 50) {
    addLpTransactionHistory = addLpTransactionHistory.slice(0, 50);
  }

  localStorage.setItem('addLpTransactionHistory', JSON.stringify(addLpTransactionHistory));
  updateAddLpNotificationBadge();
}

function updateAddLpNotificationBadge() {
  const badge = document.getElementById("addLpNotificationBadge");
  if (badge) {
    const unreadCount = getAddLpUnreadNotificationCount();
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}

function getAddLpUnreadNotificationCount() {
  return addLpTransactionHistory.filter(tx => 
    !addLpNotificationState.viewedTransactionIds.has(tx.id)
  ).length;
}

function markAddLpNotificationsAsRead() {
  addLpTransactionHistory.forEach(tx => {
    addLpNotificationState.viewedTransactionIds.add(tx.id);
  });

  addLpNotificationState.lastViewedTimestamp = Date.now();
  localStorage.setItem('addLpNotificationState', JSON.stringify({
    lastViewedTimestamp: addLpNotificationState.lastViewedTimestamp,
    viewedTransactionIds: Array.from(addLpNotificationState.viewedTransactionIds)
  }));

  updateAddLpNotificationBadge();
}

function updateAddLpTransactionList() {
  const transactionList = document.getElementById("addLpTransactionList");
  const clearButton = document.getElementById("clearAddLpNotifications");

  if (!transactionList) return;

  if (addLpTransactionHistory.length === 0) {
    transactionList.innerHTML = '<div class="no-transactions"><p>No transactions yet</p></div>';
    if (clearButton) clearButton.style.display = "none";
    return;
  }

  if (clearButton) clearButton.style.display = "block";

  transactionList.innerHTML = addLpTransactionHistory.map(tx => {
    const date = new Date(tx.timestamp).toLocaleString();
    return `
      <div class="transaction-item" onclick="openAddLpExplorer('${tx.txHash}')">
        <div class="transaction-header">
          <div class="transaction-tokens">
            <img src="${tx.tokenA.logo}" alt="${tx.tokenA.symbol}" />
            <span>${tx.tokenA.amount} ${tx.tokenA.symbol}</span>
            <span class="transaction-arrow">+</span>
            <img src="${tx.tokenB.logo}" alt="${tx.tokenB.symbol}" />
            <span>${tx.tokenB.amount} ${tx.tokenB.symbol}</span>
          </div>
          <div class="transaction-status ${tx.status}">${tx.status === 'confirmed' ? 'Confirmed' : 'Failed'}</div>
        </div>
        <div class="transaction-details">
          <span class="transaction-mode">${tx.dexName}</span>
          <span>${date}</span>
        </div>
      </div>
    `;
  }).join('');
}

function openAddLpExplorer(txHash) {
  window.open(`${NETWORK_CONFIG.CHAIN_EXPLORER}/tx/${txHash}`, '_blank');
}

function setupAddLpNotificationSystem() {
  const notificationButton = document.getElementById("addLpNotificationButton");
  const notificationModal = document.getElementById("addLpNotificationModal");
  const closeNotification = document.getElementById("closeAddLpNotification");
  const clearNotifications = document.getElementById("clearAddLpNotifications");

  if (notificationButton) {
    notificationButton.addEventListener("click", function() {
      notificationModal.style.display = "block";
      updateAddLpTransactionList();
      markAddLpNotificationsAsRead();
    });
  }

  if (closeNotification) {
    closeNotification.addEventListener("click", function() {
      notificationModal.style.display = "none";
    });
  }

  if (clearNotifications) {
    clearNotifications.addEventListener("click", function() {
      addLpTransactionHistory = [];
      addLpNotificationState.viewedTransactionIds = new Set();
      addLpNotificationState.lastViewedTimestamp = Date.now();
      localStorage.setItem('addLpTransactionHistory', JSON.stringify(addLpTransactionHistory));
      localStorage.setItem('addLpNotificationState', JSON.stringify({
        lastViewedTimestamp: addLpNotificationState.lastViewedTimestamp,
        viewedTransactionIds: []
      }));
      updateAddLpTransactionList();
      updateAddLpNotificationBadge();
    });
  }

  window.addEventListener("click", function(event) {
    if (event.target === notificationModal) {
      notificationModal.style.display = "none";
    }
  });

  updateAddLpNotificationBadge();
}

window.addLpTransactionToHistory = addLpTransactionToHistory;
window.updateAddLpNotificationBadge = updateAddLpNotificationBadge;
window.getAddLpUnreadNotificationCount = getAddLpUnreadNotificationCount;
window.markAddLpNotificationsAsRead = markAddLpNotificationsAsRead;
window.updateAddLpTransactionList = updateAddLpTransactionList;
window.openAddLpExplorer = openAddLpExplorer;
window.setupAddLpNotificationSystem = setupAddLpNotificationSystem;
