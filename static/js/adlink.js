document.addEventListener("DOMContentLoaded", function () {
  const adLink = "https://www.profitableratecpm.com/vawh8q59?key=9b861b04bfb49da12fcc18f5e231446f";
  const cooldownMinutes = 2; // 同一链接多少分钟内不再重复开广告
  const now = Date.now();

  // 选出所有外部链接（你也可以用 .external 类名来更精准地控制）
  const links = Array.from(document.querySelectorAll("a[href^='http']:not([data-no-ad])"))
    .filter(a => !a.href.includes(location.hostname));

  links.forEach(link => {
    link.addEventListener("click", function (e) {
      const targetUrl = link.href;
      const history = JSON.parse(localStorage.getItem("adHistory") || "{}");
      const last = history[targetUrl];

      // 冷却期内跳过广告，直接放行
      if (last && now - last < cooldownMinutes * 60 * 1000) {
        return;
      }

      // 拦截默认跳转
      e.preventDefault();

      // 记录本次广告打开时间
      history[targetUrl] = now;
      localStorage.setItem("adHistory", JSON.stringify(history));

      // 先弹出广告页
      window.open(adLink, "_blank");

      // 短延迟后再在当前标签跳到真正目标
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 100); // 100ms 即可，根据需要可调
    });
  });
});