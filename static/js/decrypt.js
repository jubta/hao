const _do_decrypt = (encrypted, password) => {
  const md5 = CryptoJS.MD5(password);                  // 128-bit key
  const key = md5;
  const iv  = CryptoJS.lib.WordArray.create(md5.words.slice(0, 4)); // 16 bytes IV

  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  const result = decrypted.toString(CryptoJS.enc.Utf8);
  if (!result) throw new Error("Malformed UTF-8");

  return result;
};

window.addEventListener('click', e => {
  if (!e.target.matches('.hugo-encryptor-button')) return;
  const container = e.target.closest('.hugo-encryptor-container');
  const cipher    = container.querySelector('.hugo-encryptor-cipher-text').textContent.trim();
  const passwd    = container.querySelector('.hugo-encryptor-input').value;

  let decrypted;
  try {
    decrypted = _do_decrypt(cipher, passwd);
  } catch (err) {
    alert('Failed to decrypt.');
    return;
  }

  if (!decrypted.startsWith('--- DON\'T MODIFY THIS LINE ---')) {
    alert('Incorrect password.');
    return;
  }

  container.innerHTML = decrypted;
});
