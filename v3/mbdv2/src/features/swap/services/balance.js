async function fetchTokenBalance(token, side, retryCount = 0) {
  if (!provider) return;

  try {
    if (!userAddress) {
      if (side === "from") {
        window.fromTokenBalance = 0;
        document.getElementById("fromBalance").innerText = "Connect wallet";
      } else {
        document.getElementById("toBalance").innerText = "Connect wallet";
      }
      return;
    }

    let balance;
    const cacheKey = `balance_${token.symbol}_${userAddress}`;
    const cached = priceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 5000) {
      balance = cached.value;
    } else {
      let attempts = 0;
      while (attempts < 3) {
        try {
          if (token.symbol === "MON") {
            balance = await rateLimitedCall(() => provider.getBalance(userAddress));
            balance = ethers.utils.formatEther(balance);
          } else {
            const tokenContract = new ethers.Contract(token.address, ["function balanceOf(address) view returns (uint)"], provider);
            balance = await rateLimitedCall(() => tokenContract.balanceOf(userAddress));
            balance = ethers.utils.formatUnits(balance, token.decimals);
          }

          const balanceNum = parseFloat(balance);
          if (isNaN(balanceNum) || balanceNum < 0) {
            throw new Error("Invalid balance received");
          }

          break;
        } catch (balanceError) {
          attempts++;
          console.error(`Balance fetch attempt ${attempts} failed:`, balanceError);

          if (attempts >= 3) {
            throw balanceError;
          }

          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));

          if (attempts > 1) {
            switchToNextRpc();
          }
        }
      }

      priceCache.set(cacheKey, { value: balance, timestamp: Date.now() });
    }

    const formattedBalance = parseFloat(balance);
    const displayBalance = formattedBalance < 0.0001 && formattedBalance > 0 
      ? formattedBalance.toFixed(8) 
      : formattedBalance.toFixed(6);

    if (side === "from") {
      window.fromTokenBalance = balance;
      document.getElementById("fromBalance").innerText = displayBalance;
    } else {
      document.getElementById("toBalance").innerText = displayBalance;
    }

    if (window.tokenModals) {
      const balances = window.tokenModals.A.balances || {};
      balances[token.symbol] = balance;

      if (window.tokenModals.A) {
        window.tokenModals.A.updateBalances(balances);
      }
      if (window.tokenModals.B) {
        window.tokenModals.B.updateBalances(balances);
      }
    }
  } catch (err) { 
    console.error("Final balance fetch error:", err);

    if (side === "from") {
      document.getElementById("fromBalance").innerText = "Loading...";
    } else {
      document.getElementById("toBalance").innerText = "Loading...";
    }

    if (retryCount < 1) {
      console.log(`Final retry for balance fetch of ${token.symbol}...`);
      setTimeout(() => {
        fetchTokenBalance(token, side, retryCount + 1);
      }, 2000);
    } else {
      if (side === "from") {
        window.fromTokenBalance = "0";
        document.getElementById("fromBalance").innerText = "0.000000";
      } else {
        document.getElementById("toBalance").innerText = "0.000000";
      }
    }
  }
}
