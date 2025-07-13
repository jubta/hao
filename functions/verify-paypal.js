export async function onRequestPost({ request, env }) {
  const { path, orderID } = await request.json();

  // 1) 取 access token
  const auth = btoa(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_CLIENT_SECRET);
  let res = await fetch(
    'https://api-m.sandbox.paypal.com/v1/oauth2/token',
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    }
  );
  if (!res.ok) {
  const body = await res.text();
  // 直接把状态码+原文透给前端
  return new Response(body, { status: res.status });
  }
  const { access_token } = await res.json();

  // 2) 驗證訂單
  res = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  if (!res.ok) {
    console.error('Error fetching order:', await res.text());
    return new Response(JSON.stringify({ error: '無法查詢訂單狀態' }), { status: 500 });
  }
  const order = await res.json();
  const isCaptured =
    order.status === 'COMPLETED' ||
    (order.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED');
  if (!isCaptured) {
    return new Response(JSON.stringify({ error: '尚未完成付款。' }), { status: 400 });
  }

  // 3) 寫入 unlockToken
  const unlockToken = crypto.randomUUID();
  const kvKey = `payunlock:${path}:${unlockToken}`;
  await env.SECURE_CONTENT.put(kvKey, 'true', { expirationTtl: 86400 });

  return new Response(JSON.stringify({ unlockToken }), { status: 200 });
}