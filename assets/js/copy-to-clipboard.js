document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('.highlight').forEach(function (block) {
    const btn = document.createElement('button');
    btn.className = 'highlight-copy-btn';
    btn.textContent = 'Copy';

    btn.addEventListener('click', function () {
      const code = block.querySelector('pre');
      if (!code) return;

      // 建立範圍並選取
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = 'Copy'), 1500);
        }
      } catch (err) {
        console.error('Copy failed', err);
        btn.textContent = 'Error';
      }

      selection.removeAllRanges();
    });

    block.appendChild(btn);
  });
});