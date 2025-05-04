document.addEventListener("DOMContentLoaded", function () {
  const adIntervalMinutes = 2;
  const now = Date.now();

  const links = document.querySelectorAll("a[href^='http']:not([data-no-ad])");

  links.forEach(link => {
    const href = link.getAttribute("href");
    const hostname = location.hostname;
    if (href.includes(hostname)) return; // 內部連結不處理

    link.addEventListener("click", function (e) {
      const adHistory = JSON.parse(localStorage.getItem("adHistory") || "{}");
      const lastShown = adHistory[href];

      if (lastShown && now - lastShown < adIntervalMinutes * 60 * 1000) {
        return; // 放行
      }

      e.preventDefault(); // 攔截
      sessionStorage.setItem("pendingRedirect", href);
      adHistory[href] = now;
      localStorage.setItem("adHistory", JSON.stringify(adHistory));

      window.location.href = "/intermediate/";
    });
  });
});