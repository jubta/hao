// functions/verify-paypal.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, orderID, email } = await request.json();
    if (!path || !orderID || !email) {
      console.log('[verify-paypal] 缺少參數');
      return new Response(JSON.stringify({ error: '缺少 path, orderID 或 email' }), { status: 400 });
    }
    console.log('[verify-paypal] 收到請求: path=', path, 'orderID=', orderID, 'email=', email);

    // 新增: rate limit 防刷 (每小時限10次/ path + IP)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'; // 取用戶IP
    const rateKey = `rate:${ip}:${path}`;
    const rate = await env.PAYMENT_RECORDS.get(rateKey, { type: 'json' }) || { count: 0, timestamp: Date.now() };
    if (Date.now() - rate.timestamp < 3600000 && rate.count >= 10) { // 1小時 >=10次，擋
      console.log('Rate limit exceeded for IP:', ip, 'path:', path); // Log
      return new Response(JSON.stringify({ error: '請求太頻繁，請稍後重試（1小時後）' }), { status: 429 });
    }
    rate.count++;
    rate.timestamp = Date.now();
    await env.PAYMENT_RECORDS.put(rateKey, JSON.stringify(rate), { expirationTtl: 3600 }); // 1小時過期

    // 1) 驗證 PayPal 訂單
    console.log('[verify-paypal] 開始驗證 PayPal token');
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
    console.log('[verify-paypal] PayPal token 取得成功');

    console.log('[verify-paypal] 開始查詢訂單');
    const orderRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      console.error('[verify-paypal] order error=', orderRes.status, errorText);
      return new Response(JSON.stringify({ error: '無法查詢訂單狀態', detail: errorText }), { status: orderRes.status });
    }
    const order = await orderRes.json();
    console.log('[verify-paypal] 訂單查詢成功');

    // 檢查訂單狀態
    const captured = order.status === 'COMPLETED' ||
      order.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED';
    if (!captured) {
      console.log('[verify-paypal] 訂單未完成');
      return new Response(JSON.stringify({ error: '尚未完成付款', order }), { status: 400 });
    }

    // 檢查金額與幣別
    const pu = order.purchase_units?.[0]?.amount;
    if (pu.value !== '1.50' || pu.currency_code !== 'USD') {
      console.log('[verify-paypal] 金額或幣別不符');
      return new Response(JSON.stringify({ error: '金額或幣別不符' }), { status: 400 });
    }
    console.log('[verify-paypal] 訂單驗證通過');

    // 2) 簽發 JWT
    console.log('[verify-paypal] 開始生成 JWT');
    const JWT_SECRET = env.JWT_SIGNING_KEY;
    if (!JWT_SECRET) {
      console.error('[verify-paypal] JWT_SECRET 未設定');
      return new Response(JSON.stringify({ error: 'JWT 密鑰未設定' }), { status: 500 });
    }

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
    console.log('[verify-paypal] JWT 生成成功');

    // 3) 存到 KV (email + path 綁定 token，永久)
    try {
      const kvKey = `payment:${email}:${path}`;
      await env.PAYMENT_RECORDS.put(kvKey, token); // 永久 (無 expirationTtl)
      console.log('[verify-paypal] KV 寫入成功: key=', kvKey);
    } catch (kvErr) {
      console.error('[verify-paypal] KV 寫入失敗:', kvErr);
      // 不阻擋返回，但 log 錯誤
    }

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[verify-paypal] 整體錯誤:', err.message, err.stack);
    return new Response(JSON.stringify({ error: '伺服器錯誤，請稍後重試', detail: err.message }), { status: 500 });
  }
}