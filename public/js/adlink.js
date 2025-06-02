document.addEventListener("DOMContentLoaded", function () {
  const adLink = "https://www.profitableratecpm.com/vawh8q59?key=9b861b04bfb49da12fcc18f5e231446f";
  const adIntervalMinutes = 2; // 幾分鐘內不再跳廣告
  const now = Date.now();

  const links = document.querySelectorAll("a[href^='http']:not([data-no-ad])");

  links.forEach(link => {
    link.addEventListener("click", function (e) {
      const targetUrl = link.href;
      const adHistory = JSON.parse(localStorage.getItem("adHistory") || "{}");
      const lastShown = adHistory[targetUrl];

      if (lastShown && now - lastShown < adIntervalMinutes * 60 * 1000) {
        return; // 未超過間隔時間 → 直接放行
      }

      // 還沒跳或超過時間 → 攔截並跳轉
      e.preventDefault();
      localStorage.setItem("pendingRedirect", targetUrl);

      // 更新跳轉時間
      adHistory[targetUrl] = now;
      localStorage.setItem("adHistory", JSON.stringify(adHistory));

      window.location.href = adLink;
    });
  });

  // 從廣告頁返回後 → 自動導向原始連結
  const pending = localStorage.getItem("pendingRedirect");
  if (pending) {
    localStorage.removeItem("pendingRedirect");
    setTimeout(() => {
      window.location.href = pending;
    }, 300); // 可調整延遲
  }
});