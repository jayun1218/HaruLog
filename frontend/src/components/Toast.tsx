"use client";
import { useState, useEffect, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

let toastId = 0;
let globalAddToast: ((msg: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "success") {
    globalAddToast?.(message, type);
}

export function ToastProvider() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    useEffect(() => {
        globalAddToast = addToast;
        return () => { globalAddToast = null; };
    }, [addToast]);

    if (!toasts.length) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`
                    flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold
                    animate-[slideUp_0.3s_ease-out]
                    ${t.type === "success" ? "bg-haru-sky-deep text-white" :
                        t.type === "error" ? "bg-red-500 text-white" :
                            "bg-slate-700 text-white"}
                `}>
                    {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}
                    {t.message}
                </div>
            ))}
        </div>
    );
}
