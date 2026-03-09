"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/Toast";
import { Sparkles, ArrowRight, RotateCcw, Mic, Save, X, Plus } from "lucide-react";
import { useBackendToken } from "@/components/AuthProvider";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MOODS = [
    { id: "joy", label: "기쁨", emoji: "😊", color: "#FCD34D" },
    { id: "sadness", label: "슬픔", emoji: "😢", color: "#60A5FA" },
    { id: "anger", label: "분노", emoji: "😤", color: "#FB7185" },
    { id: "anxiety", label: "불안", emoji: "😰", color: "#F472B6" },
    { id: "calm", label: "평온", emoji: "😌", color: "#34D399" },
];

const COLOR_ADJECTIVES = {
    joy: ["찬란한", "따스한", "반짝이는", "활기찬", "달콤한"],
    sadness: ["애틋한", "깊은", "잔잔한", "아련한", "투명한"],
    anger: ["강렬한", "뜨거운", "선명한", "타오르는", "확고한"],
    anxiety: ["몽환적인", "묘한", "복잡한", "흔들리는", "신비로운"],
    calm: ["고요한", "편안한", "부드러운", "차분한", "포근한"],
};

const COLOR_NOUNS = {
    joy: ["태양", "축제", "미소", "오후", "선물"],
    sadness: ["바다", "비", "그림자", "새벽", "이슬"],
    anger: ["불꽃", "노을", "심장", "번개", "의지"],
    anxiety: ["안개", "숲", "구름", "달빛", "비밀"],
    calm: ["바람", "숲", "호수", "담요", "낮잠"],
};

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function componentToHex(c: number) {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}

function rgbToHex(r: number, g: number, b: number) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function DiaryWriteInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { backendToken } = useBackendToken();
    const initialDate = searchParams.get("date");

    // --- State ---
    const [step, setStep] = useState(1); // 1: Mixing, 2: Result, 3: Writing
    const [moodCounts, setMoodCounts] = useState<Record<string, number>>({
        joy: 0, sadness: 0, anger: 0, anxiety: 0, calm: 0
    });
    const [mixedColor, setMixedColor] = useState("#F8FAFC");
    const [colorName, setColorName] = useState("");

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [selectedDate, setSelectedDate] = useState<string>(initialDate || new Date().toISOString().slice(0, 10));
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [interimText, setInterimText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
    const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const recognitionRef = useRef<any>(null);

    // --- Effects ---
    useEffect(() => {
        const headers: any = backendToken ? { Authorization: `Bearer ${backendToken}` } : {};
        fetch(`${API}/api/categories`, { headers })
            .then(res => res.json())
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(() => { });
    }, [backendToken]);

    // 색상 조합 로직
    useEffect(() => {
        const totalSpoons = Object.values(moodCounts).reduce((a, b) => a + b, 0);
        if (totalSpoons === 0) {
            setMixedColor("#F8FAFC");
            return;
        }

        let r = 0, g = 0, b = 0;
        Object.entries(moodCounts).forEach(([id, count]) => {
            if (count === 0) return;
            const mood = MOODS.find(m => m.id === id)!;
            const rgb = hexToRgb(mood.color);
            const weight = count / totalSpoons;
            r += rgb.r * weight;
            g += rgb.g * weight;
            b += rgb.b * weight;
        });

        setMixedColor(rgbToHex(r, g, b));
    }, [moodCounts]);

    // --- Handlers ---
    const addSpoon = (id: string) => {
        const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);
        if (total >= 10) {
            toast("냄비가 가득 찼어요! 이제 섞어볼까요?", "info");
            return;
        }
        setMoodCounts(prev => ({ ...prev, [id]: prev[id] + 1 }));
    };

    const resetPot = () => {
        setMoodCounts({ joy: 0, sadness: 0, anger: 0, anxiety: 0, calm: 0 });
    };

    const handleMix = () => {
        const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);
        if (total === 0) {
            toast("감정을 한 스푼 이상 넣어주세요 🥣", "info");
            return;
        }

        // 이름 생성 로직
        const dominantMoodId = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];
        const adjectives = (COLOR_ADJECTIVES as any)[dominantMoodId];
        const nouns = (COLOR_NOUNS as any)[dominantMoodId];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];

        setColorName(`${adj} ${noun}의 ${MOODS.find(m => m.id === dominantMoodId)!.label}`);
        setStep(2);
    };

    const handleSuggestTitle = async () => {
        if (!content.trim()) return;
        setIsSuggestingTitle(true);
        try {
            const res = await fetch(`${API}/api/suggest-title`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {})
                },
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            setSuggestedTitles(data.titles || []);
        } finally {
            setIsSuggestingTitle(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const res = await fetch(`${API}/api/categories`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {})
                },
                body: JSON.stringify({ name: newCategoryName }),
            });
            if (res.ok) {
                const newCat = await res.json();
                setCategories(prev => [...prev, newCat]);
                setNewCategoryName("");
                toast("새 카테고리가 추가되었어요 ✨", "success");
            }
        } catch {
            toast("카테고리 추가에 실패했어요.", "error");
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm("이 카테고리를 삭제할까요?")) return;
        try {
            const res = await fetch(`${API}/api/categories/${id}`, {
                method: "DELETE",
                headers: {
                    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {})
                },
            });
            if (res.ok) {
                setCategories(prev => prev.filter(c => c.id !== id));
                if (selectedCategoryId === id) setSelectedCategoryId("");
                toast("카테고리가 삭제되었어요.", "info");
            }
        } catch {
            toast("카테고리 삭제에 실패했어요.", "error");
        }
    };

    const handleSubmit = async () => {
        if (!title || !content) {
            toast("제목과 내용을 입력해주세요!", "info");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API}/api/diaries`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {})
                },
                body: JSON.stringify({
                    title,
                    content,
                    category_id: selectedCategoryId || null,
                    date: selectedDate,
                    mood: MOODS.find(m => m.id === Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0])?.emoji,
                    mood_counts: moodCounts,
                    color_code: mixedColor,
                    color_name: colorName
                })
            });
            if (res.ok) {
                toast("오늘의 색상이 소중하게 저장되었어요 ✨", "success");
                router.push("/diary/list");
            }
        } catch {
            toast("저장에 실패했어요.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- STT ---
    const startRecording = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (e: any) => {
            let interim = "";
            let final = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript;
                else interim += e.results[i][0].transcript;
            }
            if (final) setContent(prev => prev + " " + final);
            setInterimText(interim);
        };
        recognition.onend = () => isRecording && recognition.start();
        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        recognitionRef.current?.stop();
        setIsRecording(false);
        setInterimText("");
    };

    // --- Render Helpers ---
    const totalSpoons = Object.values(moodCounts).reduce((a, b) => a + b, 0);

    return (
        <div className={`transition-colors duration-700 bg-white dark:bg-slate-950 flex flex-col items-center ${step === 3
            ? "h-[100dvh] overflow-hidden px-4 pt-14 pb-0"
            : "min-h-[100dvh] px-6 pt-14 pb-12"
            }`}>

            {/* Header */}
            <header className="w-full max-w-5xl flex justify-between items-center mb-6 shrink-0">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-foreground transition-colors">
                    <X size={24} />
                </Link>
                <div className="flex-1 text-center">
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 opacity-50">Step {step} / 3</span>
                    <h1 className="text-xl font-bold text-foreground">
                        {step === 1 ? "감정 스푼 담기" : step === 2 ? "오늘의 감정 색" : "일기 적기"}
                    </h1>
                </div>
                <div className="w-10"></div>
            </header>

            {/* Step 1: Mood Mixing */}
            {step === 1 && (
                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col items-center">
                        <div className="relative mb-8 group">
                            {/* The Pot (Visual Representation) */}
                            <div
                                className="w-56 h-56 md:w-72 md:h-72 rounded-[4rem] shadow-2xl transition-all duration-700 relative overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-900 border-4 border-white dark:border-slate-800"
                                style={{ boxShadow: `0 20px 60px -15px ${mixedColor}60` }}
                            >
                                {/* Inner Liquid Effect */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 transition-all duration-500 flex flex-col-reverse"
                                    style={{ height: `${(totalSpoons / 10) * 100}%` }}
                                >
                                    {Object.entries(moodCounts).map(([id, count]) => {
                                        if (count === 0) return null;
                                        const mood = MOODS.find(m => m.id === id)!;
                                        return (
                                            <div
                                                key={id}
                                                className="transition-all duration-500 relative"
                                                style={{
                                                    backgroundColor: mood.color,
                                                    height: `${(count / totalSpoons) * 100}%`,
                                                    opacity: 0.8
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="relative z-10 text-6xl md:text-8xl transform group-hover:scale-110 transition-transform duration-500 select-none drop-shadow-lg">🍯</div>
                            </div>

                            {/* Streak-like indicator */}
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-6 py-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i} className={`w-2 h-4 rounded-full transition-colors ${i < totalSpoons ? 'bg-haru-sky-accent shadow-[0_0_8px_rgba(252,211,77,0.5)]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                    ))}
                                </div>
                                <span className="text-xs font-black text-slate-500 tracking-tighter">{totalSpoons}/10</span>
                            </div>
                        </div>
                        <p className="text-center text-slate-500 dark:text-slate-400 text-sm font-bold mt-4 leading-relaxed hidden md:block">
                            오늘의 감정들을 솥에 담아보세요.<br />
                            조합에 따라 나만의 색상이 만들어집니다. ✨
                        </p>
                    </div>

                    <div className="flex flex-col gap-8 bg-white/50 dark:bg-slate-900/50 p-8 rounded-[3rem] border border-white dark:border-slate-800 shadow-sm">
                        <div className="grid grid-cols-5 gap-4">
                            {MOODS.map(mood => (
                                <button
                                    key={mood.id}
                                    onClick={() => addSpoon(mood.id)}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white dark:bg-slate-800 shadow-soft flex items-center justify-center text-3xl group-active:scale-90 transition-all hover:-translate-y-1 border-2 border-transparent hover:border-haru-sky-accent">
                                        {mood.emoji}
                                    </div>
                                    <span className="text-[11px] font-black text-slate-400 tracking-tighter">{mood.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4 w-full">
                            <button
                                onClick={resetPot}
                                className="flex-1 py-5 rounded-2xl bg-white dark:bg-slate-800 text-slate-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm border border-slate-100 dark:border-slate-700"
                            >
                                <RotateCcw size={18} /> 초기화
                            </button>
                            <button
                                onClick={handleMix}
                                className="flex-[2] py-5 rounded-2xl bg-slate-900 text-white font-black text-base flex items-center justify-center gap-2 shadow-2xl hover:bg-black hover:-translate-y-1 active:scale-95 transition-all"
                            >
                                색 조합하기 <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Result */}
            {step === 2 && (
                <div className="w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 fade-in duration-700">
                    <div className="w-full aspect-[3/4] p-8 rounded-[3rem] shadow-2xl flex flex-col transition-all duration-1000 overflow-hidden relative mb-12" style={{ backgroundColor: mixedColor }}>
                        {/* Overlay to make text readable if color is too light */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/10"></div>

                        <div className="flex-1 flex flex-col justify-center items-center gap-6 relative z-10">
                            <div className="w-24 h-24 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-5xl animate-bounce shadow-inner">✨</div>
                            <h2 className="text-4xl font-black text-white drop-shadow-2xl text-center leading-tight tracking-tighter">
                                {colorName}
                            </h2>
                        </div>

                        <div className="bg-white/95 backdrop-blur-sm p-8 rounded-[2rem] flex justify-between items-end relative z-10 shadow-xl border border-white">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">HaruLog Mood Palette</p>
                                <p className="text-xl font-mono font-black text-slate-800 tracking-tighter">{mixedColor.toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] font-black text-slate-500 mb-1">{selectedDate}</p>
                                <p className="text-[10px] font-black text-haru-sky-deep tracking-wider">© 2026 HARULOG</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-slate-500 text-sm font-bold mb-12 animate-pulse tracking-tight">
                        이 예쁜 색상 위에 오늘의 이야기를 담아볼까요?
                    </p>

                    <button
                        onClick={() => setStep(3)}
                        className="w-full py-6 rounded-3xl bg-slate-950 text-white font-black text-xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        기록 이어가기 <ArrowRight size={24} />
                    </button>
                    <button onClick={() => setStep(1)} className="mt-8 text-slate-400 text-xs font-black hover:text-slate-600 transition-colors border-b border-transparent hover:border-slate-300 pb-1">
                        다시 만들고 싶어요
                    </button>
                </div>
            )}

            {/* Step 3: Writing */}
            {step === 3 && (
                <div className="w-full max-w-5xl flex-1 flex flex-col md:grid md:grid-cols-[280px,1fr] gap-4 md:gap-8 animate-in slide-in-from-right-8 fade-in duration-500 overflow-hidden">
                    {/* 색상 블록: 모바일=상단 compact bar, 데스크탑=왼쪽 sticky */}
                    <div className="shrink-0 md:overflow-y-auto md:pb-8">
                        {/* Compact Mood Preview */}
                        <div className="flex items-center gap-4 p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 shadow-soft">
                            <div className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl shadow-lg shrink-0" style={{ backgroundColor: mixedColor }}></div>
                            <div className="flex-1 flex flex-col gap-0.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Mood Color</p>
                                <h3 className="text-base md:text-xl font-black text-foreground leading-tight tracking-tight">{colorName}</h3>
                                <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-[11px] font-black text-haru-sky-deep hover:underline">
                                    <RotateCcw size={12} /> 색상 다시보기
                                </button>
                            </div>
                        </div>
                        <div className="hidden md:block p-2 text-center opacity-30 mt-4">
                            <span className="text-4xl">✒️</span>
                        </div>
                    </div>

                    {/* 오른쪽: 날짜+카테고리+제목+내용 — 이 영역만 스크롤 */}
                    <div className="flex-1 overflow-y-auto pb-8 flex flex-col gap-5">
                        {/* Date + Category (스크롤과 함께 이동) */}
                        <div className="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1 mb-2 block opacity-70">Date</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full p-4 bg-white dark:bg-slate-800 dark:text-slate-200 rounded-2xl border-none shadow-sm focus:ring-4 focus:ring-haru-sky-accent/20 outline-none font-black text-lg"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] opacity-70">Category</label>
                                    <button
                                        onClick={() => setShowCategoryManager(!showCategoryManager)}
                                        className="text-[10px] font-black text-haru-sky-deep bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-haru-sky-accent/30 shadow-sm"
                                    >
                                        {showCategoryManager ? "닫기" : "관리"}
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedCategoryId}
                                        onChange={(e) => setSelectedCategoryId(Number(e.target.value) || "")}
                                        className="flex-1 p-4 bg-white dark:bg-slate-800 dark:text-slate-200 rounded-2xl border-none shadow-sm focus:ring-4 focus:ring-haru-sky-accent/20 outline-none font-bold text-sm appearance-none"
                                    >
                                        <option value="">카테고리 없음</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {showCategoryManager && (
                                    <div className="mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-haru-sky-accent/20 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="새 카테고리 이름"
                                                className="flex-1 p-2 bg-slate-50 dark:bg-slate-900 dark:text-slate-200 rounded-xl text-xs outline-none border border-slate-100 dark:border-slate-700"
                                            />
                                            <button
                                                onClick={handleAddCategory}
                                                className="p-2 bg-haru-sky-deep text-white rounded-xl active:scale-95 transition-all"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(cat => (
                                                <div key={cat.id} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full group">
                                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{cat.name}</span>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                        className="text-slate-400 hover:text-rose-500"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Title Suggestions */}
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] opacity-70">Title</label>
                                <button
                                    onClick={handleSuggestTitle}
                                    disabled={isSuggestingTitle || !content.trim()}
                                    className="text-[11px] font-black text-white bg-slate-900 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-black transition-all disabled:opacity-30 shadow-md active:scale-95"
                                >
                                    <Sparkles size={14} className="animate-pulse" /> AI 제목 추천
                                </button>
                            </div>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="오늘의 기록에 이름을 붙여주세요"
                                className="w-full p-6 bg-white dark:bg-slate-900 dark:text-slate-100 rounded-[2rem] border-2 border-slate-50 dark:border-slate-800 focus:border-haru-sky-accent outline-none text-2xl font-black shadow-soft tracking-tight"
                            />
                            {suggestedTitles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {suggestedTitles.map((t, i) => (
                                        <button key={i} onClick={() => { setTitle(t); setSuggestedTitles([]); }} className="text-left py-2.5 px-5 bg-white dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-haru-sky-deep dark:hover:text-haru-sky-accent hover:border-haru-sky-accent border-2 border-slate-50 dark:border-slate-700 transition-all shadow-sm">
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-col gap-3 relative">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] opacity-70">Diary Content</label>
                                <span className="text-[10px] font-black text-slate-300 tracking-tighter uppercase">{content.length} characters</span>
                            </div>
                            <div className="relative group">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="무슨 일이 있었나요? 마음속 이야기를 편하게 들려주세요."
                                    rows={10}
                                    className="w-full p-8 bg-white dark:bg-slate-900 dark:text-slate-100 rounded-[3rem] border-2 border-slate-50 dark:border-slate-800 focus:border-haru-sky-accent outline-none resize-none leading-relaxed text-lg font-medium shadow-soft"
                                />
                                {interimText && (
                                    <div className="absolute top-8 left-8 right-24 p-4 bg-haru-sky-accent/90 backdrop-blur-md rounded-2xl border border-white shadow-xl text-sm font-black text-haru-sky-deep animate-in zoom-in-95 duration-200">
                                        {interimText}<span className="animate-pulse">...</span>
                                    </div>
                                )}
                                <button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`absolute bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all z-20 ${isRecording ? 'bg-rose-500 animate-pulse scale-110' : 'bg-slate-900 hover:bg-black hover:scale-105'} text-white`}
                                    title={isRecording ? "녹음 중지" : "음성으로 기록하기"}
                                >
                                    {isRecording ? <div className="w-5 h-5 bg-white rounded-sm" /> : <Mic size={28} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || isRecording}
                            className="w-full py-6 rounded-[2.5rem] bg-haru-sky-deep text-white font-black text-xl shadow-[0_25px_50px_-12px_rgba(59,130,246,0.3)] hover:shadow-[0_30px_60px_-12px_rgba(59,130,246,0.5)] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                        >
                            {isSubmitting ? "소중한 기록을 우주로 보내는 중..." : <><Save size={24} /> 오늘의 색 고이 저장하기</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DiaryWrite() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-slate-400 font-bold animate-pulse">Loading... ✨</div>}>
            <DiaryWriteInner />
        </Suspense>
    );
}
