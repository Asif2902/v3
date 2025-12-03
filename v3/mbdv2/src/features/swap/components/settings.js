const settingsButton = document.getElementById("settingsButton");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const slippageOptions = document.querySelectorAll(".slippage-option");
const customSlippage = document.getElementById("customSlippage");
const transactionDeadlineInput = document.getElementById("transactionDeadline");

function saveSettings() {
  localStorage.setItem('slippageTolerance', slippageTolerance.toString());
  localStorage.setItem('isAutoSlippage', isAutoSlippage.toString());
  localStorage.setItem('transactionDeadline', transactionDeadline.toString());
  localStorage.setItem('isSimulationEnabled', isSimulationEnabled.toString());
  localStorage.setItem('routingMode', routingMode);
}

settingsButton.addEventListener("click", function() {
  const multiSplitToggle = document.getElementById("multiSplitToggle");
  if (multiSplitToggle) {
    multiSplitToggle.checked = isMultiSplitEnabled;
  }

  const simulationToggle = document.getElementById("simulationToggle");
  if (simulationToggle) {
    simulationToggle.checked = isSimulationEnabled;
  }

  slippageOptions.forEach(opt => {
    if ((isAutoSlippage && opt.dataset.value === "auto") || 
        (!isAutoSlippage && opt.dataset.value === "custom")) {
      opt.classList.add("active");
    } else {
      opt.classList.remove("active");
    }
  });

  customSlippage.disabled = isAutoSlippage;
  customSlippage.value = slippageTolerance;
  transactionDeadlineInput.value = transactionDeadline;

  settingsModal.style.display = "block";
});

closeSettings.addEventListener("click", function() {
  settingsModal.style.display = "none";
  saveSettings();
});

window.addEventListener("click", function(event) {
  if (event.target === settingsModal) {
    settingsModal.style.display = "none";
    saveSettings();
  }
});

slippageOptions.forEach(option => {
  option.addEventListener("click", function() {
    slippageOptions.forEach(opt => opt.classList.remove("active"));
    this.classList.add("active");

    if (this.dataset.value === "auto") {
      isAutoSlippage = true;
      customSlippage.disabled = true;
      slippageTolerance = 0.5; 
      notify("Auto slippage", "info");
    } else {
      isAutoSlippage = false;
      customSlippage.disabled = false;
      customSlippage.focus();
      const value = parseFloat(customSlippage.value);
      if (!isNaN(value) && value > 0) {
        slippageTolerance = value;
        notify(`Custom slippage: ${value}%`, "info");
      }
    }
    saveSettings();
    estimateSwap();
  });
});

customSlippage.addEventListener("input", function() {
  if (!isAutoSlippage) {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
      slippageTolerance = value;
      notify(`Custom slippage: ${value}%`, "info");
    }
  }
});

customSlippage.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
      slippageTolerance = value;
      saveSettings();
      notify(`Slippage set to ${value}%`, "success");
    }
  }
});

transactionDeadlineInput.addEventListener("input", function() {
  const value = parseInt(this.value);
  if (!isNaN(value) && value > 0) {
    transactionDeadline = value;
  }
});
