async function getPriceFromDexScreener(tokenAddress) {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.pairs && data.pairs.length > 0) {
      const monadPairs = data.pairs.filter(pair => 
        pair.chainId === 'monad' || pair.chainId === '143'
      );

      if (monadPairs.length > 0) {
        const sortedByLiquidity = monadPairs.sort((a, b) => 
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );

        const price = parseFloat(sortedByLiquidity[0].priceUsd);
        if (price && !isNaN(price)) {
          return price;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("DexScreener API error:", error);
    return null;
  }
}

async function getMonPriceCached(retryCount = 0) {
  const now = Date.now();
  if (cachedMonPrice && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedMonPrice;
  }

  const wmon = defaultTokens.find(t => t.symbol === "WMON");
  if (!wmon) return null;

  let dexScreenerPrice = await getPriceFromDexScreener(wmon.address);

  if (dexScreenerPrice && dexScreenerPrice > 0) {
    cachedMonPrice = dexScreenerPrice;
    lastFetchTime = now;
    console.log(`MON price from DexScreener: $${dexScreenerPrice.toFixed(4)}`);
    return dexScreenerPrice;
  }

  if (!aggregatorContract) {
    provider = createProvider();
    aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
  }

  const usdc = defaultTokens.find(t => t.symbol === "USDC");
  if (!usdc) return null;

  try {
    const amountIn = ethers.utils.parseEther("10");
    const path = [wmon.address, usdc.address];
    const bestSwap = await rateLimitedCall(() => aggregatorContract.getBestSwap(amountIn, path));

    if (!bestSwap || !bestSwap[1] || bestSwap[1].isZero()) {
      throw new Error("Invalid price response");
    }

    const output = parseFloat(ethers.utils.formatUnits(bestSwap[1], usdc.decimals)) / 10;
    cachedMonPrice = output;
    lastFetchTime = now;
    console.log(`MON price from on-chain: $${output.toFixed(4)}`);
    return output;
  } catch (error) {
    console.error("Error getting MON price:", error);

    if (retryCount < 4) {
      console.log(`Retrying MON price fetch... (${retryCount + 1}/5)`);
      switchToNextRpc();
      await new Promise(resolve => setTimeout(resolve, 500));
      return await getMonPriceCached(retryCount + 1);
    }

    if (cachedMonPrice) {
      console.log("Using cached MON price as fallback");
      return cachedMonPrice;
    }

    return null;
  }
}

async function getTokenPriceUSD(token, retryCount = 0) {
  if (token.symbol === "USDC" || token.symbol === "USDT") {
    return 1;
  } else if (token.symbol === "MON" || token.symbol === "WMON") {
    return await getMonPriceCached(retryCount);
  } else {
    const cacheKey = `price_${token.symbol}`;
    const cached = priceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.value;
    }

    let dexScreenerPrice = await getPriceFromDexScreener(token.address);

    if (dexScreenerPrice && dexScreenerPrice > 0) {
      priceCache.set(cacheKey, { value: dexScreenerPrice, timestamp: Date.now() });
      return dexScreenerPrice;
    }

    const monPrice = await getMonPriceCached(retryCount);
    if (!monPrice) return null;

    const wmon = defaultTokens.find(t => t.symbol === "WMON");
    try {
      const amountIn = ethers.utils.parseUnits("10", token.decimals);
      const path = [token.address, wmon.address];
      const bestSwap = await rateLimitedCall(() => aggregatorContract.getBestSwap(amountIn, path));
      const tokenToMon = parseFloat(ethers.utils.formatUnits(bestSwap[1], wmon.decimals)) / 10;
      const price = tokenToMon * monPrice;

      priceCache.set(cacheKey, { value: price, timestamp: Date.now() });
      return price;
    } catch (error) {
      console.error("Error getting token price:", error);

      if (retryCount < 2) {
        console.log(`Retrying price fetch for ${token.symbol}... (${retryCount + 1}/3)`);
        switchToNextRpc();
        return await getTokenPriceUSD(token, retryCount + 1);
      }

      return null;
    }
  }
}

async function calculatePriceImpact(fromToken, toToken, amountIn, expectedOut) {
  try {
    if ((fromToken.symbol === "MON" && toToken.symbol === "WMON") || 
        (fromToken.symbol === "WMON" && toToken.symbol === "MON")) {
      return 0;
    }

    const fromTokenUsd = await getTokenPriceUSD(fromToken);
    const toTokenUsd = await getTokenPriceUSD(toToken);

    if (!fromTokenUsd || !toTokenUsd) {
      return 5;
    }

    const amountInFormatted = parseFloat(ethers.utils.formatUnits(amountIn, fromToken.decimals));
    const expectedOutFormatted = parseFloat(ethers.utils.formatUnits(expectedOut, toToken.decimals));

    const inputUsdValue = amountInFormatted * fromTokenUsd;
    const outputUsdValue = expectedOutFormatted * toTokenUsd;

    if (inputUsdValue > 0) {
      const priceImpact = Math.max(0, (1 - (outputUsdValue / inputUsdValue)) * 100);
      return Math.min(Math.max(priceImpact, 0), 100);
    }

    return 0;
  } catch (error) {
    console.error("Price impact calculation failed:", error);
    return 5;
  }
}
