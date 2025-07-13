// functions/verify.js
// ———————————
// 负责：验证前端发来的 JWT，返回文章 HTML
// ———————————

export async function onRequestPost({ request, env }) {
  // 1) 获取请求体中的 path 和 token
  const { path, token } = await request.json();
  if (!token) {
    return new Response(JSON.stringify({ error: '缺少 token。' }), { status: 401 });
  }

  // 2) 拆分 JWT（header.payload.signature）
  const parts = token.split('.');
  if (parts.length !== 3) {
    return new Response(JSON.stringify({ error: 'token 格式错误。' }), { status: 401 });
  }
  const [hB64, pB64, sig] = parts;
  const data = `${hB64}.${pB64}`;

  // 3) 签名验证
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
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  // 4) 解析 payload 并检查 path 与 exp
  let payload;
  try {
    const json = atob(pB64.replace(/-/g, '+').replace(/_/g, '/'));
    payload = JSON.parse(json);
  } catch {
    return new Response(JSON.stringify({ error: '无法解析 token。' }), { status: 401 });
  }

  if (payload.path !== path) {
    return new Response(JSON.stringify({ error: 'Path mismatch' }), { status: 403 });
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return new Response(JSON.stringify({ error: 'Token expired' }), { status: 401 });
  }

  // 5) 从 KV 读取文章内容并返回
  const html = await env.SECURE_CONTENT.get(`content:${path}`);
  if (!html) {
    return new Response(JSON.stringify({ error: '文章未找到。' }), { status: 404 });
  }

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}