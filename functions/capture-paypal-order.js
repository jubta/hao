// functions/capture-paypal-order.js (終極校對、帶快取優化)

async function getAccessToken(clientId, clientSecret, env) {
    // 1. 先嘗試從 KV 快取中讀取 token
    let token = await env.SECURE_CONTENT.get('paypal_access_token', { type: 'json' });
    if (token && token.expires_at > Date.now()) {
        return token.access_token;
    }

    // 2. 如果快取中沒有，或已過期，才去請求新的
    const auth = btoa(`${clientId}:${clientSecret}`);
    const url = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}`},
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) return null;
    const data = await response.json();
    
    // 3. 將新的 token 存入 KV 快取，並設定過期時間
    const new_token = {
        access_token: data.access_token,
        // 讓它在 8 小時後過期 (PayPal token 通常是 9 小時)
        expires_at: Date.now() + 8 * 60 * 60 * 1000 
    };
    await env.SECURE_CONTENT.put('paypal_access_token', JSON.stringify(new_token));

    return new_token.access_token;
}

async function createSignedCookie(path, secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(path + secret);
    const signature = await crypto.subtle.digest('SHA-256', data);
    const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${path}|${signatureHex}`;
}

// --- 全局設定 ---
const COOKIE_SECRET_KEY = 'a-very-long-and-random-secret-string-for-your-cookie-signature'; // **重要：請務必換成你自己的隨機長字串！**


// --- 主處理函數 ---
export async function onRequestPost(context) {
    const { request, env } = context;
    const { orderID, articlePath } = await request.json();
    
    const accessToken = await getAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);
    if (!accessToken) return new Response('Could not get access token', { status: 500 });
    
    // 強制使用沙箱 URL
    const apiUrl = `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`;

    const captureResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }
    });

    const captureData = await captureResponse.json();
    
    if (captureData.status === 'COMPLETED') {
        const storedContent = await env.SECURE_CONTENT.get(`content:${articlePath}`);
        if (!storedContent) {
            return new Response('付款成功，但找不到文章。請聯繫管理員。', { status: 404 });
        }

        const cookieValue = await createSignedCookie(articlePath, COOKIE_SECRET_KEY);
        const cookieName = `access_token_${articlePath.replace(/\//g, '_')}`;
        const headers = new Headers();
        headers.set('Content-Type', 'text/html');
        headers.set('Set-Cookie', `${cookieName}=${encodeURIComponent(cookieValue)}; Path=${articlePath}; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
        
        return new Response(storedContent, { status: 200, headers });

    } else {
        return new Response('Payment capture failed.', { status: 400 });
    }
}