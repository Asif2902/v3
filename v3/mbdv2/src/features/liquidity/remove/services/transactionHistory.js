function addRemoveLpTransactionToHistory(tokenA, tokenB, lpAmount, amountA, amountB, txHash, status, dexName) {
  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return num.toFixed(4).replace(/\.?0+$/, '');
  };

  const transaction = {
    id: Date.now(),
    tokenA: {
      symbol: tokenA.symbol,
      logo: tokenA.logo || "https://monbridgedex.xyz/unknown.png",
      amount: formatAmount(amountA)
    },
    tokenB: {
      symbol: tokenB.symbol,
      logo: tokenB.logo || "https://monbridgedex.xyz/unknown.png",
      amount: formatAmount(amountB)
    },
    lpAmount: formatAmount(lpAmount),
    txHash: txHash,
    status: status,
    dexName: dexName,
    timestamp: new Date().toISOString()
  };

  removeLpTransactionHistory.unshift(transaction);
  if (removeLpTransactionHistory.length > 50) {
    removeLpTransactionHistory = removeLpTransactionHistory.slice(0, 50);
  }

  localStorage.setItem('removeLpTransactionHistory', JSON.stringify(removeLpTransactionHistory));
  updateRemoveLpNotificationBadge();
}

function updateRemoveLpNotificationBadge() {
  const badge = document.getElementById("removeLpNotificationBadge");
  if (badge) {
    const unreadCount = getRemoveLpUnreadNotificationCount();
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}

function getRemoveLpUnreadNotificationCount() {
  return removeLpTransactionHistory.filter(tx => 
    !removeLpNotificationState.viewedTransactionIds.has(tx.id)
  ).length;
}

function markRemoveLpNotificationsAsRead() {
  removeLpTransactionHistory.forEach(tx => {
    removeLpNotificationState.viewedTransactionIds.add(tx.id);
  });

  removeLpNotificationState.lastViewedTimestamp = Date.now();
  localStorage.setItem('removeLpNotificationState', JSON.stringify({
    lastViewedTimestamp: removeLpNotificationState.lastViewedTimestamp,
    viewedTransactionIds: Array.from(removeLpNotificationState.viewedTransactionIds)
  }));

  updateRemoveLpNotificationBadge();
}

function updateRemoveLpTransactionList() {
  const transactionList = document.getElementById("removeLpTransactionList");
  const clearButton = document.getElementById("clearRemoveLpNotifications");

  if (!transactionList) return;

  if (removeLpTransactionHistory.length === 0) {
    transactionList.innerHTML = '<div class="no-transactions"><p>No transactions yet</p></div>';
    if (clearButton) clearButton.style.display = "none";
    return;
  }

  if (clearButton) clearButton.style.display = "block";

  transactionList.innerHTML = removeLpTransactionHistory.map(tx => {
    const date = new Date(tx.timestamp).toLocaleString();
    return `
      <div class="transaction-item" onclick="openRemoveLpExplorer('${tx.txHash}')">
        <div class="transaction-header">
          <div class="transaction-tokens">
            <span style="color: #94a3b8; font-size: 13px;">${tx.lpAmount} LP →</span>
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

function openRemoveLpExplorer(txHash) {
  window.open(`${CHAIN_EXPLORER}/tx/${txHash}`, '_blank');
}

function setupRemoveLpNotificationSystem() {
  const notificationButton = document.getElementById("removeLpNotificationButton");
  const notificationModal = document.getElementById("removeLpNotificationModal");
  const closeNotification = document.getElementById("closeRemoveLpNotification");
  const clearNotifications = document.getElementById("clearRemoveLpNotifications");

  if (notificationButton) {
    notificationButton.addEventListener("click", function() {
      notificationModal.style.display = "block";
      updateRemoveLpTransactionList();
      markRemoveLpNotificationsAsRead();
    });
  }

  if (closeNotification) {
    closeNotification.addEventListener("click", function() {
      notificationModal.style.display = "none";
    });
  }

  if (clearNotifications) {
    clearNotifications.addEventListener("click", function() {
      removeLpTransactionHistory = [];
      removeLpNotificationState.viewedTransactionIds = new Set();
      removeLpNotificationState.lastViewedTimestamp = Date.now();
      localStorage.setItem('removeLpTransactionHistory', JSON.stringify(removeLpTransactionHistory));
      localStorage.setItem('removeLpNotificationState', JSON.stringify({
        lastViewedTimestamp: removeLpNotificationState.lastViewedTimestamp,
        viewedTransactionIds: []
      }));
      updateRemoveLpTransactionList();
      updateRemoveLpNotificationBadge();
    });
  }

  window.addEventListener("click", function(event) {
    if (event.target === notificationModal) {
      notificationModal.style.display = "none";
    }
  });

  updateRemoveLpNotificationBadge();
}
