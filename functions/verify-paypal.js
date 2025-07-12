// functions/payment.js
export async function onRequestPost(context) {
  const { request, env } = context;
  const { path, orderID } = await request.json();

  // 1. 呼叫 PayPal API 驗證訂單狀態
  const auth = Buffer.from(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_CLIENT_SECRET).toString('base64');
  // 先取得 access token
  let res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const { access_token } = await res.json();

  // 再用 access token 查訂單詳情
  res = await fetch(
  `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const order = await res.json();

  // 2. 確認訂單狀態為已捕獲（CAPTURED）
  const isCaptured = order.status === 'COMPLETED' || 
    (order.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED');
  if (!isCaptured) {
    return new Response(JSON.stringify({ error: '尚未完成付款。' }), { status: 400 });
  }

  // 3. 產生一次性 unlockToken（JWT 或 隨機字串），並寫入 KV
  const unlockToken = crypto.randomUUID();  
  const kvKey = `payunlock:${path}:${unlockToken}`;
  await env.SECURE_CONTENT.put(kvKey, 'true', { expirationTtl: 60 * 60 * 24 }); // 24 小時內有效

  return new Response(JSON.stringify({ unlockToken }), { status: 200 });
}