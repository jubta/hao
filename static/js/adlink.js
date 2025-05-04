document.addEventListener("DOMContentLoaded", function () {
  const adLink = "https://www.profitableratecpm.com/vawh8q59?key=9b861b04bfb49da12fcc18f5e231446f";
  const adIntervalMinutes = 2;
  const now = Date.now();

  const links = document.querySelectorAll("a.adlink");

  links.forEach(link => {
    const targetUrl = link.href;

    link.addEventListener("click", function (e) {
      const adHistory = JSON.parse(localStorage.getItem("adHistory") || "{}");
      const lastShown = adHistory[targetUrl];

      if (lastShown && now - lastShown < adIntervalMinutes * 60 * 1000) {
        return; // 放行（短時間內已跳過）
      }

      e.preventDefault(); // 攔截跳轉
      sessionStorage.setItem("pendingRedirect", targetUrl);
      adHistory[targetUrl] = now;
      localStorage.setItem("adHistory", JSON.stringify(adHistory));

      window.location.href = "/intermediate/";
    });
  });
});