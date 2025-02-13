import { NextResponse } from 'next/server';

// 建立一個文章 slug 與密碼的對應表
// 密碼從環境變量讀取（必須以 NEXT_PUBLIC_ 開頭）
const passwordMap = {
  "esign_0209": process.env.NEXT_PUBLIC_ESIGN_0209_PASSWORD,
  // 可繼續添加更多對應項
};

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 檢查請求是否落在 /post/protected/ 下
  const match = pathname.match(/^\/post\/protected\/([^\/]+)(\/|$)/);
  if (!match) {
    // 不在保護範圍內，直接通過
    return NextResponse.next();
  }

  // 從 URL 中提取文章的 slug
  const slug = match[1];

  // 根據 slug 從映射表中取得正確的密碼
  const correctPassword = passwordMap[slug];
  if (!correctPassword) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 讀取 Authorization 標頭
  const authHeader = request.headers.get('authorization') || '';

  // 這裡假設固定使用者名稱 "user"，你可以根據需要修改
  const expectedAuth = 'Basic ' + btoa(`user:${correctPassword}`);

  // 如果 Authorization 標頭不匹配，返回 401 並要求輸入密碼
  if (authHeader !== expectedAuth) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Protected Area"',
      },
    });
  }

  // 驗證通過，繼續請求
  return NextResponse.next();
}

// 配置 middleware 的匹配範圍
export const config = {
  matcher: '/post/protected/:path*',
};
