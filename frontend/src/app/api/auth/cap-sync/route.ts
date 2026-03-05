import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // 보안을 위해 실제 서비스에서는 이 토큰이 유효한지 또는 
    // 서버측 세션 저장소에 있는지 확인하는 과정이 필요할 수 있습니다.
    // 여기서는 간단하게 전달받은 토큰을 next-auth의 세션 쿠키로 설정합니다.

    const response = NextResponse.json({ success: true });

    // next-auth 세션 쿠키 이름 설정 (배포 환경에 따라 다를 수 있음)
    const cookieName = process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";

    response.cookies.set(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
}
