// functions/verify-paypal.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, orderID, email } = await request.json();
    if (!path || !orderID || !email) {
      return new Response(JSON.stringify({ error: '缺少 path, orderID 或 email' }), { status: 400 });
    }
    console.log('[verify-paypal] path=', path, 'orderID=', orderID, 'email=', email);

    // 1) 驗證 PayPal 訂單
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

    // 2) 簽發 JWT
    const JWT_SECRET = env.JWT_SIGNING_KEY;
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      path,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600
    };

    const b64u = obj => btoa(JSON.stringify(obj))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const hB64 = b64u(header);
    const pB64 = b64u(payload);
    const data = `${hB64}.${pB64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const token = `${data}.${sigB64}`;
    console.log('[verify-paypal] issued JWT');
    
    // 3) 存到 KV (email + path)
    const key = `payment:${email}:${path}`;
    await env.PAYMENT_RECORDS.put(key, token, { expirationTtl: 0 }); // 永久，或設 TTL

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[verify-paypal] error:', err);
    return new Response(JSON.stringify({ error: '伺服器錯誤，請稍後重試' }), { status: 500 });
  }
}