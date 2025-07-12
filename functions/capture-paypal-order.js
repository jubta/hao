// functions/capture-paypal-order.js (王者歸來最終版)

const COOKIE_SECRET_KEY = 'F0u5beoiCxQBTsTwbQMMZ5tbGR9sf60NM0FOMgd6PFBH0UqEZxMWzH14i8dsP6'; // 使用你自己的密鑰

// 輔助函數：帶快取的 getAccessToken
async function getAccessToken(clientId, clientSecret, env) {
    const cacheKey = 'paypal_access_token';
    let token = await env.SECURE_CONTENT.get(cacheKey, { type: 'json' });
    if (token && token.expires_at > Date.now()) {
        return token.access_token;
    }
    const auth = btoa(`${clientId}:${clientSecret}`);
    const url = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}`},
        body: 'grant_type=client_credentials'
    });
    if (!response.ok) return null;
    const data = await response.json();
    const newToken = {
        access_token: data.access_token,
        expires_at: Date.now() + (data.expires_in - 300) * 1000
    };
    await env.SECURE_CONTENT.put(cacheKey, JSON.stringify(newToken));
    return newToken.access_token;
}

// 輔助函數：創建帶簽名的 Cookie
async function createSignedCookie(path, secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(path + secret);
    const signature = await crypto.subtle.digest('SHA-256', data);
    return `${path}|${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

// 主處理函數
export async function onRequestPost(context) {
    const { request, env } = context;
    const { orderID, articlePath } = await request.json();

    try {
        const accessToken = await getAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET, env);
        if (!accessToken) throw new Error('後端錯誤：無法獲取 PayPal Access Token。');
        
        const apiUrl = `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`;
        const captureResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }
        });

        const captureData = await captureResponse.json();
        if (captureData.status !== 'COMPLETED') {
            throw new Error('PayPal 收款失敗或未完成: ' + (captureData.details ? captureData.details[0].description : '未知原因'));
        }
        
        const storedContent = await env.SECURE_CONTENT.get(`content:${articlePath}`);
        if (!storedContent) throw new Error('付款成功，但後端找不到對應的文章內容。');
        
        const cookieValue = await createSignedCookie(articlePath, COOKIE_SECRET_KEY);
        const cookieName = `access_token_${articlePath.replace(/\//g, '_')}`;
        const headers = new Headers();
        headers.set('Content-Type', 'text/html');
        headers.set('Set-Cookie', `${cookieName}=${encodeURIComponent(cookieValue)}; Path=${articlePath}; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
        
        return new Response(storedContent, { status: 200, headers });

    } catch (err) {
        console.error("Capture Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}