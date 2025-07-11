// functions/capture-paypal-order.js (強制沙箱修正版)

async function getAccessToken(clientId, clientSecret) { /* ... 此處省略，因為上面已經定義 ... */ }
async function createSignedCookie(path, secret) { /* ... 此處省略 ... */ }
const COOKIE_SECRET_KEY = 'a-very-long-and-random-secret-string-for-your-cookie-signature';

// 我們需要把輔助函數也複製過來
async function getAccessToken(clientId, clientSecret) {
    const auth = btoa(`${clientId}:${clientSecret}`);
    const url = 'https://api-m.sandbox.paypal.com/v1/oauth2/token'; 
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}`},
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
}

async function createSignedCookie(path, secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(path + secret);
    const signature = await crypto.subtle.digest('SHA-256', data);
    const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${path}|${signatureHex}`;
}

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
        if (!storedContent) return new Response('付款成功，但找不到文章。', { status: 404 });

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