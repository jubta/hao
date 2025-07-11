// functions/create-paypal-order.js (帶 Access Token 快取的高效版)

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

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { articlePath, price, currency } = await request.json();
        
        const accessToken = await getAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);
        if (!accessToken) {
            // 如果拿不到 token，返回詳細錯誤
            return new Response(JSON.stringify({ error: "後端錯誤：無法從 PayPal 獲取 Access Token。請檢查 Client ID 和 Secret 是否正確。" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        
        const apiUrl = 'https://api-m.sandbox.paypal.com/v2/checkout/orders';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{ amount: { currency_code: currency, value: price }, custom_id: articlePath }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            // 如果創建訂單失敗，返回 PayPal 給的詳細錯誤
            return new Response(JSON.stringify({ error: "後端錯誤：PayPal 創建訂單失敗。", details: data }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
        }

        // 成功，返回訂單數據
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
        return new Response(JSON.stringify({ error: "後端發生未知錯誤。", details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}