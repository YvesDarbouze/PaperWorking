// Keyboard navigation for focusable elements
// Usage: navigateMarks(containerSelector, "ArrowUp", "ArrowDown")
function navigateMarks(containerSelector, prevKey, nextKey) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  container.addEventListener("keydown", function (event) {
    const focusable = Array.from(container.querySelectorAll('[tabindex="0"]'));
    if (focusable.length === 0) return;
    const idx = focusable.indexOf(document.activeElement);
    if (event.key === nextKey && idx < focusable.length - 1) {
      event.preventDefault();
      focusable[idx + 1].focus();
    } else if (event.key === prevKey && idx > 0) {
      event.preventDefault();
      focusable[idx - 1].focus();
    }
  });
}
