document.addEventListener("DOMContentLoaded", function () {
  const adLink = "https://www.profitableratecpm.com/vawh8q59?key=9b861b04bfb49da12fcc18f5e231446f";
  const cooldownMs = 2 * 60 * 1000; // 同一链接2分钟内不再重复开广告

  // 选出所有外部链接
  const links = Array.from(document.querySelectorAll("a[href^='http']:not([data-no-ad])"))
    .filter(a => !a.href.includes(location.hostname));

  links.forEach(link => {
    link.addEventListener("click", function (e) {
      const targetUrl = link.href;
      const history = JSON.parse(localStorage.getItem("adHistory") || "{}");
      const lastTime = history[targetUrl] || 0;
      const now = Date.now();

      // 冷却期内，直接放行
      if (now - lastTime < cooldownMs) {
        return;
      }

      // 拦截默认跳转
      e.preventDefault();

      // 记录本次广告打开时间
      history[targetUrl] = now;
      localStorage.setItem("adHistory", JSON.stringify(history));

      // 先新标签打开广告页
      window.open(adLink, "_blank");

      // 短延迟后在当前标签跳转到真正目标
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 100);
    });
  });
});