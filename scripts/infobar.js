// infobar.js — no FIREBASE_READY dependency

(function () {
  const ID_CLOCK  = "utcTopClock";
  const ID_STATUS = "fbStatus";
  const ID_TOGGLE = "autoRefreshToggle";
  const REFRESH_MS = 15 * 60 * 1000;

  // Run when DOM is ready
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  /* ========== UTC CLOCK ========== */
  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  function updateUtcTopClock() {
    const el = document.getElementById(ID_CLOCK);
    if (!el) return;
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, "0");
    const mm = String(now.getUTCMinutes()).padStart(2, "0");
    const ss = String(now.getUTCSeconds()).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const mon = MONTHS[now.getUTCMonth()];
    const yyyy = now.getUTCFullYear();
    el.textContent = `UTC: ${hh}:${mm}:${ss} • ${dd}${mon}${yyyy}`;
  }

  /* ========== DB STATUS ========== */
  function setDbStatus(connected) {
    const el = document.getElementById(ID_STATUS);
    if (!el) return;
    const dot = el.querySelector(".dot");
    const txt = el.querySelector(".text");
    if (dot) dot.style.background = connected ? "#2e7d32" : "#c62828";
    if (txt) txt.textContent = connected ? "Database Online" : "Database Offline";
  }

  function initDbStatus() {
    // Use shared initializer if present; otherwise detect an existing app
    const fbReady =
      (typeof window.ensureFirebaseReady === "function" && window.ensureFirebaseReady()) ||
      !!(window.firebase && firebase.apps && firebase.apps.length);

    if (!fbReady || !firebase.database) {
      setDbStatus(false);
      return;
    }
    try {
      firebase.database().ref(".info/connected").on(
        "value",
        snap => setDbStatus(!!snap.val()),
        () => setDbStatus(false)
      );
    } catch {
      setDbStatus(false);
    }
  }

  /* ========== AUTO-REFRESH (15 min) ========== */
  function setAutoRefresh(enabled) {
    const cb = document.getElementById(ID_TOGGLE);
    if (cb) cb.checked = !!enabled;

    // Ensure only one timer globally
    if (window.__autoRefreshTimer) {
      clearInterval(window.__autoRefreshTimer);
      window.__autoRefreshTimer = null;
    }
    if (enabled) {
      window.__autoRefreshTimer = setInterval(() => window.location.reload(), REFRESH_MS);
    }
    try { localStorage.setItem("autoRefreshEnabled", JSON.stringify(!!enabled)); } catch {}
  }

  function initAutoRefresh() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem("autoRefreshEnabled")); } catch {}
    const initialEnabled = (stored === null) ? true : !!stored; // default ON
    setAutoRefresh(initialEnabled);

    const cb = document.getElementById(ID_TOGGLE);
    if (cb) {
      cb.checked = initialEnabled;
      cb.addEventListener("change", e => setAutoRefresh(e.target.checked));
    }
  }

  /* ========== BOOT ========== */
  ready(() => {
    updateUtcTopClock();
    setInterval(updateUtcTopClock, 1000);
    initDbStatus();
    initAutoRefresh();
  });
})();
