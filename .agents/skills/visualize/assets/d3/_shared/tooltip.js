// Shared tooltip helpers — expects #tooltip element on the page
function showTooltip(event, html) {
  const tip = document.getElementById("tooltip");
  if (!tip) return;
  tip.style.opacity = "1";
  tip.innerHTML = html;
  tip.style.left = (event.pageX + 12) + "px";
  tip.style.top = (event.pageY - 28) + "px";
}
function hideTooltip() {
  const tip = document.getElementById("tooltip");
  if (tip) tip.style.opacity = "0";
}
