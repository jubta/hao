// functions/capture-paypal-order.js (修正版)

// --- 輔助函數 ---
async function getAccessToken(clientId, clientSecret, env) {
    const auth = btoa(`${clientId}:${clientSecret}`);
    const url = env.CF_PAGES_BRANCH === 'main' 
        ? 'https://api-m.paypal.com/v1/oauth2/token' // 正式環境
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token'; // 沙箱環境
        
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`
        },
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

const COOKIE_SECRET_KEY = 'a-very-long-and-random-secret-string-for-your-cookie-signature'; // **重要：請務必換成你自己的隨機長字串！**

export async function onRequestPost(context) {
    const { request, env } = context;
    const { orderID, articlePath } = await request.json();
    
    const accessToken = await getAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET, env);
    if (!accessToken) return new Response('Could not get access token', { status: 500 });
    
    const apiUrl = env.CF_PAGES_BRANCH === 'main'
        ? `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture` // 正式
        : `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`; // 沙箱

    const captureResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const captureData = await captureResponse.json();
    
    if (captureData.status === 'COMPLETED') {
        const storedContent = await env.SECURE_CONTENT.get(`content:${articlePath}`);
        if (!storedContent) return new Response('Content not found', { status: 404 });

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