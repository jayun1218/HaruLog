"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AIAgent() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            fetch(`${API}/api/ai-chat/${today}`)
                .then(res => res.json())
                .then(data => {
                    if (data.messages) setMessages(data.messages);
                })
                .catch(() => { });
        }
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (text?: string) => {
        const messageText = text || input;
        if (!messageText.trim() || isLoading) return;

        if (!text) {
            const userMsg = { role: "user", content: messageText };
            setMessages(prev => [...prev, userMsg]);
            setInput("");
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API}/api/ai-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: messageText }),
            });
            const data = await res.json();
            if (data.messages) {
                setMessages(data.messages);
            }
        } catch (error) {
            toast("대화 중 오류가 발생했어요.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* AI 캐릭터 버튼 (플로팅) */}
            {!isOpen && (
                <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-40 group/btn">
                    <span className="bg-white dark:bg-slate-800 text-haru-sky-deep px-3 py-1.5 rounded-xl text-[10px] font-black shadow-xl opacity-0 group-hover/btn:opacity-100 transition-all translate-x-2 group-hover/btn:translate-x-0 border border-haru-sky-accent/30 cursor-default">구름이와 대화</span>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center text-4xl hover:scale-110 active:scale-95 transition-all border-4 border-haru-sky-accent animate-bounce"
                        style={{ animationDuration: '3s' }}
                    >
                        ☁️
                    </button>
                </div>
            )}

            {/* 채팅 창 */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col h-[70vh] sm:h-[650px] overflow-hidden border border-white/20">
                        <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">☁️</span>
                                    <div>
                                        <h3 className="font-bold text-foreground">하루구름 에이전트</h3>
                                        <p className="text-[10px] text-haru-sky-accent font-bold uppercase tracking-widest">Always with you</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">✕</button>
                            </div>
                        </header>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50/30 dark:bg-slate-900/30">
                            {messages.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-slate-400 text-sm">무엇이든 물어보세요! 따뜻하게 들어드릴게요. ✨</p>
                                </div>
                            )}
                            {messages
                                .filter(msg => {
                                    // 운세/타로 관련 시스템성 메시지 필터링 (다른 컴포넌트에서 생성된 메시지 숨김)
                                    const isFortuneRequest = msg.role === "user" && msg.content === "오늘의 운세를 알려줘!";
                                    const isTarotRequest = msg.role === "user" && msg.content.includes("타로 카드") && msg.content.includes("번을 골랐어");

                                    // 운세/타로 결과가 포함된 AI 메시지 숨김 (헤더나 특정 키워드 기준)
                                    const isFortuneResult = msg.role === "assistant" && (msg.content.includes("오늘의 운세 쪽지") || msg.content.includes("행운의 컬러"));
                                    const isTarotResult = msg.role === "assistant" && (msg.content.includes("타로 카드") || msg.content.includes("복채는") || msg.content.includes("점괘입니다"));

                                    return !isFortuneRequest && !isTarotRequest && !isFortuneResult && !isTarotResult;
                                })
                                .map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                            ? "bg-haru-sky-medium text-haru-sky-deep font-bold rounded-tr-none shadow-sm"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700"
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md">
                            <div className="relative">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="메시지를 입력하세요..."
                                    className="w-full bg-white dark:bg-slate-900 p-4 pr-16 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-haru-sky-accent text-sm"
                                />
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-2 bottom-2 px-4 bg-haru-sky-accent text-haru-sky-deep font-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                                >
                                    전송
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
