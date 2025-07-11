// functions/get-paypal-sdk.js (會抱怨的偵錯版)

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client-id');
    const currency = url.searchParams.get('currency');

    if (!clientId) {
        return new Response("後端錯誤：前端沒有傳來 client-id。", { status: 400 });
    }
    if (!currency) {
        return new Response("後端錯誤：前端沒有傳來 currency。", { status: 400 });
    }

    const paypalSdkUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}¤cy=${currency}`;

    try {
        // 直接在後端發起請求，不添加多餘的 headers
        const response = await fetch(paypalSdkUrl);

        if (!response.ok) {
            const errorText = await response.text();
            // 將 PayPal 返回的原始錯誤訊息也回傳給前端
            return new Response(`後端錯誤：請求 PayPal SDK 失敗，狀態碼: ${response.status}. PayPal 說: ${errorText}`, { status: response.status });
        }

        const scriptContent = await response.text();
        const headers = new Headers();
        headers.set('Content-Type', 'application/javascript; charset=utf-8');
        headers.set('Cache-Control', 'public, max-age=600');
        return new Response(scriptContent, { headers });

    } catch (error) {
        // 如果 fetch 本身就失敗了 (例如網路問題)
        return new Response(`後端致命錯誤：無法 fetch PayPal SDK，錯誤訊息: ${error.message}`, { status: 500 });
    }
}