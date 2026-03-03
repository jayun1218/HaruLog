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

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API}/api/ai-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: input }),
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
            {/* AI 캐릭터 버튼 */}
            <div
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center text-4xl cursor-pointer hover:scale-110 active:scale-95 transition-all z-40 border-4 border-haru-sky-accent animate-bounce"
                style={{ animationDuration: '3s' }}
            >
                ☁️
            </div>

            {/* 채팅 창 */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col h-[70vh] sm:h-[600px] overflow-hidden border border-white/20">
                        <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">☁️</span>
                                <div>
                                    <h3 className="font-bold text-foreground">하루구름 에이전트</h3>
                                    <p className="text-[10px] text-haru-sky-accent font-bold uppercase tracking-widest">Always with you</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">✕</button>
                        </header>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                            {messages.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-slate-400 text-sm">오늘 하루는 어떠셨나요?<br />무엇이든 물어보세요! 운세나 타로도 봐드릴게요. ✨</p>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === "user"
                                        ? "bg-haru-sky-medium text-haru-sky-deep font-bold rounded-tr-none"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-tl-none"
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none animate-pulse">
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
                                    onClick={handleSendMessage}
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
