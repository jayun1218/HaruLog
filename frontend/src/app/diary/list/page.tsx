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

export default function DiaryList() {
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        fetch(`${API}/api/diaries`)
            .then(res => res.json())
            .then(data => {
                setDiaries(Array.isArray(data) ? data : []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch diaries:", err);
                setIsLoading(false);
            });
    }, []);

    const toggleExpand = (id: number) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <div className="flex flex-col p-6 min-h-[100dvh] max-w-md mx-auto bg-slate-50">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-foreground text-xl">←</Link>
                <h1 className="text-2xl font-bold">기록 모아보기</h1>
            </header>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">소중한 기록들을 불러오고 있어요...</div>
            ) : diaries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <span className="text-6xl opacity-20">📂</span>
                    <p className="text-slate-500 font-medium">아직 기록된 하루가 없어요.<br />첫 일기를 써보시겠어요?</p>
                    <Link href="/diary/write" className="mt-2 text-haru-sky-deep font-bold border-b-2 border-haru-sky-deep pb-1">일기 쓰러 가기</Link>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {diaries.map((diary) => {
                        const isExpanded = expandedId === diary.id;
                        return (
                            <div
                                key={diary.id}
                                className="bg-white rounded-3xl shadow-soft overflow-hidden transition-all duration-300"
                            >
                                {/* 항상 보이는 헤더 영역 - 클릭 시 펼치기/접기 */}
                                <button
                                    onClick={() => toggleExpand(diary.id)}
                                    className="w-full p-6 text-left flex flex-col gap-2"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-0.5">
                                            <h2 className="text-lg font-bold text-foreground">{diary.title}</h2>
                                            {diary.category && (
                                                <span className="text-xs font-medium text-haru-sky-deep bg-haru-sky-light px-2 py-0.5 rounded-full w-fit">
                                                    📁 {diary.category.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                                            <span className="text-[10px] text-slate-300 font-medium">{new Date(diary.created_at).toLocaleDateString()}</span>
                                            <span className="text-slate-300 text-xs">{isExpanded ? "▲" : "▼"}</span>
                                        </div>
                                    </div>

                                    {/* AI 요약 */}
                                    {diary.analysis?.summary && (
                                        <p className="text-sm text-slate-500 leading-relaxed bg-haru-sky-light p-3 rounded-xl border border-haru-sky-accent/30">
                                            ✨ {diary.analysis.summary}
                                        </p>
                                    )}

                                    {/* 감정 태그 */}
                                    {diary.analysis?.emotions && (
                                        <div className="flex gap-2 flex-wrap">
                                            {Object.entries(diary.analysis.emotions).map(([emotion, score]) => (
                                                score > 0.3 && <span key={emotion} className="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-500">#{emotion}</span>
                                            ))}
                                        </div>
                                    )}
                                </button>

                                {/* 펼쳐질 때만 보이는 전체 내용 */}
                                {isExpanded && (
                                    <div className="px-6 pb-6 flex flex-col gap-4 border-t border-slate-100">
                                        <div className="pt-4">
                                            <p className="text-sm font-semibold text-slate-400 mb-2">📝 일기 전문</p>
                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl">
                                                {diary.content}
                                            </p>
                                        </div>

                                        {diary.analysis?.positive_points && diary.analysis.positive_points.length > 0 && (
                                            <div>
                                                <p className="text-sm font-semibold text-slate-400 mb-2">🌟 오늘 잘한 일</p>
                                                <div className="flex flex-col gap-2">
                                                    {diary.analysis.positive_points.map((point, i) => (
                                                        <div key={i} className="text-sm text-slate-600 bg-haru-sky-light px-3 py-2 rounded-xl border border-haru-sky-accent/20">
                                                            👍 {point}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {diary.analysis?.improvement_points && (
                                            <div>
                                                <p className="text-sm font-semibold text-slate-400 mb-2">💡 개선 포인트</p>
                                                <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">{diary.analysis.improvement_points}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <footer className="mt-12 text-center text-slate-300 text-xs">차곡차곡 쌓인 너의 소중한 시간들</footer>
        </div>
    );
}
