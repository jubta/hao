// functions/_middleware.js

// 這個函數會攔截所有請求，並修改回應標頭
export async function onRequest(context) {
  // 獲取原始的回應
  const response = await context.next();

  // 創建一個新的、可修改的 CSP 規則
  // 我們允許 'self' (自己), 'unsafe-inline' (內聯腳本), 
  // 並明確地允許 PayPal 和 Cloudflare Turnstile 的域名
  const newCsp = "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.paypal.com; " +
                 "connect-src 'self' https://api-m.sandbox.paypal.com https://api.paypal.com; " +
                 "frame-src 'self' https://www.sandbox.paypal.com https://www.paypal.com; " +
                 "img-src 'self' https://www.paypalobjects.com data:;";

  // 設置或覆蓋 Content-Security-Policy 標頭
  response.headers.set('Content-Security-Policy', newCsp);

  // 為了安全，也移除一個可能由其他地方設置的、更嚴格的標頭
  response.headers.delete('X-Content-Security-Policy');

  // 返回修改後的回應
  return response;
}