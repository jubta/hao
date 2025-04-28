document.addEventListener("DOMContentLoaded", function() {
  // 創建進度條容器
  const progressBar = document.createElement("div");
  progressBar.id = "progress-bar";
  Object.assign(progressBar.style, {
    position: "fixed",
    right: "10px",
    bottom: "50px",
    width: "50px",
    height: "50px",
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    borderRadius: "25px",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.2)",
    zIndex: "9999",
    cursor: "pointer",
    transition: "opacity 0.3s",
  });
  document.body.appendChild(progressBar);

  // 創建百分比數字
  const progressPercent = document.createElement("div");
  progressPercent.id = "progress-percent";
  progressPercent.style.fontSize = "16px";
  progressPercent.textContent = "0%";
  progressBar.appendChild(progressPercent);

  // 創建向上箭頭
  const upArrow = document.createElement("div");
  Object.assign(upArrow.style, {
    width: "0",
    height: "0",
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderBottom: "15px solid black",
    marginTop: "5px",
  });
  progressBar.appendChild(upArrow);

  // 創建向下箭頭
  const downArrow = document.createElement("div");
  Object.assign(downArrow.style, {
    width: "0",
    height: "0",
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderTop: "15px solid black",
    marginBottom: "5px",
  });
  progressBar.appendChild(downArrow);

  let hideTimeout;

  function updateProgress() {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = scrollHeight ? (scrollTop / scrollHeight) * 100 : 0;
    progressPercent.textContent = Math.round(scrollPercent) + "%";

    // 顯示進度條
    progressBar.style.opacity = "1";
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      progressBar.style.opacity = "0";
    }, 4000);
  }

  // 滾動時更新
  window.addEventListener("scroll", updateProgress);

  // 點擊上箭頭回到頂部
  upArrow.addEventListener("click", function(e) {
    e.stopPropagation();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // 點擊下箭頭到達底部
  downArrow.addEventListener("click", function(e) {
    e.stopPropagation();
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  });

  // 預設也顯示一次
  updateProgress();
});
