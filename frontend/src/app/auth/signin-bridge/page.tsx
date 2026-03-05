"use client";

import { signIn } from "next-auth/react";
import { useEffect } from "react";

export default function SigninBridgePage() {
    useEffect(() => {
        // 브라우저 컨텍스트에서 NextAuth 인증 시작
        // 콜백은 다시 앱 리다이렉트 페이지로 설정
        signIn("google", {
            callbackUrl: "/auth/app-redirect"
        });
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-16 h-16 bg-haru-sky-accent/20 rounded-full flex items-center justify-center text-3xl mb-6 mx-auto animate-pulse">
                    🔐
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">구글 로그인 연결 중</h2>
                <p className="text-slate-500 font-medium">잠시만 기다려주세요...</p>
            </div>
        </div>
    );
}
