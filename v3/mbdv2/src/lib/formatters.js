function formatAddress(addr) {
  if (!addr) return '';
  return addr.substring(0, 6) + '***' + addr.substring(addr.length - 4);
}

function formatCurrency(num) {
  if (num === undefined || num === null) return 'N/A';

  const absNum = Math.abs(num);
  if (absNum >= 1000000000000) {
    return (num / 1000000000000).toFixed(1) + 'T';
  } else if (absNum >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (absNum >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (absNum >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num.toFixed(2);
  }
}

function formatBalanceForDisplay(balance) {
  if (!balance || balance === '-') return balance;
  
  const num = parseFloat(balance);
  if (isNaN(num)) return balance;

  const isMobile = window.innerWidth < 768;
  
  if (!isMobile) {
    return num.toFixed(6);
  }

  const absNum = Math.abs(num);
  if (absNum >= 1000000000000000) {
    return (num / 1000000000000000).toFixed(2) + 'QT';
  } else if (absNum >= 1000000000000) {
    return (num / 1000000000000).toFixed(2) + 'T';
  } else if (absNum >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'B';
  } else if (absNum >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (absNum >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  } else {
    return num.toFixed(4);
  }
}

function formatAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return num.toFixed(4).replace(/\.?0+$/, '');
}

window.formatAddress = formatAddress;
window.formatCurrency = formatCurrency;
window.formatBalanceForDisplay = formatBalanceForDisplay;
window.formatAmount = formatAmount;
