// functions/create-paypal-order.js (帶詳細錯誤回報的終極版)

async function getAccessToken(clientId, clientSecret) {
    const auth = btoa(`${clientId}:${clientSecret}`);
    const url = 'https://api-m.sandbox.paypal.com/v1/oauth2/token'; 
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}`},
            body: 'grant_type=client_credentials'
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        return null;
    }
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