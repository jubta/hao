// functions/get-paypal-sdk.js (極簡版)
export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client-id');

    if (!clientId) {
        return new Response("後端錯誤：前端沒有傳來 client-id。", { status: 400 });
    }

    // 看！URL 裡也只有 client-id
    const paypalSdkUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}`;

    try {
        const response = await fetch(paypalSdkUrl);
        if (!response.ok) {
            const errorText = await response.text();
            return new Response(`後端錯誤：請求 PayPal SDK 失敗。PayPal 說: ${errorText}`, { status: response.status });
        }
        const scriptContent = await response.text();
        const headers = new Headers();
        headers.set('Content-Type', 'application/javascript; charset=utf-8');
        return new Response(scriptContent, { headers });
    } catch (error) {
        return new Response(`後端致命錯誤：無法 fetch PayPal SDK。錯誤: ${error.message}`, { status: 500 });
    }
}