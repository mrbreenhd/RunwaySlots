const LS_KEY = "rb_username";

    function titleCaseName(str) {
      return str
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
    }
    function getGreetingForHour(h) {
      if (h < 12) return "Good Morning";
      if (h < 16) return "Good Afternoon";
      return "Good Evening";
    }
    function setGreeting(name) {
      const hour = new Date().getHours(); // local time
      const greet = getGreetingForHour(hour);
      document.getElementById("greeting").textContent = `${greet}, ${name}`;
    }
    function showOverlay(show) {
      const overlay = document.getElementById("nameOverlay");
      overlay.classList.toggle("hidden", !show);
      if (show) {
        setTimeout(() => document.getElementById("nameInput").focus(), 0);
      }
    }
    function revealMain() {
      requestAnimationFrame(() => {
        document.getElementById("wrapper").classList.add("show");
      });
    }
    function saveNameFromInput() {
      const input = document.getElementById("nameInput");
      const err = document.getElementById("nameError");
      const raw = input.value || "";
      const clean = titleCaseName(raw);

      if (!clean || clean.length < 2) {
        err.textContent = "Please enter a valid name.";
        return;
      }
      try { localStorage.setItem(LS_KEY, clean); } catch (e) {}
      err.textContent = "";
      setGreeting(clean);
      showOverlay(false);
      revealMain();
    }

    document.getElementById("saveNameBtn").addEventListener("click", saveNameFromInput);
    document.getElementById("nameInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveNameFromInput();
    });
    document.getElementById("changeName").addEventListener("click", () => {
      showOverlay(true);
      document.getElementById("nameInput").value = localStorage.getItem(LS_KEY) || "";
      document.getElementById("nameError").textContent = "";
    });

    (function init() {
      let name = "";
      try { name = localStorage.getItem(LS_KEY) || ""; } catch (e) {}
      if (name) {
        showOverlay(false);
        setGreeting(name);
        revealMain();
      } else {
        showOverlay(true);
      }
    })();
