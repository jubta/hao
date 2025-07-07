// functions/verify.js - 帶有 Turnstile 保護的增強版

// Turnstile 驗證函數
async function verifyTurnstile(token, secretKey, remoteIp) {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            secret: secretKey,
            response: token,
            remoteip: remoteIp,
        }),
    });
    const data = await response.json();
    return data.success;
}

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { path, password, turnstileToken } = await request.json();
        const clientIp = request.headers.get('CF-Connecting-IP'); // 獲取使用者 IP

        // 1. 進行 Turnstile 驗證
        if (!turnstileToken) {
            return new Response(JSON.stringify({ error: '缺少驗證，請刷新頁面重試。' }), { status: 400 });
        }
        const isHuman = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, clientIp);
        if (!isHuman) {
            return new Response(JSON.stringify({ error: '機器人驗證失敗。' }), { status: 403 });
        }

        // --- Turnstile 驗證通過後，才執行原來的密碼驗證邏輯 ---
        if (!path || !password) {
            return new Response(JSON.stringify({ error: '請求缺少路徑或密碼。' }), { status: 400 });
        }
        
        const passwordKey = `password:${path}`;
        const contentKey = `content:${path}`;
        const storedPassword = await env.SECURE_CONTENT.get(passwordKey);

        if (!storedPassword || storedPassword !== password) {
            return new Response(JSON.stringify({ error: '密碼不正確。' }), { status: 401 });
        }

        const storedContent = await env.SECURE_CONTENT.get(contentKey);
        if (!storedContent) {
            return new Response(JSON.stringify({ error: '找不到對應的文章內容。' }), { status: 404 });
        }

        return new Response(storedContent, { status: 200, headers: { 'Content-Type': 'text/html' } });

    } catch (error) {
        return new Response(JSON.stringify({ error: '伺服器內部錯誤。' }), { status: 500 });
    }
}