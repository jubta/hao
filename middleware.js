import { NextResponse } from "next/server";

export function middleware(req) {
    const url = req.nextUrl;
    const passwordProtectedPaths = ["/post/protect"]; // 需要密码保护的文章路径
    const correctPassword = "test"; // 设置你的密码

    // 检查当前访问的路径是否需要密码
    if (passwordProtectedPaths.includes(url.pathname)) {
        const cookies = req.cookies.get("blog_auth");

        // 如果 Cookie 里没有正确的密码，则跳转到密码输入页面
        if (!cookies || cookies.value !== correctPassword) {
            const redirectUrl = new URL("/password", req.url);
            redirectUrl.searchParams.set("redirect", url.pathname);
            return NextResponse.redirect(redirectUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/post/protect"], // 需要保护的路径
};