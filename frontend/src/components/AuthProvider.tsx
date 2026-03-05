"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "haru_backend_token";

interface BackendAuthContextType {
    backendToken: string | null;
    isLoading: boolean;
}

const BackendAuthContext = createContext<BackendAuthContextType>({
    backendToken: null,
    isLoading: true,
});

export function useBackendToken() {
    return useContext(BackendAuthContext);
}

function BackendTokenManager({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [backendToken, setBackendToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            // 로그아웃 시 토큰 삭제
            localStorage.removeItem(TOKEN_KEY);
            setBackendToken(null);
            setIsLoading(false);
            return;
        }

        if (status === "authenticated" && session?.user?.email) {
            // 이미 저장된 토큰 확인
            const cached = localStorage.getItem(TOKEN_KEY);
            if (cached) {
                setBackendToken(cached);
                setIsLoading(false);
                return;
            }

            // 백엔드에서 새 토큰 발급
            const issueToken = async () => {
                try {
                    console.log("[BackendAuth] Issuing backend token for:", session.user?.email);
                    const res = await fetch(`${API}/api/auth/token`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: session.user?.email,
                            name: session.user?.name,
                            picture: session.user?.image,
                            provider: "google",
                        }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        console.log("[BackendAuth] Token issued successfully!");
                        localStorage.setItem(TOKEN_KEY, data.token);
                        setBackendToken(data.token);
                    } else {
                        const errText = await res.text();
                        console.error("[BackendAuth] Token issuance failed:", res.status, errText);
                    }
                } catch (e) {
                    console.error("[BackendAuth] Token issuance error:", e);
                } finally {
                    setIsLoading(false);
                }
            };

            issueToken();
        }
    }, [status, session?.user?.email]);

    return (
        <BackendAuthContext.Provider value={{ backendToken, isLoading }}>
            {children}
        </BackendAuthContext.Provider>
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <BackendTokenManager>
                {children}
            </BackendTokenManager>
        </SessionProvider>
    );
}
