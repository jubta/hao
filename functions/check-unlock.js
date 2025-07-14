// functions/check-unlock.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, userId } = await request.json();
    if (!path) {
      return new Response(JSON.stringify({ error: '缺少 path' }), { status: 400 });
    }

    const kvKey = userId ? `unlock:${userId}:${path}` : `unlock:guest:${path}`;
    const html = await env.SECURE_CONTENT.get(kvKey);
    if (html) {
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response(JSON.stringify({ error: '未解鎖' }), { status: 404 });
  } catch (err) {
    console.error('[check-unlock] error:', err);
    return new Response(JSON.stringify({ error: '伺服器錯誤，請稍後重試' }), { status: 500 });
  }
}