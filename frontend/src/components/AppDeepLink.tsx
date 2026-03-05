"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";
import { toast } from "./Toast";

export default function AppDeepLink() {
    const router = useRouter();

    useEffect(() => {
        // Capacitor 환경인지 확인
        const isApp = typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform;
        if (!isApp) return;

        // 딥링크 이벤트 리스너 등록
        const setupDeepLink = async () => {
            App.addListener("appUrlOpen", async (data: any) => {
                console.log("App opened with URL:", data.url);

                // URL 파싱
                const url = new URL(data.url);

                // harulog://auth-sync?token=... 형태인지 확인
                if (url.protocol === "harulog:" && url.host === "auth-sync") {
                    const token = url.searchParams.get("token");
                    console.log("Token found in deep link:", token ? "YES" : "NO");
                    if (token) {
                        try {
                            toast("로그인 정보를 동기화하고 있습니다... ☁️", "info");
                            // 브릿지 API 호출하여 쿠키 설정
                            const res = await fetch(`/api/auth/cap-sync?token=${token}`);
                            if (res.ok) {
                                toast("성공적으로 로그인되었습니다! ✨", "success");
                                // 세션 동기화를 위해 페이지 새로고침
                                setTimeout(() => {
                                    window.location.href = "/";
                                }, 500);
                            } else {
                                toast("로그인 동기화에 실패했습니다.", "error");
                            }
                        } catch (error) {
                            console.error("Auth sync error:", error);
                            toast("로그인 처리 중 오류가 발생했습니다.", "error");
                        }
                    }
                }
            });

            // 앱이 완전히 종료되었다가 딥링크로 켜진 경우 처리
            const result = await App.getLaunchUrl();
            if (result && result.url) {
                console.log("App launched with URL:", result.url);
                // 위 핸들러와 동일한 로직을 수행하도록 트리거
            }
        };

        setupDeepLink();

        return () => {
            App.removeAllListeners();
        };
    }, [router]);

    return null; // UI 없이 로직만 수행
}
