"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Mode = "chat" | "fortune" | "tarot";

export default function AIAgent() {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<Mode>("chat");
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Fortune State
    const [isNoteVisible, setIsNoteVisible] = useState(false);
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [fortuneResult, setFortuneResult] = useState("");

    // Tarot State
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const [tarotResult, setTarotResult] = useState("");

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            fetch(`${API}/api/ai-chat/${today}`)
                .then(res => res.json())
                .then(data => {
                    if (data.messages) setMessages(data.messages);
                    if (data.fortune) {
                        setFortuneResult(data.fortune);
                        setIsNoteVisible(true);
                        setIsNoteOpen(true);
                    }
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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, fortuneResult, tarotResult]);

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
                const lastMsg = data.messages[data.messages.length - 1];
                if (mode === "chat") {
                    setMessages(data.messages);
                } else if (mode === "fortune") {
                    setFortuneResult(lastMsg.content);
                } else if (mode === "tarot") {
                    setTarotResult(lastMsg.content);
                }
            }
        } catch (error) {
            toast("대화 중 오류가 발생했어요.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const resetModes = () => {
        // 기존에는 여기서 모든 상태를 초기화했으나, 
        // 이제는 API에서 로드된 상태를 유지하도록 비워둡니다.
        // 필요 시 모드 전환 초기 효과만 줄 수 있습니다.
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

                            {/* 모드 선택 바 */}
                            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                                <button
                                    onClick={() => { setMode("chat"); resetModes(); }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === "chat" ? "bg-white dark:bg-slate-700 text-haru-sky-deep shadow-sm" : "text-slate-400"}`}
                                >
                                    💬 대화
                                </button>
                                <button
                                    onClick={() => { setMode("fortune"); resetModes(); }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === "fortune" ? "bg-white dark:bg-slate-700 text-green-500 shadow-sm" : "text-slate-400"}`}
                                >
                                    🍀 운세
                                </button>
                                <button
                                    onClick={() => { setMode("tarot"); resetModes(); }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === "tarot" ? "bg-white dark:bg-slate-700 text-purple-500 shadow-sm" : "text-slate-400"}`}
                                >
                                    🃏 타로
                                </button>
                            </div>
                        </header>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50/30 dark:bg-slate-900/30">
                            {mode === "chat" && (
                                <>
                                    {messages.length === 0 && (
                                        <div className="text-center py-12">
                                            <p className="text-slate-400 text-sm">무엇이든 물어보세요! 따뜻하게 들어드릴게요. ✨</p>
                                        </div>
                                    )}
                                    {messages
                                        .filter((msg, index, array) => {
                                            // 운세/타로 관련 시스템성 메시지 필터링 강화
                                            if (msg.role === "user") {
                                                const isFortuneRequest = msg.content === "오늘의 운세를 알려줘!";
                                                const isTarotRequest = msg.content.includes("타로 카드") && msg.content.includes("번을 골랐어");
                                                return !isFortuneRequest && !isTarotRequest;
                                            } else if (msg.role === "assistant") {
                                                // 이전 메시지가 필터링된 요청이었는지 확인하여 대응하는 응답도 숨김
                                                const prevMsg = array[index - 1];
                                                if (prevMsg && prevMsg.role === "user") {
                                                    const wasFortuneRequest = prevMsg.content === "오늘의 운세를 알려줘!";
                                                    const wasTarotRequest = prevMsg.content.includes("타로 카드") && prevMsg.content.includes("번을 골랐어");
                                                    if (wasFortuneRequest || wasTarotRequest) return false;
                                                }
                                                // 현재 상태에 저장된 결과와 일치하는 경우도 숨김 (백업)
                                                if (msg.content === fortuneResult || msg.content === tarotResult) return false;
                                            }
                                            return true;
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
                                </>
                            )}

                            {mode === "fortune" && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8">
                                    {!isNoteVisible ? (
                                        <button
                                            onClick={() => setIsNoteVisible(true)}
                                            className="w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-[3rem] flex items-center justify-center text-7xl shadow-xl hover:scale-110 active:scale-95 transition-all border-4 border-green-200 dark:border-green-800"
                                        >
                                            🍀
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                                            <div
                                                onClick={() => {
                                                    if (!isNoteOpen && !isLoading) {
                                                        setIsNoteOpen(true);
                                                        handleSendMessage("오늘의 운세를 알려줘!");
                                                    }
                                                }}
                                                className={`w-40 h-28 bg-amber-50 rounded-lg shadow-xl flex items-center justify-center text-4xl cursor-pointer transition-all duration-700 relative overflow-hidden ${isNoteOpen ? "scale-110 rotate-3 shadow-2xl" : "hover:rotate-2 hover:scale-105"}`}
                                            >
                                                {isNoteOpen ? "📜" : "✉️"}
                                                <div className="absolute top-0 right-0 w-8 h-8 bg-amber-100/50 rounded-bl-full"></div>
                                            </div>
                                            {isLoading && <p className="text-green-500 font-bold animate-pulse text-sm">신비로운 운세를 불러오는 중...</p>}
                                            {fortuneResult && (
                                                <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border-2 border-green-100 dark:border-green-900/50 text-slate-600 dark:text-slate-300 text-sm leading-relaxed text-center animate-in slide-in-from-bottom duration-700">
                                                    <div className="text-xl mb-2">✨</div>
                                                    {fortuneResult}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!isNoteVisible && <p className="text-slate-400 text-sm text-center">오늘의 행운을 불러오는 클로버를 눌러보세요!</p>}
                                </div>
                            )}

                            {mode === "tarot" && (
                                <div className="flex-1 flex flex-col items-center gap-8 py-4 overflow-x-hidden">
                                    <h4 className="text-slate-500 font-bold text-sm">마음을 가다듬고 카드 한 장을 골라주세요</h4>
                                    <div className="flex gap-3 justify-center w-full px-4">
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <div
                                                key={num}
                                                onClick={() => {
                                                    if (selectedCard === null && !isLoading) {
                                                        setSelectedCard(num);
                                                        handleSendMessage(`타로 카드 ${num}번을 골랐어. 이 카드의 점괘를 알려줘!`);
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
                                        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border-2 border-purple-100 dark:border-purple-900/50 text-slate-600 dark:text-slate-300 text-sm leading-relaxed text-center animate-in slide-in-from-bottom duration-700 mx-2">
                                            <div className="text-xl mb-2">🔮</div>
                                            {tarotResult}
                                        </div>
                                    )}
                                </div>
                            )}

                            {isLoading && mode === "chat" && (
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

                        {mode === "chat" && (
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
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
