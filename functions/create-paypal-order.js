// functions/create-paypal-order.js (王者歸來版)

// 我們把高效的、帶快取的 getAccessToken 函數也放在這裡
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

export async function onRequestPost(context) {
    const { request, env } = context;
    const { articlePath, price, currency } = await request.json();

    try {
        const accessToken = await getAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET, env);
        if (!accessToken) throw new Error('後端錯誤：無法獲取 PayPal Access Token。');

        const apiUrl = 'https://api-m.sandbox.paypal.com/v2/checkout/orders';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({
                intent: 'CREATE_ORDER', // 我們只是創建訂單，不捕獲
                purchase_units: [{
                    amount: {
                        currency_code: currency,
                        value: price
                    },
                    custom_id: articlePath
                }]
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error('PayPal 創建訂單失敗: ' + (data.details ? data.details[0].description : '未知原因'));
        
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
        console.error("Create Order Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}