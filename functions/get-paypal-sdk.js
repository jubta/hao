// functions/get-paypal-sdk.js

export async function onRequestGet(context) {
    const { request, env } = context;
    
    // 從請求的 URL 中獲取 client-id 和 currency 參數
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client-id');
    const currency = url.searchParams.get('currency');

    if (!clientId || !currency) {
        return new Response('Missing client-id or currency parameter', { status: 400 });
    }

    // 在伺服器端構建真正的 PayPal SDK URL
    const paypalSdkUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}¤cy=${currency}`;

    try {
        // 在後端發起請求，獲取 PayPal 的腳本內容
        // 我們傳遞原始請求的 headers，有助於 PayPal 進行地區判斷
        const response = await fetch(paypalSdkUrl, { headers: request.headers });

        if (!response.ok) {
            // 如果請求失敗，將錯誤回傳給前端
            return new Response(response.body, { status: response.status, headers: response.headers });
        }

        // 獲取腳本內容
        const scriptContent = await response.text();

        // 將腳本內容回傳給前端，並設置正確的 Content-Type
        const headers = new Headers();
        headers.set('Content-Type', 'application/javascript; charset=utf-8');
        // 設置一個較短的快取時間
        headers.set('Cache-Control', 'public, max-age=600'); 

        return new Response(scriptContent, { headers });

    } catch (error) {
        return new Response(`Failed to fetch PayPal SDK: ${error.message}`, { status: 500 });
    }
}