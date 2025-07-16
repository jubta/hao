// functions/verify.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, token } = await request.json();
    if (!path || !token) {
      return new Response(JSON.stringify({ error: '缺少 path 或 token' }), { status: 401 });
    }

    // 新增：如果token是"firebase"，直接通過（假設前端已驗證購買）
    if (token === "firebase") {
      const html = await env.SECURE_CONTENT.get(`content:${path}`);
      if (!html) {
        return new Response(JSON.stringify({ error: '文章未找到' }), { status: 404 });
      }
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // 原本JWT驗證邏輯
    const parts = token.split('.');
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