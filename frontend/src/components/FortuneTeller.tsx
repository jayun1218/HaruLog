"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FortuneTeller() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isNoteVisible, setIsNoteVisible] = useState(false);
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [fortuneResult, setFortuneResult] = useState("");
    const [archive, setArchive] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<"main" | "archive">("main");

    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchArchive = () => {
        fetch(`${API}/api/ai-chat/archive`)
            .then(res => res.json())
            .then(data => {
                const fortuneArchive = data.filter((item: any) => item.fortune);
                setArchive(fortuneArchive);
            })
            .catch(() => { });
    };

    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            fetch(`${API}/api/ai-chat/${today}`)
                .then(res => res.json())
                .then(data => {
                    if (data.fortune) {
                        setFortuneResult(data.fortune);
                        setIsNoteVisible(true);
                        setIsNoteOpen(true);
                    }
                })
                .catch(() => { });
        }
    }, [isOpen]);

    const handleGetFortune = async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const res = await fetch(`${API}/api/ai-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "오늘의 운세를 알려줘!" }),
            });
            const data = await res.json();
            if (data.fortune) {
                setFortuneResult(data.fortune);
            } else if (data.messages) {
                const lastMsg = data.messages[data.messages.length - 1];
                setFortuneResult(lastMsg.content);
            }
        } catch (error) {
            toast("운세를 가져오는 중 오류가 발생했어요.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {!isOpen && (
                <div className="fixed bottom-[11rem] right-8 z-40 group/btn flex items-center gap-3">
                    <span className="bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-xl text-[10px] font-black shadow-xl opacity-0 group-hover/btn:opacity-100 transition-all translate-x-2 group-hover/btn:translate-x-0 border border-green-100 dark:border-green-900/50 cursor-default">오늘의 운세</span>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all border-2 border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                        🍀
                    </button>
                </div>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col h-[60vh] sm:h-[500px] overflow-hidden border border-white/20">
                        <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🍀</span>
                                <div>
                                    <h3 className="font-bold text-foreground">오늘의 운세</h3>
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Daily Fortune</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (viewMode === "main") {
                                            fetchArchive();
                                            setViewMode("archive");
                                        } else {
                                            setViewMode("main");
                                        }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                                >
                                    {viewMode === "main" ? "나의 기록" : "돌아가기"}
                                </button>
                                <button onClick={() => { setIsOpen(false); setViewMode("main"); }} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">✕</button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 dark:bg-slate-900/30">
                            {viewMode === "main" ? (
                                <div className="flex flex-col items-center justify-center min-h-full gap-8">
                                    {!isNoteVisible ? (
                                        <button
                                            onClick={() => setIsNoteVisible(true)}
                                            className="w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-[3rem] flex items-center justify-center text-7xl shadow-xl hover:scale-110 active:scale-95 transition-all border-4 border-green-200 dark:border-green-800"
                                        >
                                            🍀
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500 w-full">
                                            <div
                                                onClick={() => {
                                                    if (!isNoteOpen && !isLoading) {
                                                        setIsNoteOpen(true);
                                                        handleGetFortune();
                                                    }
                                                }}
                                                className={`w-40 h-28 bg-amber-50 rounded-lg shadow-xl flex items-center justify-center text-4xl cursor-pointer transition-all duration-700 relative overflow-hidden ${isNoteOpen ? "scale-110 rotate-3 shadow-2xl" : "hover:rotate-2 hover:scale-105"}`}
                                            >
                                                {isNoteOpen ? "📜" : "✉️"}
                                                <div className="absolute top-0 right-0 w-8 h-8 bg-amber-100/50 rounded-bl-full"></div>
                                            </div>
                                            {isLoading && <p className="text-green-500 font-bold animate-pulse text-sm">신비로운 운세를 불러오는 중...</p>}
                                            {fortuneResult && (
                                                <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border-2 border-green-100 dark:border-green-900/50 text-slate-600 dark:text-slate-300 text-sm leading-relaxed text-center animate-in slide-in-from-bottom duration-700 w-full">
                                                    <div className="text-xl mb-2">✨</div>
                                                    <div className="whitespace-pre-wrap">{fortuneResult}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!isNoteVisible && <p className="text-slate-400 text-sm text-center">오늘의 행운을 불러오는 클로버를 눌러보세요!</p>}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right duration-500">
                                    <h4 className="font-bold text-slate-600 dark:text-slate-400 text-sm mb-2 px-2">과거 운세 기록</h4>
                                    {archive.length === 0 ? (
                                        <div className="py-20 text-center text-slate-400 text-sm">아직 저장된 기록이 없어요.</div>
                                    ) : (
                                        archive.map((item, idx) => (
                                            <div key={idx} className="p-5 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                                                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                    <span className="text-xs font-black text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">{item.date}</span>
                                                    <span className="text-lg">📜</span>
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                                    {item.fortune}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

