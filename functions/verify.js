// functions/verify.js - (PayPal 方案專用版)：只負責 Cookie 和密碼

// --- 全局設定 ---
const RATE_LIMIT_THRESHOLD = 5;
const RATE_LIMIT_TTL = 3600;
const COOKIE_SECRET_KEY = 'F0u5beoiCxQBTsTwbQMMZ5tbGR9sf60NM0FOMgd6PFBH0UqEZxMWzH14i8dsP6'; // **重要：請務必換成你自己的隨機長字串！**

// --- 輔助函數 ---
// 創建帶簽名的 Cookie
async function createSignedCookie(path, secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(path + secret);
    const signature = await crypto.subtle.digest('SHA-256', data);
    const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${path}|${signatureHex}`;
}

// 驗證帶簽名的 Cookie
async function verifySignedCookie(cookieValue, secret) {
    const parts = cookieValue.split('|');
    if (parts.length !== 2) return null;
    const [path, signature] = parts;
    const expectedCookie = await createSignedCookie(path, secret);
    return cookieValue === expectedCookie ? path : null;
}

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

// --- 主處理函數 ---
export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        // 注意：我們不再需要從 body 中解構 unlockSession 了
        const { path, password, turnstileToken } = await request.json();

        // --- 1. 檢查是否有永久訪問的 Cookie (針對已付費用戶的後續訪問) ---
        const cookieHeader = request.headers.get('Cookie');
        if (cookieHeader) {
            const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=').map(decodeURIComponent)));
            const accessCookie = cookies[`access_token_${path.replace(/\//g, '_')}`];
            
            if (accessCookie) {
                const verifiedPath = await verifySignedCookie(accessCookie, COOKIE_SECRET_KEY);
                if (verifiedPath === path) {
                    // Cookie 有效，直接回傳內容，任務完成！
                    const storedContent = await env.SECURE_CONTENT.get(`content:${path}`);
                    return new Response(storedContent, { status: 200 });
                }
            }
        }
        
        // --- 如果沒有有效 Cookie，則執行密碼文章的驗證邏輯 ---
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown_ip';
        
        // 速率限制檢查
        const rateLimitKey = `rl:${clientIp}:${path}`;
        let attempts = (await env.SECURE_CONTENT.get(rateLimitKey, { type: 'json' })) || { count: 0 };
        if (attempts.count >= RATE_LIMIT_THRESHOLD) {
            return new Response(JSON.stringify({ error: `嘗試次數過多，請稍後再試。` }), { status: 429 });
        }
        
        // Turnstile 檢查
        if (!turnstileToken) {
            return new Response(JSON.stringify({ error: '缺少驗證，請刷新頁面重試。' }), { status: 400 });
        }
        const isHuman = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, clientIp);
        if (!isHuman) {
            attempts.count++;
            await env.SECURE_CONTENT.put(rateLimitKey, JSON.stringify(attempts), { expirationTtl: RATE_LIMIT_TTL });
            return new Response(JSON.stringify({ error: '機器人驗證失敗。' }), { status: 403 });
        }
        
        // 密碼檢查
        if (!path || !password) {
            // 如果請求是針對密碼文章但沒帶密碼，這是一個正常情況，不應報錯。
            // 我們可以返回一個提示，或保持靜默。這裡我們返回一個清晰的錯誤。
            return new Response(JSON.stringify({ error: '請輸入密碼。' }), { status: 400 });
        }
        const passwordKey = `password:${path}`;
        const contentKey = `content:${path}`;
        const storedPassword = await env.SECURE_CONTENT.get(passwordKey);
        
        if (!storedPassword || storedPassword !== password) {
            attempts.count++;
            await env.SECURE_CONTENT.put(rateLimitKey, JSON.stringify(attempts), { expirationTtl: RATE_LIMIT_TTL });
            return new Response(JSON.stringify({ error: '密碼不正確。' }), { status: 401 });
        }
        
        // 密碼正確，清除計數器並返回內容
        await env.SECURE_CONTENT.delete(rateLimitKey);
        const storedContent = await env.SECURE_CONTENT.get(contentKey);
        if (!storedContent) return new Response(JSON.stringify({ error: '找不到對應的文章內容。' }), { status: 404 });
        return new Response(storedContent, { status: 200, headers: { 'Content-Type': 'text/html' } });

    } catch (error) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: '伺服器內部錯誤。' }), { status: 500 });
    }
}