function notify(message, type = "info", forceShow = false) {
  return removeLpNotify(message, type, forceShow);
}

function onSelectTokenA(token) {
  tokenA = token;
  document.getElementById("tokenALogo").src = token.logo && token.logo !== "?" ? token.logo : "https://monbridgedex.xyz/unknown.png";
  document.getElementById("tokenASymbol").innerText = token.symbol;
  document.getElementById("tokenALabel").innerText = token.symbol;
  fetchTokenBalance(token, "A");
  if (tokenA && tokenB) updateLPInfo();
}

function onSelectTokenB(token) {
  tokenB = token;
  document.getElementById("tokenBLogo").src = token.logo && token.logo !== "?" ? token.logo : "https://monbridgedex.xyz/unknown.png";
  document.getElementById("tokenBSymbol").innerText = token.symbol;
  document.getElementById("tokenBLabel").innerText = token.symbol;
  fetchTokenBalance(token, "B");
  if (tokenA && tokenB) updateLPInfo();
}
