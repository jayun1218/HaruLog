"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message { role: "user" | "assistant"; content: string; }

export default function DiaryChat() {
    const params = useParams();
    const diaryId = params.id;
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "안녕하세요 😊 일기를 잘 읽었어요. 이 날 하루에 대해 더 이야기해볼까요?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg: Message = { role: "user", content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API}/api/diaries/${diaryId}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", content: "죄송해요, 잠시 오류가 발생했어요." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-slate-50">
            <header className="flex items-center gap-3 p-4 bg-white border-b border-slate-100">
                <Link href="/diary/list" className="text-slate-400 hover:text-foreground text-xl">←</Link>
                <div>
                    <h1 className="font-bold text-foreground">AI 상담사</h1>
                    <p className="text-xs text-slate-400">일기에 대해 이야기해요</p>
                </div>
                <div className="ml-auto w-8 h-8 bg-haru-sky-medium rounded-full flex items-center justify-center">🤗</div>
            </header>

            {/* 대화 목록 */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "assistant" && (
                            <div className="w-8 h-8 bg-haru-sky-medium rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">☁️</div>
                        )}
                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                ? "bg-haru-sky-accent text-foreground rounded-br-sm"
                                : "bg-white text-slate-700 shadow-soft rounded-bl-sm"
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 bg-haru-sky-medium rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0">☁️</div>
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-soft">
                            <span className="flex gap-1">
                                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* 입력창 */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-haru-sky-accent outline-none"
                />
                <button onClick={send} disabled={isLoading || !input.trim()}
                    className="w-11 h-11 bg-haru-sky-accent rounded-2xl flex items-center justify-center text-lg disabled:opacity-40 hover:bg-haru-sky-deep transition-colors">
                    ➤
                </button>
            </div>
        </div>
    );
}
