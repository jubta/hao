// functions/verify.js - 究極完全體：速率限制 + Turnstile + 密碼驗證

// --- 全局設定 ---
const RATE_LIMIT_THRESHOLD = 5; // 限制：每分鐘最多嘗試 5 次
const RATE_LIMIT_TTL = 3600;      // TTL：計數器在 KV 中存活 3600 秒 (1小時)

// Turnstile 驗證函數 (保持不變)
async function verifyTurnstile(token, secretKey, remoteIp) {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            secret: secretKey,
            response: token,
            remoteip: remoteIp,
        }),
    });
    const data = await response.json();
    return data.success;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const { path, password, turnstileToken, unlockToken } = await request.json();

  // 1. 如果有 unlockToken，就走支付驗證流程
  if (unlockToken) {
    const paid = await env.SECURE_CONTENT.get(`payunlock:${path}:${unlockToken}`);
    if (!paid) {
      return new Response(JSON.stringify({ error: '無效或已過期的解鎖憑證。' }), { status: 401 });
    }
    // 取出內容並回傳
    const storedContent = await env.SECURE_CONTENT.get(`content:${path}`);
    return new Response(storedContent, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // 2. 否則走原本的 人機 + 密碼 驗證
  //    …（你現有的程式碼不動）…
}

        // --- 1. 速率限制檢查 (我們的全新保護層) ---
        const rateLimitKey = `rl:${clientIp}:${path}`; // 針對每個 IP 和每篇文章進行限制
        let attempts = (await env.SECURE_CONTENT.get(rateLimitKey, { type: 'json' })) || { count: 0 };
        
        if (attempts.count >= RATE_LIMIT_THRESHOLD) {
            // 已超過限制，直接拒絕，不消耗後續資源
            return new Response(JSON.stringify({ error: `嘗試次數過多，請稍後再試。` }), { status: 429 }); // 429 Too Many Requests
        }

        // --- 2. Turnstile 驗證 (抵擋機器人) ---
        if (!turnstileToken) {
            return new Response(JSON.stringify({ error: '缺少驗證，請刷新頁面重試。' }), { status: 400 });
        }
        const isHuman = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, clientIp);
        if (!isHuman) {
            // 機器人驗證失敗也計入嘗試次數
            attempts.count++;
            await env.SECURE_CONTENT.put(rateLimitKey, JSON.stringify(attempts), { expirationTtl: RATE_LIMIT_TTL });
            return new Response(JSON.stringify({ error: '機器人驗證失敗。' }), { status: 403 });
        }

        // --- 3. 核心密碼驗證 (只有通過前兩關才能到達這裡) ---
        if (!path || !password) {
            return new Response(JSON.stringify({ error: '請求缺少路徑或密碼。' }), { status: 400 });
        }
        
        const passwordKey = `password:${path}`;
        const contentKey = `content:${path}`;
        const storedPassword = await env.SECURE_CONTENT.get(passwordKey);

        if (!storedPassword || storedPassword !== password) {
            // 密碼錯誤，將嘗試次數+1並更新KV
            attempts.count++;
            await env.SECURE_CONTENT.put(rateLimitKey, JSON.stringify(attempts), { expirationTtl: RATE_LIMIT_TTL });
            return new Response(JSON.stringify({ error: '密碼不正確。' }), { status: 401 });
        }

        // 密碼正確！清除此 IP 的嘗試計數器，並回傳內容
        await env.SECURE_CONTENT.delete(rateLimitKey);
        const storedContent = await env.SECURE_CONTENT.get(contentKey);

        if (!storedContent) {
            return new Response(JSON.stringify({ error: '找不到對應的文章內容。' }), { status: 404 });
        }

        return new Response(storedContent, { status: 200, headers: { 'Content-Type': 'text/html' } });

    } catch (error) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: '伺服器內部錯誤。' }), { status: 500 });
    }
}