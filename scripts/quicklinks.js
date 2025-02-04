  /****************************************************
     THEME TOGGLE
    ****************************************************/
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const savedTheme = localStorage.getItem('theme') || 'light';
    function applyTheme(theme) {
      if (theme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.checked = true;
      } else {
        body.classList.remove('dark-mode');
        themeToggle.checked = false;
      }
    }
    // Load saved theme on page load
    applyTheme(savedTheme);
    // Toggle theme on user action
    themeToggle.addEventListener('change', () => {
      if (themeToggle.checked) {
        localStorage.setItem('theme', 'dark');
        applyTheme('dark');
      } else {
        localStorage.setItem('theme', 'light');
        applyTheme('light');
      }
    });
