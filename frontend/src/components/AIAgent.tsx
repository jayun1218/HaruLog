"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/Toast";
import { useBackendToken } from "@/components/AuthProvider";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AIAgent() {
    const { backendToken } = useBackendToken();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mood, setMood] = useState("NORMAL");
    const [isListening, setIsListening] = useState(false);

    const moodEmojis: Record<string, string> = {
        NORMAL: "☁️",
        HAPPY: "😊",
        SAD: "🥺",
        COOL: "😎",
        THINKING: "🧐",
    };

    const scrollRef = useRef<HTMLDivElement>(null);

    // 타로/운세 관련 메시지는 대화 목록에서 숨김
    const filterChatMessages = (msgs: { role: string; content: string }[]) =>
        msgs.filter(m => !(
            m.role === "user" && (
                m.content?.includes("타로") ||
                m.content?.includes("운세")
            )
        ));

    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            const headers: any = backendToken ? { Authorization: `Bearer ${backendToken}` } : {};
            fetch(`${API}/api/ai-chat/${today}`, { headers })
                .then(res => res.json())
                .then(data => {
                    if (data.messages && data.messages.length > 0) {
                        setMessages(filterChatMessages(data.messages));
                        if (data.mood) setMood(data.mood);
                    } else {
                        // 대화가 비어있는 경우, 첫 인사 유도 (숨겨진 메시지 전송)
                        handleSendMessage("안녕, 구름아! ✨", true);
                    }
                })
                .catch(() => { });
        }
    }, [isOpen, backendToken]);


    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (text?: string, isHidden: boolean = false) => {
        const messageText = text || input;
        if (!messageText.trim() || isLoading) return;

        if (!isHidden) {
            const userMsg = { role: "user", content: messageText };
            setMessages(prev => [...prev, userMsg]);
            setInput("");
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API}/api/ai-chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {})
                },
                body: JSON.stringify({ message: messageText }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "서버 응답 오류가 발생했습니다.");
            }

            const data = await res.json();
            if (data.messages) {
                setMessages(filterChatMessages(data.messages));
                if (data.mood) setMood(data.mood);
            }
        } catch (error: any) {
            console.error("Chat Error:", error);
            toast(error.message || "대화 중 오류가 발생했어요.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSTT = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast("이 브라우저는 음성 인식을 지원하지 않아요.", "error");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };
        recognition.onerror = () => {
            toast("음성 인식 중 오류가 발생했어요.", "error");
            setIsListening(false);
        };

        recognition.start();
    };

    const handleTTS = async (text: string) => {
        try {
            const res = await fetch(`${API}/api/tts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
        } catch (error) {
            toast("음성 출력 중 오류가 발생했어요.", "error");
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
                        className={`w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center text-4xl hover:scale-110 active:scale-95 transition-all border-4 border-haru-sky-accent ${mood === 'NORMAL' ? 'animate-bounce' : 'animate-pulse'}`}
                        style={{ animationDuration: '3s' }}
                    >
                        {moodEmojis[mood] || "☁️"}
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
                                    <span className="text-2xl">{moodEmojis[mood] || "☁️"}</span>
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
                                    <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed relative group/msg ${msg.role === "user"
                                            ? "bg-haru-sky-medium text-haru-sky-deep font-bold rounded-tr-none shadow-sm"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700"
                                            }`}>
                                            {msg.content}
                                            {msg.role === "assistant" && (
                                                <button
                                                    onClick={() => handleTTS(msg.content)}
                                                    className="absolute -right-10 top-2 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400 hover:text-haru-sky-accent opacity-0 group-hover/msg:opacity-100 transition-opacity"
                                                    title="음성으로 듣기"
                                                >
                                                    🔊
                                                </button>
                                            )}
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
                                    placeholder={isListening ? "듣고 있어요..." : "메시지를 입력하세요..."}
                                    className={`w-full bg-white dark:bg-slate-900 p-4 pr-28 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-haru-sky-accent text-sm ${isListening ? "ring-2 ring-red-400 border-red-400" : ""}`}
                                />
                                <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                                    <button
                                        onClick={handleSTT}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"}`}
                                        title="음성으로 말하기"
                                    >
                                        {isListening ? "🛑" : "🎙️"}
                                    </button>
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!input.trim() || isLoading}
                                        className="px-4 bg-haru-sky-accent text-haru-sky-deep font-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                                    >
                                        전송
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
