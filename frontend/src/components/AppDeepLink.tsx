"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
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
                console.log("Deep link received:", data.url);
                try {
                    const url = new URL(data.url);
                    if (url.protocol === "harulog:") {
                        await Browser.close().catch(() => { });
                        const token = url.searchParams.get("token");
                        if (token) {
                            toast("로그인 성공! ✨", "success");
                            await fetch(`/api/auth/cap-sync?token=${token}`);
                            window.location.href = "/";
                        } else {
                            window.location.href = "/";
                        }
                    }
                } catch (e) {
                    console.error("Deep link parsing error:", e);
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
