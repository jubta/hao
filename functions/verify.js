// functions/verify.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, token, email, googleToken, turnstileToken } = await request.json();
    if (!path) {
      return new Response(JSON.stringify({ error: '缺少 path' }), { status: 401 });
    }

    // 新增: Turnstile 驗證 (防機器人)
    if (turnstileToken) {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: `secret=${env.TURNSTILE_SECRET_KEY}&response=${turnstileToken}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const outcome = await verifyRes.json();
      if (!outcome.success) {
        return new Response(JSON.stringify({ error: 'Turnstile 驗證失敗，請重試' }), { status: 401 });
      }
    }

    let finalToken = token;

    // 如果有 googleToken，驗證它並檢查 email 匹配
    if (googleToken) {
      // 驗證 Google token
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`);
      if (!googleRes.ok) {
        const errText = await googleRes.text();
        console.error('Google tokeninfo error:', errText);
        return new Response(JSON.stringify({ error: 'Google token 無效: ' + errText }), { status: 401 });
      }
      const googleData = await googleRes.json();
      if (googleData.email !== email) {
        return new Response(JSON.stringify({ error: 'Google 帳號 email 不匹配輸入的 email' }), { status: 401 });
      }
      // 驗證通過，從 KV 取 token
      const key = `payment:${email}:${path}`;
      finalToken = await env.PAYMENT_RECORDS.get(key);
      if (!finalToken) {
        return new Response(JSON.stringify({ error: '未找到付款記錄' }), { status: 401 });
      }
    } else if (email) {
      // 無 googleToken，只檢查是否有記錄 (用於前端檢查)
      const key = `payment:${email}:${path}`;
      const existingToken = await env.PAYMENT_RECORDS.get(key);
      if (existingToken) {
        return new Response(JSON.stringify({ hasRecord: true }), { status: 200 });
      } else {
        return new Response(JSON.stringify({ error: '未找到付款記錄' }), { status: 401 });
      }
    }

    if (!finalToken) {
      return new Response(JSON.stringify({ error: '缺少 token 或驗證' }), { status: 401 });
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

    // 新增: KV 優化 - 用 Cache API 快取內容 (減讀次數)
    const cache = caches.default;
    let html = await cache.match(`content-cache:${path}`);
    if (!html) {
      html = await env.SECURE_CONTENT.get(`content:${path}`);
      if (html) {
        await cache.put(`content-cache:${path}`, new Response(html, { headers: { 'Cache-Control': 'max-age=3600' } })); // 快取1小時
      } else {
        return new Response(JSON.stringify({ error: '文章未找到' }), { status: 404 });
      }
    } else {
      html = await html.text(); // 從快取取
    }

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err) {
    console.error('[verify] error:', err);
    return new Response(JSON.stringify({ error: '伺服器錯誤，請稍後重試: ' + err.message }), { status: 500 });
  }
}