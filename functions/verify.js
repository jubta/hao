// functions/verify.js - 速率限制 + Turnstile + 密碼 & 支付解鎖

// --- 全局設定 ---
const RATE_LIMIT_THRESHOLD = 5; // 限制：每分鐘最多嘗試 5 次
const RATE_LIMIT_TTL = 3600;      // TTL：計數器在 KV 中存活 3600 秒 (1小時)

async function verifyTurnstile(token, secretKey, remoteIp) {
  const resp = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: remoteIp,
      }),
    }
  )
  const data = await resp.json()
  return data.success
}

// functions/verify.js
// ———————————
// 负责：验证前端发来的 JWT，返回文章 HTML
// ———————————

export async function onRequestPost({ request, env }) {
  const { path, token } = await request.json();
  if (!token) {
    return new Response(JSON.stringify({ error: '缺少 token。' }), { status: 401 });
  }

  // 拆分 JWT
  const [hB64, pB64, sig] = token.split('.');
  const data = `${hB64}.${pB64}`;

  // 验签
  const JWT_SECRET = env.JWT_SIGNING_KEY;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(JWT_SECRET),
    { name:'HMAC', hash:'SHA-256' }, false, ['verify']
  );
  const valid = await crypto.subtle.verify(
    'HMAC', key,
    Uint8Array.from(atob(sig.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0)),
    new TextEncoder().encode(data)
  );
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  // 解码 payload
  const payload = JSON.parse(atob(pB64.replace(/-/g,'+').replace(/_/g,'/')));
  if (payload.path !== path) {
    return new Response(JSON.stringify({ error: 'Path mismatch' }), { status: 403 });
  }
  if (payload.exp < Math.floor(Date.now()/1000)) {
    return new Response(JSON.stringify({ error: 'Token expired' }), { status: 401 });
  }

  // 从 KV 读文章内容
  const html = await env.SECURE_CONTENT.get(`content:${path}`);
  if (!html) {
    return new Response(JSON.stringify({ error: '文章未找到。' }), { status: 404 });
  }

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

    // === 人機 + 密碼保護流程 ===
    const clientIp =
      request.headers.get('CF-Connecting-IP') || 'unknown_ip'

    // 1. 速率限制
    const rlKey = `rl:${clientIp}:${path}`
    let attempts =
      (await env.SECURE_CONTENT.get(rlKey, { type: 'json' })) || { count: 0 }
    if (attempts.count >= RATE_LIMIT_THRESHOLD) {
      return new Response(
        JSON.stringify({ error: '嘗試次數過多，請稍後再試。' }),
        { status: 429 }
      )
    }

    // 2. Turnstile
    if (!turnstileToken) {
      return new Response(
        JSON.stringify({ error: '缺少驗證，請刷新頁面重試。' }),
        { status: 400 }
      )
    }
    const human = await verifyTurnstile(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      clientIp
    )
    if (!human) {
      attempts.count++
      await env.SECURE_CONTENT.put(
        rlKey,
        JSON.stringify(attempts),
        { expirationTtl: RATE_LIMIT_TTL }
      )
      return new Response(
        JSON.stringify({ error: '機器人驗證失敗。' }),
        { status: 403 }
      )
    }

    // 3. 密碼驗證
    if (!password) {
      return new Response(
        JSON.stringify({ error: '請求缺少路徑或密碼。' }),
        { status: 400 }
      )
    }
    const pwdKey = `password:${path}`
    const storedPwd = await env.SECURE_CONTENT.get(pwdKey)
    if (storedPwd !== password) {
      attempts.count++
      await env.SECURE_CONTENT.put(
        rlKey,
        JSON.stringify(attempts),
        { expirationTtl: RATE_LIMIT_TTL }
      )
      return new Response(
        JSON.stringify({ error: '密碼不正確。' }),
        { status: 401 }
      )
    }

    // 清除計數器 & 回傳文章
    await env.SECURE_CONTENT.delete(rlKey)
    const article = await env.SECURE_CONTENT.get(`content:${path}`)
    if (!article) {
      return new Response(
        JSON.stringify({ error: '找不到對應的文章內容。' }),
        { status: 404 }
      )
    }
    return new Response(article, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (err) {
    console.error('Function Error:', err)
    return new Response(
      JSON.stringify({ error: '伺服器內部錯誤。' }),
      { status: 500 }
    )
  }
}