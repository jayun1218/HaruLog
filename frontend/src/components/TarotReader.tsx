"use client";

import { useState, useEffect } from "react";
import { toast } from "@/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TarotReader() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const [tarotResult, setTarotResult] = useState("");
    const [archive, setArchive] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<"main" | "archive">("main");

    const fetchArchive = () => {
        fetch(`${API}/api/ai-chat/archive`)
            .then(res => res.json())
            .then(data => {
                const tarotArchive = data.filter((item: any) => item.tarot);
                setArchive(tarotArchive);
            })
            .catch(() => { });
    };

    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            fetch(`${API}/api/ai-chat/${today}`)
                .then(res => res.json())
                .then(data => {
                    if (data.tarot) {
                        setTarotResult(data.tarot);
                        if (data.selected_card) {
                            setSelectedCard(data.selected_card);
                        }
                    }
                })
                .catch(() => { });
        }
    }, [isOpen]);

    const handleGetTarot = async (num: number) => {
        if (isLoading) return;
        setSelectedCard(num);
        setIsLoading(true);

        try {
            const res = await fetch(`${API}/api/ai-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: `타로 카드 ${num}번을 골랐어. 이 카드의 점괘를 알려줘!` }),
            });
            const data = await res.json();
            if (data.tarot) {
                setTarotResult(data.tarot);
            } else if (data.messages) {
                const lastMsg = data.messages[data.messages.length - 1];
                setTarotResult(lastMsg.content);
            }
        } catch (error) {
            toast("타로 점괘를 가져오는 중 오류가 발생했어요.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {!isOpen && (
                <div className="fixed bottom-28 right-8 z-40 group/btn flex items-center gap-3">
                    <span className="bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-xl text-[10px] font-black shadow-xl opacity-0 group-hover/btn:opacity-100 transition-all translate-x-2 group-hover/btn:translate-x-0 border border-purple-100 dark:border-purple-900/50 cursor-default">오늘의 타로</span>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all border-2 border-purple-200 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    >
                        🃏
                    </button>
                </div>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col h-[70vh] sm:h-[600px] overflow-hidden border border-white/20">
                        <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🃏</span>
                                <div>
                                    <h3 className="font-bold text-foreground">오늘의 타로</h3>
                                    <p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest">Daily Tarot</p>
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
                                    className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                >
                                    {viewMode === "main" ? "나의 기록" : "돌아가기"}
                                </button>
                                <button onClick={() => { setIsOpen(false); setViewMode("main"); }} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">✕</button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/30">
                            {viewMode === "main" ? (
                                <div className="flex flex-col items-center gap-8 min-h-full">
                                    <h4 className="text-slate-500 font-bold text-sm text-center">마음을 가다듬고 카드 한 장을 골라주세요</h4>
                                    <div className="flex gap-3 justify-center w-full px-2">
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <div
                                                key={num}
                                                onClick={() => {
                                                    if (selectedCard === null && !isLoading) {
                                                        handleGetTarot(num);
                                                    }
                                                }}
                                                className={`w-14 h-24 rounded-lg flex items-center justify-center text-2xl transition-all duration-700 cursor-pointer shadow-lg active:scale-95 ${selectedCard === num
                                                    ? "bg-purple-500 text-white scale-125 -translate-y-4 ring-4 ring-purple-200 z-10"
                                                    : selectedCard !== null
                                                        ? "bg-slate-200 dark:bg-slate-800 opacity-30 scale-90"
                                                        : "bg-gradient-to-br from-purple-400 to-indigo-500 text-white hover:-translate-y-2 border-2 border-white/30"
                                                    }`}
                                            >
                                                {selectedCard === num ? "🃏" : "✨"}
                                            </div>
                                        ))}
                                    </div>
                                    {isLoading && <p className="text-purple-500 font-bold animate-pulse text-sm">카드에 깃든 운명을 읽는 중...</p>}
                                    {tarotResult && (
                                        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border-2 border-purple-100 dark:border-purple-900/50 text-slate-600 dark:text-slate-300 text-sm leading-relaxed text-center animate-in slide-in-from-bottom duration-700 w-full">
                                            <div className="text-xl mb-2">🔮</div>
                                            <div className="whitespace-pre-wrap">{tarotResult}</div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right duration-500">
                                    <h4 className="font-bold text-slate-600 dark:text-slate-400 text-sm mb-2 px-2">과거 타로 기록</h4>
                                    {archive.length === 0 ? (
                                        <div className="py-20 text-center text-slate-400 text-sm">아직 저장된 기록이 없어요.</div>
                                    ) : (
                                        archive.map((item, idx) => (
                                            <div key={idx} className="p-5 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                                                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                    <span className="text-xs font-black text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">{item.date}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold text-slate-400">{item.selected_card}번 카드</span>
                                                        <span className="text-lg">🃏</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                                    {item.tarot}
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
