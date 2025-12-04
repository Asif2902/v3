function shouldShowTokenWarning(address) {
  // Always show warning for user protection - no 24h caching
  return true;
}

function showTokenImportWarning(tokenData) {
  return new Promise((resolve, reject) => {
    let modalOverlay = document.getElementById("tokenWarningModalOverlay");

    if (!modalOverlay) {
      modalOverlay = document.createElement("div");
      modalOverlay.id = "tokenWarningModalOverlay";
      modalOverlay.className = "modal-overlay";
      modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;

      const modalContainer = document.createElement("div");
      modalContainer.className = "modal-container";
      modalContainer.style.cssText = `
        background: #1a1b23;
        border-radius: 16px;
        padding: 28px;
        max-width: 420px;
        width: 92%;
        border: 1px solid #333;
        color: white;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        font-family: 'Inter', sans-serif;
        line-height: 1.5;
      `;

      modalContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="background: #ff6b35; width: 52px; height: 52px; border-radius: 50%; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z"/>
            </svg>
          </div>
          <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">Token Import Warning</h3>
          <p style="margin: 0 0 18px 0; color: #aaa; font-size: 15px; line-height: 1.4;">
            You are about to import a token that is not on the default list.
          </p>
        </div>

        <div id="tokenWarningDetails" style="background: #252631; border-radius: 10px; padding: 20px; margin-bottom: 22px; border: 1px solid #333;">
        </div>

        <div style="background: #2a1f1f; border: 1px solid #ff6b35; border-radius: 10px; padding: 16px; margin-bottom: 22px;">
          <p style="margin: 0; font-size: 13px; color: #ff9999; line-height: 1.4;">
            <strong>Warning:</strong> Anyone can create a token with any name, including fake versions of existing tokens. 
            Always verify the token contract address before trading.
          </p>
        </div>

        <div style="display: flex; gap: 14px;">
          <button id="cancelTokenImport" style="flex: 1; padding: 14px 16px; background: transparent; border: 1px solid #666; border-radius: 10px; color: white; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;">
            Cancel
          </button>
          <button id="confirmTokenImport" style="flex: 1; padding: 14px 16px; background: #ff6b35; border: none; border-radius: 10px; color: white; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;">
            Import Token
          </button>
        </div>
      `;

      modalOverlay.appendChild(modalContainer);
      document.body.appendChild(modalOverlay);
    }

    const detailsDiv = document.getElementById("tokenWarningDetails");
    detailsDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
        <img src="${tokenData.logo || 'https://monbridgedex.xyz/unknown.png'}" alt="${tokenData.symbol}" style="width: 48px; height: 48px; border-radius: 50%; background: #333;">
        <div>
          <div style="font-weight: 600; font-size: 17px;">${tokenData.name}</div>
          <div style="color: #888; font-size: 14px;">${tokenData.symbol}</div>
        </div>
      </div>
      <div style="background: #1a1b23; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 11px; word-break: break-all; color: #aaa; border: 1px solid #333;">
        ${tokenData.address}
      </div>
    `;

    modalOverlay.style.display = "flex";

    const confirmButton = document.getElementById("confirmTokenImport");
    const cancelButton = document.getElementById("cancelTokenImport");

    const newConfirmButton = confirmButton.cloneNode(true);
    const newCancelButton = cancelButton.cloneNode(true);

    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

    newConfirmButton.addEventListener("click", () => {
      modalOverlay.style.display = "none";
      resolve(true);
    });

    newCancelButton.addEventListener("click", () => {
      modalOverlay.style.display = "none";
      resolve(false);
    });

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = "none";
        resolve(false);
      }
    });
  });
}
