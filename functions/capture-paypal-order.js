// functions/capture-paypal-order.js
async function getAccessToken(clientId, clientSecret) { /* ... 同上 ... */ }
async function createSignedCookie(path, secret) { /* ... 同上 ... */ }

const COOKIE_SECRET_KEY = 'F0u5beoiCxQBTsTwbQMMZ5tbGR9sf60NM0FOMgd6PFBH0UqEZxMWzH14i8dsP6'; // **重要：請務必換成你自己的隨機長字串！**

export async function onRequestPost(context) {
    const { request, env } = context;
    const { orderID, articlePath } = await request.json();
    const accessToken = await getAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);
    const url = `https://api.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`;
    
    const captureResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const captureData = await captureResponse.json();
    
    // 檢查收款是否真的成功
    if (captureData.status === 'COMPLETED') {
        const storedContent = await env.SECURE_CONTENT.get(`content:${articlePath}`);
        if (!storedContent) return new Response('Content not found', { status: 404 });

        // 創建永久訪問 Cookie
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
// ... 此處省略 getAccessToken 和 createSignedCookie 函數的重複程式碼 ...