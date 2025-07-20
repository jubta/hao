// functions/verify-paypal.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, orderID, email, price, currency } = await request.json();
    if (!path || !orderID || !email || !price || !currency) {
      console.log('[verify-paypal] 缺少參數');
      return new Response(JSON.stringify({ error: '缺少參數' }), { status: 400 });
    }
    console.log('[verify-paypal] 收到請求: path=', path, 'orderID=', orderID, 'email=', email, 'price=', price, 'currency=', currency);

    // 全局IP防刷 (每小時限50次/ IP全站, 優化寫/列表)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const globalRateKey = `global-rate:${ip}`;
    const { value: globalRateValue, metadata } = await env.PAYMENT_RECORDS.getWithMetadata(globalRateKey);
    const globalRate = globalRateValue ? JSON.parse(globalRateValue) : { count: 0, timestamp: Date.now() };
    if (Date.now() - globalRate.timestamp < 3600000 && globalRate.count >= 50) {
      console.log('Global rate limit exceeded for IP:', ip);
      return new Response(JSON.stringify({ error: '全局請求太頻繁，請稍後重試（1小時後）' }), { status: 429 });
    }
    globalRate.count++;
    if (globalRate.count > 1) { // 優化: count>1才寫，減寫次數
      await env.PAYMENT_RECORDS.put(globalRateKey, JSON.stringify(globalRate), { expirationTtl: 3600 });
    }

    // path限速 (每小時限10次/ path + IP, 優化寫/列表)
    const pathRateKey = `path-rate:${ip}:${path}`;
    const { value: pathRateValue, metadata: pathMetadata } = await env.PAYMENT_RECORDS.getWithMetadata(pathRateKey);
    const pathRate = pathRateValue ? JSON.parse(pathRateValue) : { count: 0, timestamp: Date.now() };
    if (Date.now() - pathRate.timestamp < 3600000 && pathRate.count >= 10) {
      console.log('Path rate limit exceeded for IP:', ip, 'path:', path);
      return new Response(JSON.stringify({ error: '此文章請求太頻繁，請稍後重試（1小時後）' }), { status: 429 });
    }
    pathRate.count++;
    if (pathRate.count > 1) {
      await env.PAYMENT_RECORDS.put(pathRateKey, JSON.stringify(pathRate), { expirationTtl: 3600 });
    }

    // 1) 驗證 PayPal 訂單
    console.log('[verify-paypal] 開始驗證 PayPal token');
    const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
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
    const orderRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}`, {
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

    // 檢查金額與幣別 (修復: 用parseFloat浮點比對 + 大小寫不敏 + log debug)
    const pu = order.purchase_units?.[0]?.amount;
    const expectedPrice = parseFloat(price); // 轉浮點
    const actualPrice = parseFloat(pu.value);
    const expectedCurrency = currency.toUpperCase(); // 大寫不敏
    const actualCurrency = pu.currency_code.toUpperCase();
    console.log('[verify-paypal] 預期金額/幣別:', expectedPrice, expectedCurrency, '實際:', actualPrice, actualCurrency); // 加log debug
    if (actualPrice !== expectedPrice || actualCurrency !== expectedCurrency) {
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
      await env.PAYMENT_RECORDS.put(kvKey, token); // 永久
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