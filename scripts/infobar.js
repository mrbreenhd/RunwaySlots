 const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    function updateUtcTopClock() {
      const el = document.getElementById("utcTopClock");
      if (!el) return;
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2,'0');
      const mm = String(now.getUTCMinutes()).padStart(2,'0');
      const ss = String(now.getUTCSeconds()).padStart(2,'0');
      const dd = String(now.getUTCDate()).padStart(2,'0');
      const mon = MONTHS[now.getUTCMonth()];
      const yyyy = now.getUTCFullYear();
      el.textContent = `UTC: ${hh}:${mm}:${ss} • ${dd}${mon}${yyyy}`;
    }
    updateUtcTopClock();
    setInterval(updateUtcTopClock, 1000);

function setDbStatus(connected) {
      const el = document.getElementById("fbStatus");
      if (!el) return;
      const dot = el.querySelector(".dot");
      const txt = el.querySelector(".text");
      if (connected) {
        dot.style.background = "#2e7d32"; // green
        txt.textContent = "Database Online";
      } else {
        dot.style.background = "#c62828"; // red
        txt.textContent = "Database Offline";
      }
    }

    (function initDbStatus() {
      if (!FIREBASE_READY || !firebase.database) {
        setDbStatus(false);
        return;
      }
      try {
        firebase.database().ref(".info/connected").on("value", (snap) => {
          const isConnected = !!snap.val();
          setDbStatus(isConnected);
        }, () => setDbStatus(false));
      } catch (e) {
        setDbStatus(false);
      }
    })();


 const REFRESH_MS = 15 * 60 * 1000;
    let refreshTimer = null;

    function setAutoRefresh(enabled) {
      const cb = document.getElementById("autoRefreshToggle");
      if (cb) cb.checked = !!enabled;

      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      if (enabled) {
        refreshTimer = setInterval(() => {
          window.location.reload();
        }, REFRESH_MS);
      }
      try { localStorage.setItem("autoRefreshEnabled", JSON.stringify(!!enabled)); } catch {}
    }

    (function initAutoRefresh() {
      // default ON if no stored preference
      let stored = null;
      try { stored = JSON.parse(localStorage.getItem("autoRefreshEnabled")); } catch {}
      const initialEnabled = (stored === null) ? true : !!stored;
      setAutoRefresh(initialEnabled);

      const cb = document.getElementById("autoRefreshToggle");
      if (cb) {
        cb.checked = initialEnabled;
        cb.addEventListener("change", (e) => {
          setAutoRefresh(e.target.checked);
        });
      }
    })();
