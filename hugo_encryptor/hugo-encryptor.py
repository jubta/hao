# coding=utf-8
import os, base64, hashlib
from bs4 import BeautifulSoup
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

class AESCrypt:
    def __init__(self, password: str):
        self.key = hashlib.md5(password.encode('utf-8')).digest()      # 16 bytes binary
        self.iv  = self.key[:16]                                        # 16 bytes IV

    def encrypt(self, text: str) -> str:
        cipher = AES.new(self.key, AES.MODE_CBC, iv=self.iv)
        padded = pad(text.encode('utf-8'), AES.block_size, style='pkcs7')
        ct = cipher.encrypt(padded)
        return base64.b64encode(ct).decode('utf-8')

if __name__ == '__main__':
    for root, dirs, files in os.walk('public'):
        for fn in files:
            if not fn.lower().endswith('.html'):
                continue
            path = os.path.join(root, fn)
            soup = BeautifulSoup(open(path, 'rb'), 'lxml')
            blocks = soup.find_all('div', {'class': 'hugo-encryptor-cipher-text'})
            if not blocks:
                continue
            print("Encrypting:", path)
            for b in blocks:
                pwd    = b['data-password']
                crypt  = AESCrypt(pwd)
                content= ''.join(map(str, b.contents))
                enc    = crypt.encrypt(content)
                del b['data-password']
                b.string = enc
            # 注入解密脚本（CryptoJS + 自己的 decrypt.js）
            soup.body.append(soup.new_tag('script', src='https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'))
            soup.body.append(soup.new_tag('script', src='/js/decrypt.js'))
            with open(path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
