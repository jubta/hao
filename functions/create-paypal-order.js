// functions/create-paypal-order.js (修正版)

// 獲取 Access Token 的輔助函數
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

export async function onRequestPost(context) {
    const { request, env } = context;
    const { articlePath, price, currency } = await request.json();
    
    const accessToken = await getAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET, env);
    if (!accessToken) return new Response('Could not get access token', { status: 500 });
    
    const apiUrl = env.CF_PAGES_BRANCH === 'main' 
        ? 'https://api-m.paypal.com/v2/checkout/orders' // 正式環境
        : 'https://api-m.sandbox.paypal.com/v2/checkout/orders'; // 沙箱環境

    const response = await fetch(apiUrl, {
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
                custom_id: articlePath 
            }]
        })
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}