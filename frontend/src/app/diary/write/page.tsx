"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/Toast";
import { Sparkles, ArrowRight, RotateCcw, Mic, Save, X, Plus } from "lucide-react";

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

    const recognitionRef = useRef<any>(null);

    // --- Effects ---
    useEffect(() => {
        fetch(`${API}/api/categories`)
            .then(res => res.json())
            .then(data => setCategories(Array.isArray(data) ? data : []));
    }, []);

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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            setSuggestedTitles(data.titles || []);
        } finally {
            setIsSuggestingTitle(false);
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
                headers: { "Content-Type": "application/json" },
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
        <div className="min-h-[100dvh] transition-colors duration-700 bg-white dark:bg-slate-950 flex flex-col items-center p-6 pb-12">

            {/* Header */}
            <header className="w-full max-w-md flex justify-between items-center mb-12">
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
                <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="relative mb-12 group">
                        {/* The Pot (Visual Representation) */}
                        <div
                            className="w-48 h-48 rounded-[3.5rem] shadow-2xl transition-all duration-700 relative overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-900 border-4 border-white dark:border-slate-800"
                            style={{ boxShadow: `0 20px 40px -10px ${mixedColor}40` }}
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
                            <div className="relative z-10 text-4xl transform group-hover:scale-110 transition-transform duration-500 select-none">🍯</div>
                        </div>

                        {/* Streak-like indicator */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <div className="flex gap-1">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className={`w-1.5 h-3 rounded-full transition-colors ${i < totalSpoons ? 'bg-haru-sky-accent' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{totalSpoons}/10</span>
                        </div>
                    </div>

                    <p className="text-center text-slate-500 dark:text-slate-400 text-sm font-medium mb-12 px-8 leading-relaxed">
                        오늘 하루 느꼈던 감정들을<br />
                        스푼으로 솥에 담아 자유롭게 섞어보세요.
                    </p>

                    <div className="grid grid-cols-5 gap-3 w-full mb-12">
                        {MOODS.map(mood => (
                            <button
                                key={mood.id}
                                onClick={() => addSpoon(mood.id)}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 shadow-soft flex items-center justify-center text-2xl group-active:scale-90 transition-all hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                    {mood.emoji}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">{mood.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={resetPot}
                            className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                        >
                            <RotateCcw size={16} /> 다시 담기
                        </button>
                        <button
                            onClick={handleMix}
                            className="flex-[2] py-4 rounded-2xl bg-haru-sky-deep text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            조합하기 <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Result */}
            {step === 2 && (
                <div className="w-full max-w-md flex flex-col items-center animate-in zoom-in-95 fade-in duration-700">
                    <div className="w-full aspect-[3/4] p-8 rounded-[2.5rem] shadow-2xl flex flex-col transition-all duration-1000 overflow-hidden relative mb-12" style={{ backgroundColor: mixedColor }}>
                        {/* Overlay to make text readable if color is too light */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/10"></div>

                        <div className="flex-1 flex flex-col justify-center items-center gap-4 relative z-10">
                            <div className="w-20 h-20 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-4xl animate-bounce">✨</div>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg text-center leading-tight">
                                {colorName}
                            </h2>
                        </div>

                        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl flex justify-between items-end relative z-10 shadow-lg">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">HaruLog Mood Palette</p>
                                <p className="text-lg font-mono font-bold text-slate-800">{mixedColor.toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 mb-1">{selectedDate}</p>
                                <p className="text-xs font-black text-haru-sky-deep">© 2026 HARULOG</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-slate-500 text-sm font-medium mb-12 animate-pulse">
                        이 예쁜 색상 위에 기록을 남겨볼까요?
                    </p>

                    <button
                        onClick={() => setStep(3)}
                        className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                    >
                        기록 이어가기 <ArrowRight size={20} />
                    </button>
                    <button onClick={() => setStep(1)} className="mt-6 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors underline underline-offset-4">
                        다시 만들고 싶어요
                    </button>
                </div>
            )}

            {/* Step 3: Writing */}
            {step === 3 && (
                <div className="w-full max-w-md flex flex-col gap-8 animate-in slide-in-from-right-8 fade-in duration-500">
                    {/* Compact Mood Preview */}
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="w-12 h-12 rounded-xl" style={{ backgroundColor: mixedColor }}></div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Today&apos;s Mood Color</p>
                            <h3 className="text-sm font-bold text-foreground">{colorName}</h3>
                        </div>
                        <button onClick={() => setStep(2)} className="p-2 text-slate-300 hover:text-slate-500"><RotateCcw size={16} /></button>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* Date */}
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 dark:text-slate-200 rounded-2xl border-none focus:ring-2 focus:ring-haru-sky-accent outline-none font-bold"
                            />
                        </div>

                        {/* Title Suggestions */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Title</label>
                                <button
                                    onClick={handleSuggestTitle}
                                    disabled={isSuggestingTitle || !content.trim()}
                                    className="text-[10px] font-bold text-haru-sky-deep bg-haru-sky-accent/20 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-haru-sky-accent transition-all disabled:opacity-30"
                                >
                                    <Sparkles size={12} /> AI 추천
                                </button>
                            </div>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="오늘에게 이름을 붙여준다면?"
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 dark:text-slate-200 rounded-2xl border-none focus:ring-2 focus:ring-haru-sky-accent outline-none text-lg font-bold"
                            />
                            {suggestedTitles.length > 0 && (
                                <div className="flex flex-col gap-2 mt-2">
                                    {suggestedTitles.map((t, i) => (
                                        <button key={i} onClick={() => { setTitle(t); setSuggestedTitles([]); }} className="text-left p-3 bg-haru-sky-light dark:bg-haru-sky-deep/20 rounded-xl text-xs font-bold text-haru-sky-deep dark:text-haru-sky-accent hover:bg-haru-sky-medium transition-colors border border-haru-sky-accent/20">
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-col gap-2 relative">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Diary</label>
                                <span className="text-[10px] font-mono text-slate-300">{content.length} characters</span>
                            </div>
                            <div className="relative">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="무슨 일이 있었나요? 마음속 이야기를 편하게 들려주세요."
                                    rows={12}
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-900 dark:text-slate-200 rounded-[2rem] border-none focus:ring-2 focus:ring-haru-sky-accent outline-none resize-none leading-relaxed text-sm font-medium"
                                />
                                {interimText && (
                                    <div className="absolute bottom-6 left-6 right-16 p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-haru-sky-accent/30 text-xs italic text-slate-400 animate-pulse">
                                        {interimText}...
                                    </div>
                                )}
                                <button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`absolute bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${isRecording ? 'bg-rose-500 animate-pulse scale-110' : 'bg-slate-900 hover:bg-black'} text-white`}
                                >
                                    {isRecording ? <div className="w-4 h-4 bg-white rounded-sm" /> : <Mic size={24} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || isRecording}
                            className="w-full py-5 rounded-[2rem] bg-haru-sky-deep text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? "소중한 기록을 저장하는 중..." : <><Save size={20} /> 하루 저장하기</>}
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
