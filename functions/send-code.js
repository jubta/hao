export async function onRequestPost({ request, env }) {
  try {
    const { email, path, turnstileToken } = await request.json();
    if (!email || !path || !turnstileToken) {
      return new Response(JSON.stringify({ error: '缺少 email, path 或 CAPTCHA' }), { status: 400 });
    }

    // 驗證 Turnstile CAPTCHA
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: turnstileToken })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return new Response(JSON.stringify({ error: 'CAPTCHA 驗證失敗' }), { status: 400 });
    }

    // Rate limit: 檢查 KV 計數
    const rateKey = `rate:${email}:codes`;
    let count = await env.PAYMENT_RECORDS.get(rateKey) || 0;
    count = parseInt(count);
    if (count >= 3) {
      return new Response(JSON.stringify({ error: '請求過多，請 1 小時後再試' }), { status: 429 });
    }
    await env.PAYMENT_RECORDS.put(rateKey, count + 1, { expirationTtl: 3600 }); // 1 小時重置

    // 生成 code
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 位
    const codeKey = `code:${email}:${path}`;
    await env.PAYMENT_RECORDS.put(codeKey, code, { expirationTtl: 600 }); // 10 分過期

    // 發 email 用 Mailchannels
    const mailchannelsRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email, name: 'User' }]
        }],
        from: { email: 'no-reply@yourdomain.com', name: 'Your Blog' }, // 替換你的域名 email
        subject: '您的解鎖碼',
        content: [{
          type: 'text/plain',
          value: `您的解鎖碼是: ${code} (10 分鐘有效)`
        }]
      })
    });

    if (!mailchannelsRes.ok) {
      const errText = await mailchannelsRes.text();
      console.error('Mailchannels 錯誤:', errText);
      return new Response(JSON.stringify({ error: '發送 code 失敗' }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Code 已發送到您的 email' }), { status: 200 });
  } catch (err) {
    console.error('send-code 錯誤:', err);
    return new Response(JSON.stringify({ error: '伺服器錯誤' }), { status: 500 });
  }
}