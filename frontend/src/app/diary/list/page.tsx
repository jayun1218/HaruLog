"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Diary {
    id: number;
    title: string;
    content: string;
    created_at: string;
    analysis?: {
        summary: string;
        emotions: Record<string, number>;
    };
}

export default function DiaryList() {
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                    {diaries.map((diary) => (
                        <div key={diary.id} className="bg-white p-6 rounded-3xl shadow-soft flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <h2 className="text-lg font-bold text-foreground">{diary.title}</h2>
                                <span className="text-[10px] text-slate-300 font-medium">{new Date(diary.created_at).toLocaleDateString()}</span>
                            </div>
                            {diary.analysis?.summary ? (
                                <p className="text-sm text-slate-500 leading-relaxed bg-haru-sky-light p-3 rounded-xl border border-haru-sky-accent/30">✨ {diary.analysis.summary}</p>
                            ) : (
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {diary.content.length > 80 ? diary.content.slice(0, 80) + "..." : diary.content}
                                </p>
                            )}
                            <div className="flex gap-2 flex-wrap">
                                {diary.analysis?.emotions && Object.entries(diary.analysis.emotions).map(([emotion, score]) => (
                                    score > 0.3 && <span key={emotion} className="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-500">#{emotion}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <footer className="mt-12 text-center text-slate-300 text-xs">차곡차곡 쌓인 너의 소중한 시간들</footer>
        </div>
    );
}
