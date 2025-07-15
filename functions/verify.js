// functions/verify.js
import { verifyUser } from './_auth-helper.js';

export async function onRequestPost({ request, env }) {
  // 1. 驗證用戶身份
  const { userId, error, status } = await verifyUser(request, env);
  if (error) {
    return new Response(JSON.stringify({ error }), { status });
  }

  try {
    const { path } = await request.json();
    if (!path) {
      return new Response(JSON.stringify({ error: '缺少 path' }), { status: 400 });
    }

    // 2.【關鍵修改】檢查用戶的購買記錄
    const purchaseKey = `${userId}:${path}`;
    const purchaseRecord = await env.PURCHASES.get(purchaseKey);

    if (!purchaseRecord) {
      // 未找到購買記錄，返回 402 Payment Required 狀態
      return new Response(JSON.stringify({ error: '您尚未購買此文章' }), { status: 402 });
    }

    // 3. 驗證通過，從 SECURE_CONTENT KV 讀取並返回文章內容
    const html = await env.SECURE_CONTENT.get(`content:${path}`);
    if (!html) {
      return new Response(JSON.stringify({ error: '文章未找到' }), { status: 404 });
    }

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (err) {
    console.error('[verify] error:', err);
    return new Response(JSON.stringify({ error: '伺服器錯誤，請稍後重試' }), { status: 500 });
  }
}