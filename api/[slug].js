export default async function handler(req, res) {
  const { slug } = req.query;

  // 根據 slug 決定使用哪個環境變量儲存該文章的密碼
  // 例如，環境變量名稱約定為： SECRET_<SLUG_IN_UPPERCASE>_PASSWORD
  // slug 為 "esign_0213" 則環境變量為 SECRET_ESIGN_0213_PASSWORD
  const envVarName = `SECRET_${slug.toUpperCase()}_PASSWORD`;
  const correctPassword = process.env[envVarName];

  if (!correctPassword) {
    res.status(404).send("Not Found");
    return;
  }

  // 取得 Authorization 標頭
  const authHeader = req.headers.authorization || "";

  // 假設固定使用者名稱 "user"，可根據需要調整
  const expectedAuth = "Basic " + Buffer.from(`user:${correctPassword}`).toString("base64");

  if (authHeader !== expectedAuth) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Protected Area"');
    res.status(401).send("Unauthorized");
    return;
  }

  // 認證通過後，這裡返回文章內容
  // 你可以選擇：
  // 1. 從檔案系統讀取該文章內容並返回
  // 2. 反向代理至原本靜態頁面的 URL（前提是該靜態頁面不會直接被訪問）
  // 這裡示範直接返回一個訊息

  res.status(200).send(`Authenticated content for article: ${slug}`);
}
