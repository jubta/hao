// functions/paypal-webhook.js

// 輔助函數
async function createSignedCookie(path, secret) { /* ... */ }
const COOKIE_SECRET_KEY = 'YOUR_SECRET_COOKIE_KEY';

export async function onRequestPost(context) {
    const { request, env } = context;
    // 這裡需要驗證請求是否來自 PayPal，但我們先簡化，假設它是可信的
    
    try {
        const data = await request.json();

        // 我們關心的是 'resource' 物件裡的資訊
        if (data.event_type === "CHECKOUT.ORDER.APPROVED" && data.resource) {
            const resource = data.resource;
            // 我們需要在 PayPal 按鈕設定中，將文章路徑作為 custom_id 傳遞
            const articlePath = resource.purchase_units[0].custom_id;
            
            if (articlePath) {
                // 付款成功！現在我們要找出是哪個用戶付的款。
                // 這裡的挑戰是，Webhook 是後台通知，我們不知道是哪個瀏覽器用戶。
                // 解決方案：我們在 KV 中創建一個「已付款」的標記。
                const paidKey = `paid:${articlePath}`;
                await env.SECURE_CONTENT.put(paidKey, "true", { expirationTtl: 86400 }); // 標記有效期 24 小時
            }
        }
        return new Response('Webhook received', { status: 200 });
    } catch (err) {
        return new Response('Webhook error', { status: 400 });
    }
}
// createSignedCookie 函數的完整定義...