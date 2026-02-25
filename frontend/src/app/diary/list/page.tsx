"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Category {
    id: number;
    name: string;
}

interface Diary {
    id: number;
    title: string;
    content: string;
    created_at: string;
    category?: Category;
    analysis?: {
        summary: string;
        emotions: Record<string, number>;
        positive_points?: string[];
        improvement_points?: string;
    };
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 감정 중 가장 높은 감정의 이모지 반환
function getTopEmotionEmoji(emotions?: Record<string, number>): string {
    if (!emotions) return "📔";
    const map: Record<string, string> = {
        "기쁨": "😊", "슬픔": "😢", "불안": "😰", "분노": "😤", "평온": "😌",
        "joy": "😊", "sadness": "😢", "anxiety": "😰", "anger": "😤", "calm": "😌",
    };
    const top = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0];
    return top ? (map[top[0]] || "💙") : "📔";
}

export default function DiaryList() {
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API}/api/diaries`)
            .then(res => res.json())
            .then(data => {
                setDiaries(Array.isArray(data) ? data : []);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, []);

    // 날짜별 일기 맵 생성
    const diaryMap: Record<string, Diary[]> = {};
    diaries.forEach(diary => {
        const dateKey = diary.created_at.slice(0, 10); // YYYY-MM-DD
        if (!diaryMap[dateKey]) diaryMap[dateKey] = [];
        diaryMap[dateKey].push(diary);
    });

    // 달력 계산
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const todayKey = new Date().toISOString().slice(0, 10);

    const selectedDiaries = selectedDate ? (diaryMap[selectedDate] || []) : [];

    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <div className="flex flex-col p-5 min-h-[100dvh] max-w-md mx-auto bg-slate-50">
            <header className="flex items-center gap-4 mb-6">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-foreground text-xl">←</Link>
                <h1 className="text-2xl font-bold">기록 모아보기</h1>
            </header>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">소중한 기록들을 불러오고 있어요...</div>
            ) : (
                <>
                    {/* 달력 */}
                    <div className="bg-white rounded-3xl shadow-soft p-5 mb-4">
                        {/* 월 네비게이션 */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-haru-sky-light flex items-center justify-center text-slate-500 transition-colors">
                                ‹
                            </button>
                            <h2 className="text-lg font-bold text-foreground">
                                {year}년 {month + 1}월
                            </h2>
                            <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-haru-sky-light flex items-center justify-center text-slate-500 transition-colors">
                                ›
                            </button>
                        </div>

                        {/* 요일 헤더 */}
                        <div className="grid grid-cols-7 mb-2">
                            {WEEKDAYS.map((d, i) => (
                                <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* 날짜 그리드 */}
                        <div className="grid grid-cols-7 gap-y-1">
                            {/* 빈 칸 (달 시작 전) */}
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}

                            {/* 날짜 셀 */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                const hasDiary = !!diaryMap[dateKey];
                                const isToday = dateKey === todayKey;
                                const isSelected = dateKey === selectedDate;
                                const topDiaryEmoji = hasDiary ? getTopEmotionEmoji(diaryMap[dateKey][0]?.analysis?.emotions) : null;

                                return (
                                    <button
                                        key={day}
                                        onClick={() => {
                                            setSelectedDate(isSelected ? null : dateKey);
                                            setExpandedId(null);
                                        }}
                                        className={`flex flex-col items-center justify-start py-1.5 rounded-2xl transition-all ${isSelected
                                                ? "bg-haru-sky-accent scale-105 shadow-soft"
                                                : isToday
                                                    ? "bg-haru-sky-light"
                                                    : hasDiary
                                                        ? "hover:bg-haru-sky-light"
                                                        : "hover:bg-slate-50"
                                            }`}
                                    >
                                        <span className={`text-sm font-semibold leading-tight ${isToday ? "text-haru-sky-deep" : "text-slate-700"
                                            }`}>
                                            {day}
                                        </span>
                                        {topDiaryEmoji ? (
                                            <span className="text-base leading-none mt-0.5">{topDiaryEmoji}</span>
                                        ) : (
                                            <span className="h-5 mt-0.5" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 이 달의 기록 수 */}
                    <div className="text-xs text-slate-400 text-center mb-4 font-medium">
                        {month + 1}월에 <span className="text-haru-sky-deep font-bold">{
                            Object.keys(diaryMap).filter(k => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length
                        }개</span>의 기록이 있어요
                    </div>

                    {/* 선택된 날짜의 일기 목록 */}
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
                            ) : (
                                selectedDiaries.map(diary => {
                                    const isExpanded = expandedId === diary.id;
                                    return (
                                        <div key={diary.id} className="bg-white rounded-3xl shadow-soft overflow-hidden">
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : diary.id)}
                                                className="w-full p-5 text-left flex flex-col gap-2"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col gap-0.5">
                                                        <h2 className="text-base font-bold text-foreground">{diary.title}</h2>
                                                        {diary.category && (
                                                            <span className="text-xs text-haru-sky-deep bg-haru-sky-light px-2 py-0.5 rounded-full w-fit">
                                                                📁 {diary.category.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-slate-300 text-xs mt-1">{isExpanded ? "▲" : "▼"}</span>
                                                </div>

                                                {diary.analysis?.summary && (
                                                    <p className="text-sm text-slate-500 bg-haru-sky-light p-3 rounded-xl border border-haru-sky-accent/30">
                                                        ✨ {diary.analysis.summary}
                                                    </p>
                                                )}

                                                <div className="flex gap-2 flex-wrap">
                                                    {diary.analysis?.emotions && Object.entries(diary.analysis.emotions).map(([emotion, score]) => (
                                                        score > 0.3 && <span key={emotion} className="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-500">#{emotion}</span>
                                                    ))}
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="px-5 pb-5 flex flex-col gap-4 border-t border-slate-100">
                                                    <div className="pt-4">
                                                        <p className="text-xs font-semibold text-slate-400 mb-2">📝 일기 전문</p>
                                                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl">{diary.content}</p>
                                                    </div>
                                                    {diary.analysis?.positive_points && diary.analysis.positive_points.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-400 mb-2">🌟 오늘 잘한 일</p>
                                                            <div className="flex flex-col gap-2">
                                                                {diary.analysis.positive_points.map((point, i) => (
                                                                    <div key={i} className="text-sm text-slate-600 bg-haru-sky-light px-3 py-2 rounded-xl">👍 {point}</div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {diary.analysis?.improvement_points && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-400 mb-2">💡 개선 포인트</p>
                                                            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">{diary.analysis.improvement_points}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* 기록이 아예 없을 때 */}
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
