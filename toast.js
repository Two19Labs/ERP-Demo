// Lightweight toast helper shared across pages.
// Exposed on window so each page's script (which redeclares its own
// top-level consts) doesn't clash with this file.
(function () {
  let containerEl = null;

  function ensureContainer() {
    if (containerEl && document.body.contains(containerEl)) return containerEl;
    containerEl = document.createElement("div");
    containerEl.className = "toast-container";
    document.body.appendChild(containerEl);
    return containerEl;
  }

  window.showToast = function (message, type) {
    if (!message) return;
    const container = ensureContainer();
    const toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("toast-visible"));

    const lifetime = type === "error" ? 5500 : 3500;
    setTimeout(() => {
      toast.classList.remove("toast-visible");
      toast.classList.add("toast-leaving");
      setTimeout(() => toast.remove(), 250);
    }, lifetime);
  };
})();
