function updateSwapButtonState() {
  const swapButton = document.getElementById("swapButton");
  if (!swapButton) return;

  swapButton.disabled = false;
  swapButton.classList.remove("loading");

  if (!userAddress) {
    swapButton.innerText = "Connect Wallet ";
    return;
  }

  if (isDataLoading) {
    swapButton.innerText = "Loading Data...";
    swapButton.disabled = true;
    swapButton.classList.add("loading");
    return;
  }

  if (!fromToken || !toToken) {
    swapButton.innerText = "Select Tokens";
    swapButton.disabled = true;
    return;
  }

  const amountIn = document.getElementById("fromAmount").value;
  if (!amountIn || isNaN(amountIn) || parseFloat(amountIn) <= 0) {
    swapButton.innerText = "Enter Amount";
    swapButton.disabled = true;
    return;
  }

  if (!hasValidSwapData) {
    swapButton.innerText = "Invalid Swap";
    swapButton.disabled = true;
    return;
  }

  swapButton.innerText = "Swap";
  swapButton.disabled = false;
}

function updateUI() {
  const swapButton = document.getElementById("swapButton");
  if (swapButton) {
    if (userAddress) {
      swapButton.innerText = "Swap";
    } else {
      swapButton.innerText = "Connect Wallet to Swap";
    }
  }

  const infoBoxContent = document.getElementById("infoBoxContent");
  const collapsibleIcon = document.querySelector(".collapsible-icon");

  if (infoBoxContent && collapsibleIcon) {
    infoBoxContent.classList.remove("open");
    collapsibleIcon.classList.remove("open");
  }
}

const infoBoxToggle = document.getElementById("infoBoxToggle");
const infoBoxContent = document.getElementById("infoBoxContent");
const collapsibleIcon = document.querySelector(".collapsible-icon");

const savedInfoBoxState = localStorage.getItem('swapDetailsOpen');
let isInfoBoxOpen = savedInfoBoxState === null ? true : savedInfoBoxState === 'true';

function setInfoBoxState(open) {
  if (open) {
    infoBoxContent.classList.add("open");
    collapsibleIcon.classList.add("open");
    infoBoxContent.style.maxHeight = infoBoxContent.scrollHeight + "px";
  } else {
    infoBoxContent.classList.remove("open");
    collapsibleIcon.classList.remove("open");
    infoBoxContent.style.maxHeight = "0px";
  }
  localStorage.setItem('swapDetailsOpen', open.toString());
}

infoBoxToggle.addEventListener("click", function() {
  isInfoBoxOpen = !isInfoBoxOpen;
  setInfoBoxState(isInfoBoxOpen);
});

setInfoBoxState(isInfoBoxOpen);
