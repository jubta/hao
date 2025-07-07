// functions/verify.js

// 後端 Function 的主處理邏輯
export async function onRequestPost(context) {
    try {
        // 從請求中解析出前端傳來的 path 和 password
        const { request, env } = context;
        const { path, password } = await request.json();

        // 檢查資料是否齊全
        if (!path || !password) {
            return new Response(JSON.stringify({ error: '請求缺少路徑或密碼。' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 組合出在 KV 中儲存密碼和內容的 Key
        const passwordKey = `password:${path}`;
        const contentKey = `content:${path}`;

        // 從綁定的 KV (env.SECURE_CONTENT) 中獲取儲存的密碼
        const storedPassword = await env.SECURE_CONTENT.get(passwordKey);

        // 驗證密碼
        if (!storedPassword || storedPassword !== password) {
            return new Response(JSON.stringify({ error: '密碼不正確。' }), {
                status: 401, // 401 Unauthorized
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 密碼正確，從 KV 中獲取文章內容
        const storedContent = await env.SECURE_CONTENT.get(contentKey);

        if (!storedContent) {
            return new Response(JSON.stringify({ error: '找到了密碼但找不到對應的文章內容。' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 一切成功，將 HTML 內容回傳給前端
        return new Response(storedContent, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
        });

    } catch (error) {
        // 處理任何意外錯誤
        return new Response(JSON.stringify({ error: '伺服器內部錯誤。' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}