// functions/verify.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, token, email, googleToken } = await request.json();
    if (!path) {
      return new Response(JSON.stringify({ error: '缺少 path' }), { status: 401 });
    }

    // 新增: 全局IP防刷 (每小時限50次/ IP全站)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const globalRateKey = `global-rate:${ip}`;
    const globalRate = await env.PAYMENT_RECORDS.get(globalRateKey, { type: 'json' }) || { count: 0, timestamp: Date.now() };
    if (Date.now() - globalRate.timestamp < 3600000 && globalRate.count >= 50) {
      console.log('Global rate limit exceeded for IP:', ip);
      return new Response(JSON.stringify({ error: '全局請求太頻繁，請稍後重試（1小時後）' }), { status: 429 });
    }
    globalRate.count++;
    globalRate.timestamp = Date.now();
    await env.PAYMENT_RECORDS.put(globalRateKey, JSON.stringify(globalRate), { expirationTtl: 3600 });

    // 新增: path限速 (每小時限10次/ path + IP)
    const pathRateKey = `path-rate:${ip}:${path}`;
    const pathRate = await env.PAYMENT_RECORDS.get(pathRateKey, { type: 'json' }) || { count: 0, timestamp: Date.now() };
    if (Date.now() - pathRate.timestamp < 3600000 && pathRate.count >= 10) {
      console.log('Path rate limit exceeded for IP:', ip, 'path:', path);
      return new Response(JSON.stringify({ error: '此文章請求太頻繁，請稍後重試（1小時後）' }), { status: 429 });
    }
    pathRate.count++;
    pathRate.timestamp = Date.now();
    await env.PAYMENT_RECORDS.put(pathRateKey, JSON.stringify(pathRate), { expirationTtl: 3600 });

    let finalToken = token;

    // 如果有 googleToken，驗證它並檢查 email 匹配
    if (googleToken) {
      // 新增: email驗證限 (每小時限3次/ email)
      const emailRateKey = `email-rate:${email}`;
      const emailRate = await env.PAYMENT_RECORDS.get(emailRateKey, { type: 'json' }) || { count: 0, timestamp: Date.now() };
      if (Date.now() - emailRate.timestamp < 3600000 && emailRate.count >= 3) {
        console.log('Email rate limit exceeded for email:', email);
        return new Response(JSON.stringify({ error: '此 email 驗證太頻繁，請稍後重試（1小時後）' }), { status: 429 });
      }
      emailRate.count++;
      emailRate.timestamp = Date.now();
      await env.PAYMENT_RECORDS.put(emailRateKey, JSON.stringify(emailRate), { expirationTtl: 3600 });

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
      // 驗證通過，從 KV 取 token (加快取)
      const key = `payment:${email}:${path}`;
      const cache = caches.default;
      const tokenCacheKey = new URL(`https://cache.example.com/token-cache${key}`, 'https://haee.dpdns.org');
      let cachedToken = await cache.match(tokenCacheKey);
      if (cachedToken) {
        finalToken = await cachedToken.text();
        console.log('Token loaded from cache for key:', key);
      } else {
        finalToken = await env.PAYMENT_RECORDS.get(key);
        if (finalToken) {
          await cache.put(tokenCacheKey, new Response(finalToken, { headers: { 'Cache-Control': 'max-age=3600' } })); // 快取1小時
          console.log('Token loaded from KV and cached for key:', key);
        } else {
          return new Response(JSON.stringify({ error: '未找到付款記錄' }), { status: 401 });
        }
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