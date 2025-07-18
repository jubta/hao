// functions/verify.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, token, email, googleToken } = await request.json();
    if (!path) {
      return new Response(JSON.stringify({ error: '缺少 path' }), { status: 401 });
    }

    // 新增: rate limit 防刷 (每小時限10次/ path + IP)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'; // 取用戶IP
    const rateKey = `rate:${ip}:${path}`;
    const rate = await env.PAYMENT_RECORDS.get(rateKey, { type: 'json' }) || { count: 0, timestamp: Date.now() };
    if (Date.now() - rate.timestamp < 3600000 && rate.count >= 10) { // 1小時 >=10次，擋
      console.log('Rate limit exceeded for IP:', ip, 'path:', path); // Log
      return new Response(JSON.stringify({ error: '請求太頻繁，請稍後重試（1小時後）' }), { status: 429 });
    }
    rate.count++;
    rate.timestamp = Date.now();
    await env.PAYMENT_RECORDS.put(rateKey, JSON.stringify(rate), { expirationTtl: 3600 }); // 1小時過期

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

    // 新增: KV 優化 - 用 Cache API 快取內容 (修復Invalid URL，用完整URL key)
    console.log('Fetching content for path:', path); // Debug log
    const cache = caches.default;
    const cacheKey = new URL(`https://cache.example.com/content-cache${path}`, 'https://haee.dpdns.org'); // 修復: 用完整URL key
    let htmlResponse = await cache.match(cacheKey);
    let html;
    if (htmlResponse) {
      html = await htmlResponse.text();
      console.log('Content loaded from cache'); // Debug log
    } else {
      html = await env.SECURE_CONTENT.get(`content:${path}`);
      if (html) {
        await cache.put(cacheKey, new Response(html, { headers: { 'Cache-Control': 'max-age=3600' } })); // 快取1小時
        console.log('Content loaded from KV and cached'); // Debug log
      } else {
        console.error('Content not found in KV'); // Debug log
        return new Response(JSON.stringify({ error: '文章未找到' }), { status: 404 });
      }
    }

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err) {
    console.error('[verify] error:', err.message, err.stack); // 加強log
    return new Response(JSON.stringify({ error: '伺服器錯誤，請稍後重試: ' + err.message }), { status: 500 });
  }
}