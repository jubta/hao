// functions/verify.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, token, email, otp } = await request.json();
    if (!path) {
      return new Response(JSON.stringify({ error: '缺少 path' }), { status: 401 });
    }

    let finalToken = token;

    // 新增: 如果有 email，從 KV 取 token
    if (email) {
      const key = `payment:${email}:${path}`;
      finalToken = await env.PAYMENT_RECORDS.get(key);
      if (!finalToken) {
        return new Response(JSON.stringify({ error: '未找到付款記錄，請檢查 email 或重新購買' }), { status: 401 });
      }

      // 新增: OTP 邏輯
      if (!otp) {
        // 生成OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6位隨機數
        const otpKey = `otp:${email}:${path}`;
        await env.PAYMENT_RECORDS.put(otpKey, otpCode, { expirationTtl: 600 }); // 10分鐘過期

        // 發送email使用Mailchannels
        try {
          const mailchannelsResponse = await fetch('https://api.mailchannels.net/tx/v1/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{
                to: [{ email: email, name: '' }],
              }],
              from: { email: 'no-reply@haee.dpdns.org', name: 'Hao' }, // 替換成你的Custom Address
              subject: '您的內容解鎖驗證碼',
              content: [{
                type: 'text/plain',
                value: `您的驗證碼是: ${otpCode}\n有效期10分鐘。\n如果不是您操作，請忽略。`,
              }],
            }),
          });

          if (!mailchannelsResponse.ok) {
            const errorText = await mailchannelsResponse.text();
            console.error('Mailchannels error:', errorText);
            return new Response(JSON.stringify({ error: '無法發送驗證碼，請檢查email或稍後重試' }), { status: 500 });
          }
          console.log('Email sent successfully via Mailchannels');
        } catch (error) {
          console.error('Mailchannels sending failed:', error);
          return new Response(JSON.stringify({ error: '伺服器錯誤，無法發送email' }), { status: 500 });
        }

        return new Response(JSON.stringify({ message: 'OTP 已發送到您的email，請輸入驗證碼' }), { status: 200 });
      }

      // 如果有otp，驗證它
      const otpKey = `otp:${email}:${path}`;
      const storedOtp = await env.PAYMENT_RECORDS.get(otpKey);
      if (storedOtp !== otp) {
        return new Response(JSON.stringify({ error: '無效的驗證碼' }), { status: 401 });
      }
      // 驗證通過，刪除OTP
      await env.PAYMENT_RECORDS.delete(otpKey);
    }

    if (!finalToken) {
      return new Response(JSON.stringify({ error: '缺少 token 或 email' }), { status: 401 });
    }

    // 原 JWT 驗證邏輯
    const parts = finalToken.split('.');
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: 'token 格式錯誤' }), { status: 401 });
    }
    const [hB64, pB64, sig] = parts;
    const data = `${hB64}.${pB64}`;

    // 簽名驗證
    const JWT_SECRET = env.JWT_SIGNING_KEY;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      Uint8Array.from(
        atob(sig.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      ),
      new TextEncoder().encode(data)
    );
    if (!valid) {
      return new Response(JSON.stringify({ error: '無效的 token' }), { status: 401 });
    }

    // 解析 payload
    let payload;
    try {
      const json = atob(pB64.replace(/-/g, '+').replace(/_/g, '/'));
      payload = JSON.parse(json);
    } catch {
      return new Response(JSON.stringify({ error: '無法解析 token' }), { status: 401 });
    }

    if (payload.path !== path) {
      return new Response(JSON.stringify({ error: 'Path 不匹配' }), { status: 403 });
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return new Response(JSON.stringify({ error: 'token 已過期' }), { status: 401 });
    }

    // 從 KV 讀取內容
    const html = await env.SECURE_CONTENT.get(`content:${path}`);
    if (!html) {
      return new Response(JSON.stringify({ error: '文章未找到' }), { status: 404 });
    }

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err) {
    console.error('[verify] error:', err);
    return new Response(JSON.stringify({ error: '伺服器錯誤，請稍後重試' }), { status: 500 });
  }
}