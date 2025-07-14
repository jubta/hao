// functions/verify-paypal.js
// ———————————
// 负责：验证 PayPal 订单 → 签发 JWT token 返回给前端。
// ———————————

export async function onRequestPost({ request, env }) {
  const { path, orderID } = await request.json();
  console.log('[verify-paypal] path=', path, 'orderID=', orderID);

  // ——— 1) 验证 PayPal 订单 ———
  // 1.1 取得 access_token
  const auth = btoa(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_CLIENT_SECRET);
  let res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const text1 = await res.text();
  console.log('[verify-paypal] token status=', res.status, 'body=', text1);
  if (!res.ok) {
    return new Response(JSON.stringify({ error: '無法取得 PayPal token', detail: text1 }), { status: res.status });
  }
  const { access_token } = JSON.parse(text1);

  // 1.2 查订单详情
  res = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const text2 = await res.text();
  console.log('[verify-paypal] order status=', res.status, 'body=', text2);
  if (!res.ok) {
    return new Response(JSON.stringify({ error: '無法查詢訂單狀態', detail: text2 }), { status: res.status });
  }
  const order = JSON.parse(text2);

  // 1.3 检查 capture 状态
  console.log('[verify-paypal] order.status=', order.status);
  const captured =
    order.status === 'COMPLETED' ||
    order.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED';
  if (!captured) {
    return new Response(JSON.stringify({ error: '尚未完成付款。', order }), { status: 400 });
  }

  // 1.4 金额 & 幣別 校验
  const pu = order.purchase_units?.[0]?.amount;
  if (pu.value !== '1.5' || pu.currency_code !== 'USD') {
    return new Response(JSON.stringify({ error: '金額或幣別不符。' }), { status: 400 });
  }

  // ——— 2) 签发 JWT ———
  const JWT_SECRET = env.JWT_SIGNING_KEY;
  const header  = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    path,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600  // 30 天后过期
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

  return new Response(JSON.stringify({ token }), { status: 200 });
}