// functions/upload.js
export async function onRequestPost({ request, env }) {
  try {
    const { path, content, password, secret } = await request.json(); // body: {path, content, password (選填), secret}
    if (!path || !content) {
      return new Response(JSON.stringify({ error: '缺少 path 或 content' }), { status: 400 });
    }

    // 驗證秘密密鑰
    if (!secret || secret !== env.UPLOAD_SECRET) {
      return new Response(JSON.stringify({ error: '未授權的請求' }), { status: 401 });
    }

    // 壓縮內容 (gzip)
    const compressedStream = new Response(content).body.pipeThrough(new CompressionStream('gzip'));
    const compressed = await new Response(compressedStream).arrayBuffer(); // 轉成 ArrayBuffer (binary)

    // 存到 KV (binary 支援)
    await env.SECURE_CONTENT.put(`content:${path}`, compressed);
    console.log(`[upload] 內容壓縮並存入 KV: key=content:${path}`);

    // 如果有 password，存入 (不壓縮，假設是短文字)
    if (password) {
      await env.SECURE_CONTENT.put(`password:${path}`, password);
      console.log(`[upload] Password 存入 KV: key=password:${path}`);
    }

    return new Response(JSON.stringify({ success: true, message: '上傳成功，已 gzip 壓縮' }), { status: 200 });
  } catch (err) {
    console.error('[upload] 錯誤:', err.message, err.stack);
    return new Response(JSON.stringify({ error: '上傳失敗: ' + err.message }), `status: 500 });
  }
}