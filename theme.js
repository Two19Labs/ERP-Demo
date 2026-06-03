// Theme switcher module for Restaurant Stock Control
// Load in <head> to prevent light-theme flash on dark mode load.
(function () {
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    document.documentElement.classList.add("dark-theme");
    // Ensure body also gets it when it is parsed
    document.addEventListener("DOMContentLoaded", () => {
      document.body.classList.add("dark-theme");
    });
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  // 1. Locate the topbar actions container
  const topbarActions = document.querySelector(".topbar-actions");
  if (topbarActions && !document.getElementById("themeToggleBtn")) {
    // 2. Create the toggle button element
    const btn = document.createElement("button");
    btn.id = "themeToggleBtn";
    btn.type = "button";
    btn.className = "btn btn-outline btn-small";
    btn.style.padding = "8px 10px";
    btn.style.marginRight = "10px";
    btn.style.borderRadius = "var(--radius-xs)";
    btn.setAttribute("aria-label", "Toggle dark theme");
    btn.innerHTML = `
      <svg id="themeToggleIcon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle; display: block;">
        <path d=""/>
      </svg>
    `;
    
    // 3. Prepend to topbar actions
    topbarActions.insertBefore(btn, topbarActions.firstChild);

    // 4. Update the icon based on current state
    const isInitiallyDark = document.body.classList.contains("dark-theme") || document.documentElement.classList.contains("dark-theme");
    updateThemeIcon(isInitiallyDark);

    // 5. Add click event listener to toggle theme
    btn.addEventListener("click", () => {
      // Toggle dark-theme class on documentElement and body
      const isDark = document.documentElement.classList.toggle("dark-theme");
      document.body.classList.toggle("dark-theme", isDark);

      // Save preference
      localStorage.setItem("theme", isDark ? "dark" : "light");

      // Update toggle icon
      updateThemeIcon(isDark);

      // Dispatch global event so charts or widgets can redraw
      window.dispatchEvent(new CustomEvent("themeChanged", { detail: { isDark } }));
    });
  }
});

function updateThemeIcon(isDark) {
  const icon = document.getElementById("themeToggleIcon");
  if (!icon) return;

  const moonPath = "M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z";
  const sunPath = "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h-2a.5.5 0 0 1 .5-.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z";

  icon.querySelector("path").setAttribute("d", isDark ? sunPath : moonPath);
}
