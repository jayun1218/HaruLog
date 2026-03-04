"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toast";
import { Sparkles, Image as ImageIcon, Lock, Unlock, Pin, ChevronUp, ChevronDown, Camera } from "lucide-react";
import ShareCard from "@/components/ShareCard";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Category { id: number; name: string; }

interface Diary {
    id: number;
    title: string;
    content: string;
    created_at: string;
    mood?: string;
    color_code?: string;
    color_name?: string;
    mood_counts?: Record<string, number>;
    is_pinned?: boolean;
    is_locked?: boolean;
    image_url?: string;
    category?: Category;
    analysis?: {
        summary: string;
        emotions: Record<string, number>;
        keywords?: string[];
        card_message?: string;
        positive_points?: string[];
        improvement_points?: string;
    };
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getTopEmotionEmoji(emotions?: Record<string, number>): string {
    if (!emotions) return "📔";
    const map: Record<string, string> = {
        "기쁨": "😊", "슬픔": "😢", "불안": "😰", "분노": "😤", "평온": "😌",
        "joy": "😊", "sadness": "😢", "anxiety": "😰", "anger": "😤", "calm": "😌",
    };
    const top = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0];
    return top ? (map[top[0]] || "💙") : "📔";
}

function getEmotionHeatColor(emotions?: Record<string, number>, mood?: string): string | null {
    if (mood) return null; // 이모지 기분이 있으면 색상 생략
    if (!emotions) return null;
    const colorMap: Record<string, string> = {
        "기쁨": "bg-yellow-100 dark:bg-yellow-900/30",
        "joy": "bg-yellow-100 dark:bg-yellow-900/30",
        "슬픔": "bg-blue-100 dark:bg-blue-900/30",
        "sadness": "bg-blue-100 dark:bg-blue-900/30",
        "분노": "bg-red-100 dark:bg-red-900/30",
        "anger": "bg-red-100 dark:bg-red-900/30",
        "불안": "bg-orange-100 dark:bg-orange-900/30",
        "anxiety": "bg-orange-100 dark:bg-orange-900/30",
        "평온": "bg-green-100 dark:bg-green-900/30",
        "calm": "bg-green-100 dark:bg-green-900/30",
    };
    const top = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0];
    return top ? (colorMap[top[0]] ?? null) : null;
}

export default function DiaryList() {
    const router = useRouter();
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [searchQ, setSearchQ] = useState("");
    const [filterCategoryId, setFilterCategoryId] = useState<number | "">("");
    const [isSearchMode, setIsSearchMode] = useState(false);

    const loadDiaries = useCallback(async (q?: string, catId?: number | "") => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (catId) params.set("category_id", String(catId));
        const res = await fetch(`${API}/api/diaries?${params.toString()}`);
        const data = await res.json();
        setDiaries(Array.isArray(data) ? data : []);
    }, []);

    useEffect(() => {
        Promise.all([
            loadDiaries(searchQ || undefined, filterCategoryId || undefined),
            fetch(`${API}/api/categories`).then(r => r.json()),
        ]).then(([, cats]) => {
            setCategories(Array.isArray(cats) ? cats : []);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, [loadDiaries, filterCategoryId]); // filterCategoryId 변경 시 자동 로드

    const handleSearch = () => {
        setIsSearchMode(!!(searchQ || filterCategoryId));
        loadDiaries(searchQ, filterCategoryId);
    };

    const handlePin = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        await fetch(`${API}/api/diaries/${id}/pin`, { method: "PATCH" });
        loadDiaries(searchQ || undefined, filterCategoryId || undefined);
    };

    // 달력 계산
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const getLocalToday = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };
    const todayKey = getLocalToday();

    const diaryMap: Record<string, Diary[]> = {};
    diaries.forEach(d => {
        const key = d.created_at.slice(0, 10);
        if (!diaryMap[key]) diaryMap[key] = [];
        diaryMap[key].push(d);
    });

    const selectedDiaries = selectedDate ? (diaryMap[selectedDate] || []) : [];

    return (
        <div className="flex flex-col p-5 min-h-[100dvh] max-w-md mx-auto bg-slate-50 dark:bg-slate-900 transition-colors">
            <header className="flex items-center gap-4 mb-4">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-foreground text-xl">←</Link>
                <h1 className="text-2xl font-bold flex-1 dark:text-slate-100">기록 모아보기</h1>
            </header>

            {/* 검색 영역 */}
            <div className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                        placeholder="🔍 제목 또는 내용 검색..."
                        className="flex-1 p-3 bg-white dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 rounded-2xl text-sm border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-haru-sky-accent outline-none"
                    />
                    <button onClick={handleSearch} className="px-4 py-2 bg-haru-sky-medium text-haru-sky-deep font-bold rounded-2xl text-sm hover:bg-haru-sky-accent transition-colors">검색</button>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterCategoryId}
                        onChange={e => { setFilterCategoryId(Number(e.target.value) || ""); }}
                        className="flex-1 p-2 bg-white dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs border border-slate-100 dark:border-slate-700 outline-none appearance-none"
                    >
                        <option value="">📁 카테고리 전체</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {isSearchMode && (
                        <button onClick={() => { setSearchQ(""); setFilterCategoryId(""); setIsSearchMode(false); loadDiaries(); }}
                            className="px-3 py-1 bg-red-50 text-red-400 text-xs font-bold rounded-xl hover:bg-red-100">초기화</button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">소중한 기록들을 불러오고 있어요...</div>
            ) : isSearchMode ? (
                /* 검색 결과 리스트 뷰 */
                <div className="flex flex-col gap-3">
                    {diaries.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">검색 결과가 없어요</div>
                    ) : diaries.map(diary => (
                        <DiaryCard key={diary.id} diary={diary} expandedId={expandedId} setExpandedId={setExpandedId} onPin={handlePin} onRefresh={() => loadDiaries(searchQ || undefined, filterCategoryId || undefined)} />
                    ))}
                </div>
            ) : (
                <>
                    {/* 달력 */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft p-5 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-700 hover:bg-haru-sky-light flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors">‹</button>
                            <h2 className="text-lg font-bold dark:text-slate-100">{year}년 {month + 1}월</h2>
                            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-700 hover:bg-haru-sky-light flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors">›</button>
                        </div>
                        <div className="grid grid-cols-7 mb-2">
                            {WEEKDAYS.map((d, i) => (
                                <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-y-1">
                            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                const hasDiary = !!diaryMap[dateKey];
                                const isToday = dateKey === todayKey;
                                const isSelected = dateKey === selectedDate;
                                const d0 = diaryMap[dateKey]?.[0];
                                const emoji = d0?.mood || (d0?.analysis ? getTopEmotionEmoji(d0.analysis.emotions) : null);
                                const customColor = d0?.color_code;

                                return (
                                    <button key={day} onClick={() => {
                                        if (hasDiary) {
                                            setSelectedDate(isSelected ? null : dateKey);
                                            setExpandedId(null);
                                        } else {
                                            router.push(`/diary/write?date=${dateKey}`);
                                        }
                                    }}
                                        className={`flex flex-col items-center justify-start py-1.5 rounded-2xl transition-all ${isSelected ? "bg-haru-sky-accent scale-105 shadow-soft" : isToday ? "bg-haru-sky-light dark:bg-haru-sky-deep/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                                        style={(!isSelected && !isToday && customColor) ? { backgroundColor: `${customColor}33` } : {}}
                                    >
                                        <span className={`text-sm font-semibold leading-tight ${isToday ? "text-haru-sky-deep dark:text-haru-sky-accent" : "text-slate-700 dark:text-slate-300"}`}>{day}</span>
                                        {emoji ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-base leading-none mt-0.5">{emoji}</span>
                                                {customColor && <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: customColor }}></div>}
                                            </div>
                                        ) : (
                                            <span className="h-5 mt-0.5 text-[10px] text-slate-200 dark:text-slate-700 group-hover:text-haru-sky-accent">+</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="text-xs text-slate-400 text-center mb-4 font-medium">
                        {month + 1}월에 <span className="text-haru-sky-deep font-bold">{Object.keys(diaryMap).filter(k => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length}개</span>의 기록이 있어요
                    </div>

                    {selectedDate && (
                        <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-bold text-slate-500 px-1">
                                {new Date(selectedDate + "T12:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })} 기록
                            </h3>
                            {selectedDiaries.length === 0 ? (
                                <div className="bg-white rounded-3xl p-6 text-center">
                                    <p className="text-slate-400 text-sm">이 날의 기록이 없어요</p>
                                    <Link href="/diary/write" className="mt-3 inline-block text-xs text-haru-sky-deep font-bold border-b border-haru-sky-deep">일기 쓰러 가기</Link>
                                </div>
                            ) : selectedDiaries.map(diary => (
                                <DiaryCard key={diary.id} diary={diary} expandedId={expandedId} setExpandedId={setExpandedId} onPin={handlePin} onRefresh={() => loadDiaries()} />
                            ))}
                        </div>
                    )}

                    {diaries.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-4 text-center mt-8">
                            <span className="text-6xl opacity-20">📅</span>
                            <p className="text-slate-500 font-medium">아직 기록된 하루가 없어요.<br />첫 일기를 써보시겠어요?</p>
                            <Link href="/diary/write" className="text-haru-sky-deep font-bold border-b-2 border-haru-sky-deep pb-1">일기 쓰러 가기</Link>
                        </div>
                    )}
                </>
            )}
            <footer className="mt-12 text-center text-slate-300 text-xs">차곡차곡 쌓인 너의 소중한 시간들</footer>
        </div>
    );
}

function DiaryCard({ diary, expandedId, setExpandedId, onPin, onRefresh }: {
    diary: Diary;
    expandedId: number | null;
    setExpandedId: (id: number | null) => void;
    onPin: (id: number, e: React.MouseEvent) => void;
    onRefresh: () => void;
}) {
    const isExpanded = expandedId === diary.id;
    const [isPinLocked, setIsPinLocked] = useState(diary.is_locked ?? false);
    const [showUnlock, setShowUnlock] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [unlocked, setUnlocked] = useState(!diary.is_locked);
    const [showShareCard, setShowShareCard] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLock = async () => {
        const pin = prompt("잠금 PIN 4자리를 설정하세요:");
        if (!pin) return;
        await fetch(`${API}/api/diaries/${diary.id}/lock`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin })
        });
        setIsPinLocked(true); setUnlocked(false); onRefresh();
    };

    const handleUnlock = async () => {
        const res = await fetch(`${API}/api/diaries/${diary.id}/unlock`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: pinInput })
        });
        if (res.ok) {
            setUnlocked(true);
            setShowUnlock(false);
            setPinInput("");
            toast("기록이 열렸어요 🔓", "success");
        }
        else toast("PIN이 올바르지 않습니다.", "error");
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const form = new FormData();
        form.append("file", file);
        form.append("diary_id", String(diary.id));
        const res = await fetch(`${API}/api/upload?diary_id=${diary.id}`, { method: "POST", body: form });
        if (res.ok) {
            toast("이미지가 성공적으로 첨부되었어요 📷", "success");
            onRefresh();
        } else {
            toast("이미지 업로드에 실패했어요.", "error");
        }
    };

    // 잠긴 일기는 제목만 표시
    if (isPinLocked && !unlocked) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft p-5 flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                <div className="flex-1">
                    <p className="font-bold text-foreground text-base">{diary.title}</p>
                    <p className="text-xs text-slate-400">잠긴 일기입니다</p>
                </div>
                {showUnlock ? (
                    <div className="flex gap-1">
                        <input value={pinInput} onChange={e => setPinInput(e.target.value)} type="password" maxLength={8} placeholder="PIN" className="w-20 text-xs p-2 bg-slate-50 dark:bg-slate-700 dark:text-slate-200 rounded-xl outline-none border border-haru-sky-accent" />
                        <button onClick={handleUnlock} className="text-xs px-2 py-1 bg-haru-sky-medium text-haru-sky-deep font-bold rounded-xl">확인</button>
                    </div>
                ) : (
                    <button onClick={() => setShowUnlock(true)} className="text-xs px-3 py-1.5 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-haru-sky-light">열기</button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft overflow-hidden">
            <div onClick={() => setExpandedId(isExpanded ? null : diary.id)} className="w-full p-5 text-left flex flex-col gap-2 cursor-pointer select-none">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {diary.color_code ? (
                                <div className="w-6 h-6 rounded-lg shadow-sm shrink-0 flex items-center justify-center text-xs" style={{ backgroundColor: diary.color_code }}>
                                    {diary.mood}
                                </div>
                            ) : (
                                diary.mood && <span className="text-xl">{diary.mood}</span>
                            )}
                            <h2 className="text-base font-bold text-foreground truncate">{diary.title}</h2>
                            {diary.is_pinned && <span className="text-yellow-400 text-sm flex-shrink-0">📌</span>}
                        </div>
                        <div className="flex gap-2 items-center">
                            {diary.category && (
                                <span className="text-[10px] text-haru-sky-deep bg-haru-sky-light px-2 py-0.5 rounded-lg w-fit font-bold">📁 {diary.category.name}</span>
                            )}
                            {diary.color_name && (
                                <span className="text-[10px] font-bold text-slate-400">🎨 {diary.color_name}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={e => onPin(diary.id, e)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${diary.is_pinned ? "bg-yellow-100 text-yellow-500" : "bg-slate-50 text-slate-300 hover:bg-yellow-50 hover:text-yellow-400"}`}>📌</button>
                        <span className="text-slate-300 text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                </div>
                {diary.analysis?.summary && (
                    <p className="text-sm text-slate-500 bg-haru-sky-light/50 dark:bg-haru-sky-deep/5 p-3 rounded-xl border border-haru-sky-accent/20">✨ {diary.analysis.summary}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                    {diary.analysis?.keywords ? (
                        diary.analysis.keywords.map((kw, i) => (
                            <span key={i} className="text-[10px] font-bold text-haru-sky-deep bg-white dark:bg-slate-700 px-2 py-1 rounded-lg shadow-sm border border-haru-sky-accent/30 lowercase">#{kw}</span>
                        ))
                    ) : (
                        diary.analysis?.emotions && Object.entries(diary.analysis.emotions).map(([em, score]) => (
                            score > 0.3 && <span key={em} className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full text-slate-500 dark:text-slate-400">#{em}</span>
                        ))
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="px-5 pb-5 flex flex-col gap-4 border-t border-slate-100 dark:border-slate-700">
                    {/* 첨부 이미지 */}
                    {diary.image_url && (
                        <img src={`${API}${diary.image_url}`} alt="첨부 이미지" className="w-full rounded-2xl object-cover max-h-48 mt-4" />
                    )}
                    {/* AI 응원 카드 */}
                    {diary.analysis?.card_message && (
                        <div className="mt-4 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-800 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                            <p className="text-[10px] font-bold opacity-70 mb-2 tracking-widest uppercase">AI Counselor's Card</p>
                            <p className="text-base font-bold leading-relaxed mb-1">“ {diary.analysis.card_message} ”</p>
                            <div className="flex justify-end opacity-50"><Sparkles size={14} /></div>
                        </div>
                    )}

                    <div className="pt-4">
                        <p className="text-xs font-semibold text-slate-400 mb-2">📝 일기 전문</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">{diary.content}</p>
                    </div>
                    {diary.analysis?.positive_points && diary.analysis.positive_points.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-400 mb-2">🌟 오늘 잘한 일</p>
                            <div className="flex flex-col gap-2">
                                {diary.analysis.positive_points.map((pt, i) => (
                                    <div key={i} className="text-sm text-slate-600 bg-haru-sky-light px-3 py-2 rounded-xl">👍 {pt}</div>
                                ))}
                            </div>
                        </div>
                    )}
                    {diary.analysis?.improvement_points && (
                        <div>
                            <p className="text-xs font-semibold text-slate-400 mb-2">💡 개선 포인트</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">{diary.analysis.improvement_points}</p>
                        </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-700">
                        <Link href={`/diary/${diary.id}/chat`} className="flex items-center gap-1 text-xs px-3 py-2 bg-haru-sky-medium text-haru-sky-deep font-bold rounded-xl hover:bg-haru-sky-accent transition-colors">
                            🤗 AI 대화
                        </Link>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-xs px-3 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 text-slate-500 font-bold rounded-xl hover:bg-haru-sky-light transition-colors">
                            📷 이미지
                        </button>
                        <button onClick={handleLock} className="flex items-center gap-1 text-xs px-3 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 text-slate-500 font-bold rounded-xl hover:bg-red-50 hover:text-red-400 transition-colors">
                            🔒 잠금
                        </button>
                        <button onClick={() => setShowShareCard(true)} className="flex items-center gap-1 text-xs px-3 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 text-slate-500 font-bold rounded-xl hover:bg-sky-50 hover:text-sky-500 transition-colors">
                            📤 공유 카드
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>
                    {showShareCard && (
                        <ShareCard diary={diary} onClose={() => setShowShareCard(false)} />
                    )}
                </div>
            )}
        </div>
    );
}
