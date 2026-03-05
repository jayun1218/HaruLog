"use client";

import { useEffect } from "react";

export default function AuthRedirectClient({ sessionToken }: { sessionToken: string }) {
    useEffect(() => {
        const deepLinkUrl = `harulog://auth-sync?token=${sessionToken}`;

        // 1. 즉시 이동 시도
        window.location.href = deepLinkUrl;

        // 2. 약간의 지연 후 다시 시도 (사용자 액션 없이 안 열릴 경우 대비)
        const timer = setTimeout(() => {
            window.location.href = deepLinkUrl;
        }, 800);

        return () => clearTimeout(timer);
    }, [sessionToken]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center p-8">
                <div className="w-16 h-16 bg-haru-sky-accent/20 rounded-full flex items-center justify-center text-3xl mb-6 mx-auto animate-bounce">
                    ☁️
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">앱으로 돌아가는 중</h2>
                <p className="text-slate-500 mb-8 font-medium">로그인이 완료되었습니다.<br />잠시 후 HaruLog 앱이 실행됩니다.</p>

                <a
                    href={`harulog://auth-sync?token=${sessionToken}`}
                    className="inline-flex items-center justify-center px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                    앱이 열리지 않나요?
                </a>
            </div>
        </div>
    );
}
