document.addEventListener("DOMContentLoaded", function() {
  const progressBar = document.createElement("div");
  progressBar.id = "progress-bar";
  Object.assign(progressBar.style, {
    position: "fixed",
    right: "10px",
    bottom: "50px",
    width: "60px",
    height: "120px",
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    borderRadius: "30px",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.2)",
    zIndex: "9999",
    cursor: "pointer",
    opacity: "0",
    transition: "opacity 0.3s",
    fontFamily: "sans-serif",
    pointerEvents: "none", // 初始時不擋點擊
  });
  document.body.appendChild(progressBar);

  const upArrow = document.createElement("div");
  Object.assign(upArrow.style, {
    width: "0",
    height: "0",
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderBottom: "12px solid black",
    marginBottom: "8px",
    cursor: "pointer",
  });
  progressBar.appendChild(upArrow);

  const progressPercent = document.createElement("div");
  progressPercent.id = "progress-percent";
  Object.assign(progressPercent.style, {
    fontSize: "14px",
    margin: "5px 0",
  });
  progressPercent.textContent = "0%";
  progressBar.appendChild(progressPercent);

  const downArrow = document.createElement("div");
  Object.assign(downArrow.style, {
    width: "0",
    height: "0",
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderTop: "12px solid black",
    marginTop: "8px",
    cursor: "pointer",
  });
  progressBar.appendChild(downArrow);

  let hideTimeout;

  function updateProgress() {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = scrollHeight ? (scrollTop / scrollHeight) * 100 : 0;
    progressPercent.textContent = Math.round(scrollPercent) + "%";

    if (scrollPercent > 10) {
      progressBar.style.opacity = "1";
      progressBar.style.pointerEvents = "auto"; // 可以點擊
    } else {
      progressBar.style.opacity = "0";
      progressBar.style.pointerEvents = "none"; // 不可點擊
    }

    clearTimeout(hideTimeout);
    if (scrollPercent > 10) {
      hideTimeout = setTimeout(() => {
        progressBar.style.opacity = "0.5";
      }, 4000);
    }
  }

  window.addEventListener("scroll", updateProgress);

  upArrow.addEventListener("click", function(e) {
    e.stopPropagation();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  downArrow.addEventListener("click", function(e) {
    e.stopPropagation();
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  });

  updateProgress(); // 初始呼叫
});
