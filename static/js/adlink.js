document.addEventListener("DOMContentLoaded", function () {
  const adIntervalMinutes = 2;
  const now = Date.now();

  const links = document.querySelectorAll("a[href^='http']:not([data-no-ad])");

  links.forEach(link => {
    const targetUrl = link.href;

    link.addEventListener("click", function (e) {
      const hostname = location.hostname;
      if (targetUrl.includes(hostname)) return; // 內部連結不處理

      const adHistory = JSON.parse(localStorage.getItem("adHistory") || "{}");
      const lastShown = adHistory[targetUrl];

      if (lastShown && now - lastShown < adIntervalMinutes * 60 * 1000) {
        // 時間內已跳過，直接放行
        return;
      }

      e.preventDefault(); // 阻止原本跳轉
      sessionStorage.setItem("pendingRedirect", targetUrl); // 存真正網址
      adHistory[targetUrl] = now;
      localStorage.setItem("adHistory", JSON.stringify(adHistory));
      window.location.href = "/intermediate/";
    });
  });
});