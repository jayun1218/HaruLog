"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Chrome, ArrowRight } from "lucide-react";
import { Browser } from "@capacitor/browser";

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [isApp, setIsApp] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsApp(!!(window as any).Capacitor?.isNativePlatform);
        }
    }, []);

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-haru-sky-light flex items-center justify-center">
                <div className="animate-bounce text-4xl">☁️</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-haru-sky-light via-white to-haru-pink-light flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[40px] shadow-soft p-10 flex flex-col items-center border border-white/50">
                <div className="text-6xl mb-6 drop-shadow-sm">☁️</div>
                <h1 className="text-3xl font-black text-slate-800 mb-2">HaruLog</h1>
                <p className="text-slate-500 mb-10 text-center font-medium leading-relaxed">
                    너의 하루를 몽글몽글하게 기록해봐<br />
                    지금 로그인을 하고 시작하세요!
                </p>

                <div className="w-full space-y-4">
                    {/* Google Login */}
                    <button
                        onClick={async () => {
                            const productionUrl = "https://haru-log.vercel.app";
                            if (isApp) {
                                await Browser.open({
                                    url: `${productionUrl}/auth/signin-bridge`,
                                    windowName: "_blank"
                                });
                            } else {
                                signIn("google", { callbackUrl: "/" });
                            }
                        }}
                        className="w-full h-14 bg-white border border-slate-200 rounded-2xl flex items-center px-6 gap-4 hover:bg-slate-50 transition-all active:scale-95 group shadow-sm"
                    >
                        <div className="w-8 h-8 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        </div>
                        <span className="flex-1 text-left font-bold text-slate-700 text-sm whitespace-nowrap">Google 로그인</span>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-haru-sky-deep transition-colors" />
                    </button>

                </div>

                <div className="mt-12 text-slate-400 text-xs text-center border-t border-slate-100 pt-6 w-full">
                    로그인 시 이용약관 및 개인정보 처리방침에 동의한 것으로 간주됩니다.
                </div>
            </div>
        </div>
    );
}
