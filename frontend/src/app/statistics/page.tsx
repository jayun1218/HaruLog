"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stats {
    emotion_distribution: Record<string, number>;
    total_count: number;
    recent_positive_points: string[][];
}

export default function Statistics() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`${API}/api/statistics`)
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch statistics:", err);
                setIsLoading(false);
            });
    }, []);

    return (
        <div className="flex flex-col p-6 min-h-[100dvh] max-w-md mx-auto bg-white">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-foreground text-xl">←</Link>
                <h1 className="text-2xl font-bold">내 마음 통계</h1>
            </header>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">데이터를 분석하고 있어요... 📊</div>
            ) : !stats || stats.total_count === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <span className="text-6xl opacity-20">📊</span>
                    <p className="text-slate-500 font-medium">아직 분석할 데이터가 부족해요.<br />일기를 더 써주시면 통계를 보여드릴게요!</p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    <section className="flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-slate-700">이번 달 내 마음의 색깔 🎨</h2>
                        <div className="bg-slate-50 p-6 rounded-3xl flex flex-col gap-4">
                            {Object.entries(stats.emotion_distribution).map(([emotion, score]) => (
                                <div key={emotion} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>{emotion}</span>
                                        <span>{Math.round(score * 100)}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-haru-sky-deep rounded-full transition-all duration-1000" style={{ width: `${score * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-slate-700">칭찬해! 내가 잘한 일들 🌟</h2>
                        <div className="grid grid-cols-1 gap-3">
                            {stats.recent_positive_points.flat().slice(0, 6).map((point, i) => (
                                <div key={i} className="bg-haru-sky-light p-4 rounded-2xl border border-haru-sky-accent/30 text-sm font-medium text-slate-600">
                                    👍 {point}
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="bg-slate-900 p-6 rounded-3xl text-white">
                        <p className="text-xs opacity-60 mb-1">AI의 한마디</p>
                        <p className="text-sm font-medium leading-relaxed">
                            최근 {Object.keys(stats.emotion_distribution)[0] || "다양한"} 감정을 많이 느끼셨네요.
                            스스로를 다독여주는 시간이 더 필요할 것 같아요. 잘하고 계십니다! ☁️
                        </p>
                    </div>
                </div>
            )}

            <footer className="mt-12 text-center text-slate-300 text-xs">통계는 마음을 비추는 거울이에요</footer>
        </div>
    );
}
