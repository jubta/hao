// functions/verify-paypal.js

// --- 新增部分 ---
// 引入我們建立的 Clerk 用戶驗證輔助函數
import { verifyUser } from './_auth-helper.js';

export async function onRequestPost({ request, env }) {
  // --- 新增部分 ---
  // 步驟 1: 驗證用戶身份
  // 這會檢查請求標頭中的 Authorization token，確保是已登入的 Clerk 用戶
  const { userId, error, status } = await verifyUser(request, env);
  if (error) {
    // 如果 token 無效或未提供，直接返回錯誤，不繼續執行
    return new Response(JSON.stringify({ error: `身份驗證失敗: ${error}` }), { status });
  }
  // 如果執行到這裡，'userId' 變數中就包含了該用戶的唯一 ID，例如 'user_2fA...'
  // --- 新增部分結束 ---


  try {
    // --- 保留部分 (稍作修改) ---
    // 從請求中獲取路徑和訂單ID
    const { path, orderID } = await request.json();
    if (!path || !orderID) {
      return new Response(JSON.stringify({ error: '缺少 path 或 orderID' }), { status: 400 });
    }
    // 在日誌中也打印出 userId，方便調試
    console.log(`[verify-paypal] Verifying for user: ${userId}, path: ${path}, orderID: ${orderID}`);
    // --- 保留部分結束 ---
    

    // --- 保留部分 (完全不變) ---
    // 步驟 2: 驗證 PayPal 訂單 (這整段邏輯和您原來的一模一樣)
    const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
    const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('[verify-paypal] token error=', tokenRes.status, errorText);
      return new Response(JSON.stringify({ error: '無法取得 PayPal token', detail: errorText }), { status: tokenRes.status });
    }
    const { access_token } = await tokenRes.json();

    const orderRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      console.error('[verify-paypal] order error=', orderRes.status, errorText);
      return new Response(JSON.stringify({ error: '無法查詢訂單狀態', detail: errorText }), { status: orderRes.status });
    }
    const order = await orderRes.json();

    // 檢查訂單狀態
    const captured = order.status === 'COMPLETED' ||
      order.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED';
    if (!captured) {
      return new Response(JSON.stringify({ error: '尚未完成付款', order }), { status: 400 });
    }

    // 檢查金額與幣別
    const pu = order.purchase_units?.[0]?.amount;
    if (pu.value !== '1.50' || pu.currency_code !== 'USD') {
      return new Response(JSON.stringify({ error: '金額或幣別不符' }), { status: 400 });
    }
    // --- PayPal 驗證邏輯結束 ---
    

    // --- 刪除部分 ---
    // 您原來簽發 JWT 的所有程式碼都將被刪除。
    // const JWT_SECRET = env.JWT_SIGNING_KEY;
    // const header = { alg: 'HS256', typ: 'JWT' };
    // ... 所有關於 b64u, hB64, pB64, crypto.subtle.sign 的程式碼...
    // const token = `${data}.${sigB64}`;
    // --- 刪除部分結束 ---


    // --- 新增部分 ---
    // 步驟 3: 記錄購買到 Cloudflare KV
    // 我們不再簽發自己的 token，而是將購買記錄與用戶 ID 綁定
    
    // **重要**: 確保您在 Cloudflare Dashboard 上已經創建了一個名為 "PURCHASES" 的 KV Namespace
    // 並將其綁定到了您的 Functions。
    if (!env.PURCHASES) {
        console.error("[verify-paypal] 'PURCHASES' KV namespace is not bound.");
        return new Response(JSON.stringify({ error: '伺服器配置錯誤' }), { status: 500 });
    }

    const purchaseKey = `${userId}:${path}`; // 組合 Key，例如: "user_2fAbCd...:/posts/my-article/"
    
    // 將記錄寫入 KV。Value 可以是簡單的 "true"，或者也可以存儲訂單ID和時間戳
    const purchaseData = JSON.stringify({ orderId: orderID, timestamp: new Date().toISOString() });
    await env.PURCHASES.put(purchaseKey, purchaseData);

    console.log(`[verify-paypal] Purchase recorded successfully for key: ${purchaseKey}`);

    // 返回一個簡單的成功響應給前端。前端不再需要處理 token。
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    // --- 新增部分結束 ---

  } catch (err) {
    // --- 保留部分 (保持不變) ---
    // 通用的錯誤捕獲
    console.error('[verify-paypal] error:', err);
    return new Response(JSON.stringify({ error: '伺服器內部錯誤，請稍後重試' }), { status: 500 });
    // --- 保留部分結束 ---
  }
}