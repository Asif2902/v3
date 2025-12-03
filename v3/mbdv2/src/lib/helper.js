// URL Parameter Parsing for Swap Interface
function parseSwapParameters() {
  // Get the current URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const rawParams = urlParams.toString();

  // Check if we have parameters to parse
  if (!rawParams) return null;

  let tokenIn, tokenOut, amount;

  // First try to get structured parameters if they exist
  tokenIn = urlParams.get('tokenIn');
  tokenOut = urlParams.get('tokenOut');
  amount = urlParams.get('amount');

  // If structured params don't exist, try to parse from the raw URL
  if (!tokenIn || !tokenOut) {
    const rawQuery = window.location.search.substring(1); 
    const parts = rawQuery.split('+');

    if (parts.length >= 2) {
      tokenIn = parts[0];
      const tokenOutPart = parts[1].split('&')[0];
      tokenOut = tokenOutPart;
    }
  }

  const amountMatch = window.location.search.match(/[&?]amount=([^&]+)/);
  if (amountMatch && amountMatch[1]) {
    amount = amountMatch[1];
  }

  if (tokenIn && tokenOut) {
    return {
      tokenIn: tokenIn.toLowerCase(),
      tokenOut: tokenOut.toLowerCase(),
      amount: amount ? parseFloat(amount) : undefined
    };
  }

  return null;
}

function findTokenBySymbolOrAddress(symbolOrAddress, tokenList) {
  if (!symbolOrAddress) return null;

  const normalizedInput = symbolOrAddress.toLowerCase();

  const tokenBySymbol = tokenList.find(token => 
    token.symbol.toLowerCase() === normalizedInput);

  if (tokenBySymbol) return tokenBySymbol;

  if (normalizedInput.startsWith('0x')) {
    const tokenByAddress = tokenList.find(token => 
      token.address.toLowerCase() === normalizedInput);

    if (tokenByAddress) return tokenByAddress;
  }

  return null;
}

window.parseSwapParameters = parseSwapParameters;
window.findTokenBySymbolOrAddress = findTokenBySymbolOrAddress;

// Notification system with click-to-dismiss
function notify(message, type = "info") {
  const notifications = document.getElementById("notifications");
  const div = document.createElement("div");
  div.className = `notification ${type}`;
  
  // Create message container
  const messageSpan = document.createElement("span");
  messageSpan.className = "notification-message";
  messageSpan.innerHTML = message;
  
  // Create close button
  const closeBtn = document.createElement("span");
  closeBtn.className = "notification-close";
  closeBtn.innerHTML = "×";
  closeBtn.setAttribute("role", "button");
  closeBtn.setAttribute("aria-label", "Close notification");
  
  div.appendChild(messageSpan);
  div.appendChild(closeBtn);
  notifications.appendChild(div);

  // Function to dismiss notification
  const dismissNotification = () => {
    if (div.parentElement) {
      div.classList.add('hide');
      setTimeout(() => div.remove(), 300);
    }
  };

  // Click close button to dismiss
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dismissNotification();
  });

  // Click anywhere on notification to dismiss
  div.addEventListener('click', dismissNotification);

  // Auto dismiss after 6 seconds
  setTimeout(dismissNotification, 6000);
}