"use client";

import { useState, useEffect } from "react";
import { toast } from "@/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const THEMES = [
    { id: "신비로운 달빛", emoji: "🌙", label: "달빛", color: "from-blue-900 to-indigo-900" },
    { id: "불꽃", emoji: "🔥", label: "불꽃", color: "from-red-900 to-orange-800" },
    { id: "자연", emoji: "🌿", label: "자연", color: "from-green-900 to-emerald-800" },
    { id: "우주", emoji: "🌌", label: "우주", color: "from-purple-900 to-violet-900" },
];

const POSITIONS = ["과거", "현재", "미래"];
const POSITION_COLORS = ["text-blue-400", "text-purple-400", "text-amber-400"];

interface SpreadCard {
    cardNum: number;
    imageUrl: string | null;
    isLoading: boolean;
    isFlipped: boolean;
}

export default function TarotReader() {
    const [isOpen, setIsOpen] = useState(false);
    const [phase, setPhase] = useState<"theme" | "select" | "result">("theme");
    const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
    const [spreadCards, setSpreadCards] = useState<(SpreadCard | null)[]>([null, null, null]);
    const [currentSlot, setCurrentSlot] = useState(0); // 0=과거, 1=현재, 2=미래
    const [tarotResult, setTarotResult] = useState("");
    const [isReadingLoading, setIsReadingLoading] = useState(false);
    const [archive, setArchive] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<"main" | "archive">("main");

    const CARD_COUNT = 7;

    const fetchArchive = () => {
        fetch(`${API}/api/ai-chat/archive`, { credentials: "include" })
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
            fetch(`${API}/api/ai-chat/${today}`, { credentials: "include" })
                .then(res => res.json())
                .then(data => {
                    if (data.tarot) {
                        setTarotResult(data.tarot);
                        setPhase("result");
                        if (data.selected_cards?.length === 3) {
                            const loaded: SpreadCard[] = data.selected_cards.map((n: number) => ({
                                cardNum: n, imageUrl: null, isLoading: false, isFlipped: true
                            }));
                            setSpreadCards(loaded);
                        }
                    }
                })
                .catch(() => { });
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsOpen(false);
        setViewMode("main");
    };

    const handleReset = () => {
        setPhase("theme");
        setSpreadCards([null, null, null]);
        setCurrentSlot(0);
        setTarotResult("");
        setSelectedTheme(THEMES[0]);
    };

    const handleCardSelect = async (cardNum: number) => {
        // 이미 선택된 카드인지 확인
        if (spreadCards.some(c => c?.cardNum === cardNum)) return;
        if (currentSlot >= 3) return;

        const slot = currentSlot;
        const position = POSITIONS[slot];

        // 카드 즉시 추가 (이미지 로딩 중)
        const newCard: SpreadCard = { cardNum, imageUrl: null, isLoading: true, isFlipped: false };
        const newSpread = [...spreadCards];
        newSpread[slot] = newCard;
        setSpreadCards(newSpread);
        setCurrentSlot(slot + 1);

        // DALL-E 이미지 생성
        try {
            const res = await fetch(`${API}/api/tarot-image`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ card_number: cardNum, position, theme: selectedTheme.id }),
            });
            const imgData = await res.json();

            setSpreadCards(prev => {
                const updated = [...prev];
                if (updated[slot]) {
                    updated[slot] = { ...updated[slot]!, imageUrl: imgData.image_url, isLoading: false };
                }
                return updated;
            });

            // 500ms 후 카드 뒤집기 애니메이션
            setTimeout(() => {
                setSpreadCards(prev => {
                    const updated = [...prev];
                    if (updated[slot]) updated[slot] = { ...updated[slot]!, isFlipped: true };
                    return updated;
                });
            }, 500);
        } catch {
            setSpreadCards(prev => {
                const updated = [...prev];
                if (updated[slot]) updated[slot] = { ...updated[slot]!, isLoading: false, isFlipped: true };
                return updated;
            });
        }

        // 3장 모두 선택시 AI 점괘 요청
        if (slot === 2) {
            await requestReading(newSpread, slot, cardNum);
        }
    };

    const requestReading = async (cards: (SpreadCard | null)[], lastSlot: number, lastCard: number) => {
        const allCards = [...cards];
        allCards[lastSlot] = { cardNum: lastCard, imageUrl: null, isLoading: false, isFlipped: true };

        const cardNums = allCards.map(c => c?.cardNum ?? 0);
        const message = `타로 3장 스프레드를 뽑았어. 과거 ${cardNums[0]}번, 현재 ${cardNums[1]}번, 미래 ${cardNums[2]}번 카드야. 테마는 '${selectedTheme.id}'야. 각 위치의 의미와 전체 흐름을 신비롭고 자세하게 알려줘!`;

        setIsReadingLoading(true);
        try {
            const res = await fetch(`${API}/api/ai-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ message }),
            });
            if (!res.ok) throw new Error("서버 오류");
            const data = await res.json();
            const result = data.tarot || (data.messages?.slice(-1)[0]?.content ?? "");
            setTarotResult(result);
            setPhase("result");
        } catch {
            toast("점괘를 불러오는 중 오류가 발생했어요.", "error");
        } finally {
            setIsReadingLoading(false);
        }
    };

    const allSelected = spreadCards.filter(Boolean).length === 3;

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
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col h-[80vh] sm:h-[680px] overflow-hidden border border-white/20">
                        {/* Header */}
                        <header className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{selectedTheme.emoji}</span>
                                <div>
                                    <h3 className="font-bold text-foreground text-sm">오늘의 타로</h3>
                                    <p className="text-[9px] text-purple-500 font-bold uppercase tracking-widest">3-Card Spread</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {phase === "result" && (
                                    <button onClick={handleReset} className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors">
                                        다시하기
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (viewMode === "main") { fetchArchive(); setViewMode("archive"); }
                                        else setViewMode("main");
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                >
                                    {viewMode === "main" ? "나의 기록" : "돌아가기"}
                                </button>
                                <button onClick={handleClose} className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-sm">✕</button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto">
                            {viewMode === "archive" ? (
                                /* ── 보관함 ── */
                                <div className="flex flex-col gap-4 p-5 animate-in fade-in slide-in-from-right duration-500">
                                    <h4 className="font-bold text-slate-600 dark:text-slate-400 text-sm">과거 타로 기록</h4>
                                    {archive.length === 0 ? (
                                        <div className="py-20 text-center text-slate-400 text-sm">아직 저장된 기록이 없어요.</div>
                                    ) : (
                                        archive.map((item, idx) => (
                                            <div key={idx} className="p-5 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                                                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                    <span className="text-xs font-black text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">{item.date}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {item.selected_cards ? `🃏 ${item.selected_cards.join(" · ")}번` : item.selected_card ? `🃏 ${item.selected_card}번` : ""}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap line-clamp-6">{item.tarot}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : phase === "theme" ? (
                                /* ── Phase 1: 테마 선택 ── */
                                <div className="flex flex-col items-center gap-6 p-6 animate-in fade-in duration-500">
                                    <div className="text-center">
                                        <p className="text-slate-500 font-bold text-sm">카드 테마를 선택해주세요</p>
                                        <p className="text-slate-400 text-xs mt-1">선택한 테마로 AI가 카드를 그려줘요</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        {THEMES.map(theme => (
                                            <button
                                                key={theme.id}
                                                onClick={() => { setSelectedTheme(theme); setPhase("select"); }}
                                                className={`h-24 rounded-2xl bg-gradient-to-br ${theme.color} flex flex-col items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-white/10`}
                                            >
                                                <span className="text-3xl">{theme.emoji}</span>
                                                <span className="text-white font-bold text-sm">{theme.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : phase === "select" ? (
                                /* ── Phase 2: 카드 선택 ── */
                                <div className="flex flex-col items-center gap-5 p-5 animate-in fade-in duration-500">
                                    {/* 슬롯 표시 */}
                                    <div className="flex gap-3 w-full">
                                        {POSITIONS.map((pos, i) => (
                                            <div key={pos} className={`flex-1 rounded-2xl border-2 p-3 flex flex-col items-center gap-1 transition-all ${i < spreadCards.filter(Boolean).length ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20" : i === currentSlot ? "border-dashed border-purple-300 bg-slate-50 dark:bg-slate-800/50 animate-pulse" : "border-slate-200 dark:border-slate-700 opacity-40"}`}>
                                                <span className={`text-[10px] font-black ${POSITION_COLORS[i]}`}>{pos}</span>
                                                {spreadCards[i] ? (
                                                    <span className="text-lg">🃏</span>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600 text-lg">?</span>
                                                )}
                                                {spreadCards[i] && <span className="text-[9px] text-purple-500 font-bold">{spreadCards[i]!.cardNum}번</span>}
                                            </div>
                                        ))}
                                    </div>

                                    {currentSlot < 3 && (
                                        <p className="text-slate-500 text-xs font-bold text-center">
                                            {POSITIONS[currentSlot]} 카드를 골라주세요 <span className={POSITION_COLORS[currentSlot]}>({currentSlot + 1}/3)</span>
                                        </p>
                                    )}

                                    {/* 카드 덱 */}
                                    <div className="grid grid-cols-4 gap-2 w-full pb-2">
                                        {Array.from({ length: CARD_COUNT }, (_, i) => i + 1).map(num => {
                                            const isSelected = spreadCards.some(c => c?.cardNum === num);
                                            return (
                                                <button
                                                    key={num}
                                                    disabled={isSelected || currentSlot >= 3}
                                                    onClick={() => handleCardSelect(num)}
                                                    className={`aspect-[2/3] rounded-xl flex flex-col items-center justify-center gap-1 text-sm font-black shadow transition-all
                                                        ${isSelected
                                                            ? "bg-purple-500 text-white ring-2 ring-purple-300 scale-95 opacity-70"
                                                            : currentSlot >= 3 ? "opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800"
                                                                : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:scale-105 active:scale-95 cursor-pointer"
                                                        }`}
                                                >
                                                    <span className="text-base">{isSelected ? "✓" : "✨"}</span>
                                                    <span className="text-[11px]">{num}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {isReadingLoading && (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="text-purple-500 font-bold animate-pulse text-sm">🔮 카드의 운명을 읽는 중...</div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* ── Phase 3: 결과 ── */
                                <div className="flex flex-col gap-5 p-5 animate-in fade-in slide-in-from-bottom duration-700">
                                    {/* 3장 카드 이미지 */}
                                    <div className="flex gap-2 justify-center">
                                        {spreadCards.map((card, i) => (
                                            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                                                <span className={`text-[10px] font-black ${POSITION_COLORS[i]}`}>{POSITIONS[i]}</span>
                                                <div className={`w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg border-2 border-purple-200 dark:border-purple-800 transition-all duration-700 ${card?.isFlipped ? "opacity-100 scale-100" : "opacity-50 scale-95"}`}>
                                                    {card?.imageUrl ? (
                                                        <img src={card.imageUrl} alt={`${POSITIONS[i]} 카드`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full bg-gradient-to-br ${selectedTheme.color} flex items-center justify-center`}>
                                                            {card?.isLoading ? (
                                                                <div className="animate-spin text-white text-xl">✨</div>
                                                            ) : (
                                                                <span className="text-2xl">🃏</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {card && <span className="text-[9px] text-purple-500 font-bold">{card.cardNum}번</span>}
                                            </div>
                                        ))}
                                    </div>

                                    {/* 점괘 텍스트 */}
                                    {tarotResult ? (
                                        <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-purple-100 dark:border-purple-900/30 text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                                            <div className="text-center text-base mb-3">🔮</div>
                                            <div className="whitespace-pre-wrap">{tarotResult}</div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 py-6 text-purple-500 font-bold text-sm animate-pulse">
                                            <span>✨</span> 점괘를 해석하는 중...
                                        </div>
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
