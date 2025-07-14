export async function onRequestPost({ request, env }) {
  try {
    const { path, orderID, userId, price, currency } = await request.json();
    // 允許 userId 為 null，但其他字段必須存在
    if (!path || !orderID || !price || !currency) {
      return new Response(JSON.stringify({ error: '缺少 path, orderID, price 或 currency' }), { status: 400 });
    }
    console.log('[verify-paypal] path=', path, 'orderID=', orderID, 'userId=', userId, 'price=', price, 'currency=', currency);

    // 驗證 PayPal 訂單
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

    const captured = order.status === 'COMPLETED' ||
      order.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED';
    if (!captured) {
      return new Response(JSON.stringify({ error: '尚未完成付款', order }), { status: 400 });
    }

    const pu = order.purchase_units?.[0]?.amount;
    if (pu.value !== price || pu.currency_code !== currency) {
      return new Response(JSON.stringify({ error: '金額或幣別不符' }), { status: 400 });
    }

    // 儲存解鎖狀態到 KV（即使 userId 為 null，也儲存臨時解鎖）
    const html = await env.SECURE_CONTENT.get(`content:${path}`);
    if (!html) {
      return new Response(JSON.stringify({ error: '文章未找到' }), { status: 404 });
    }
    const kvKey = userId ? `unlock:${userId}:${path}` : `unlock:guest:${path}`;
    await env.SECURE_CONTENT.put(kvKey, html, { expirationTtl: 30 * 24 * 3600 });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[verify-paypal] error:', err);
    return new Response(JSON.stringify({ error: '伺服器錯誤，請稍後重試' }), { status: 500 });
  }
}