// functions/create-paypal-order.js
async function getAccessToken(clientId, clientSecret) { /* ... 獲取 token 的輔助函數 ... */ }

export async function onRequestPost(context) {
    const { request, env } = context;
    const { articlePath, price, currency } = await request.json();
    
    // 為了安全，我們不信任前端傳來的價格，而是從一個安全的地方讀取，
    // 但為了簡化，我們先暫時相信它。
    
    const accessToken = await getAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);
    const url = 'https://api.sandbox.paypal.com/v2/checkout/orders'; // 沙箱 URL

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: price
                },
                // 將文章路徑存入 custom_id 以便追蹤
                custom_id: articlePath 
            }]
        })
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

// 獲取 Access Token 的輔助函數
async function getAccessToken(clientId, clientSecret) {
    const auth = btoa(`${clientId}:${clientSecret}`);
    const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
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