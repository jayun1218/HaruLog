"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EMOTION_COLORS: Record<string, string> = {
    "기쁨": "#7dd3fc", "슬픔": "#93c5fd", "불안": "#fbbf24",
    "분노": "#f87171", "평온": "#86efac",
    "joy": "#7dd3fc", "sadness": "#93c5fd", "anxiety": "#fbbf24",
    "anger": "#f87171", "calm": "#86efac",
};

interface Stats {
    emotion_distribution: Record<string, number>;
    total_count: number;
    recent_positive_points: string[][];
    emotion_trend?: { date: string; emotions: Record<string, number> }[];
}

// 순수 SVG 선 그래프
function EmotionLineChart({ trend, emotions }: {
    trend: { date: string; emotions: Record<string, number> }[];
    emotions: string[];
}) {
    if (trend.length < 2) return null;
    const W = 320, H = 120, PX = 20, PY = 10;
    const innerW = W - PX * 2, innerH = H - PY * 2;
    const xStep = innerW / (trend.length - 1);

    const toPath = (emotion: string) => {
        const pts = trend.map((t, i) => {
            const v = t.emotions[emotion] ?? 0;
            const x = PX + i * xStep;
            const y = PY + innerH - v * innerH;
            return `${x},${y}`;
        });
        return `M ${pts.join(" L ")}`;
    };

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            {/* 가로 격자 */}
            {[0, 0.5, 1].map(v => (
                <line key={v} x1={PX} x2={W - PX}
                    y1={PY + innerH - v * innerH} y2={PY + innerH - v * innerH}
                    stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
            ))}
            {/* 선 */}
            {emotions.slice(0, 3).map(em => (
                <path key={em} d={toPath(em)} fill="none"
                    stroke={EMOTION_COLORS[em] || "#7dd3fc"} strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {/* X축 날짜 라벨 */}
            {trend.map((t, i) => (
                (i === 0 || i === trend.length - 1 || i === Math.floor(trend.length / 2)) && (
                    <text key={i} x={PX + i * xStep} y={H - 1}
                        textAnchor="middle" fontSize="8" fill="#94a3b8">
                        {t.date.slice(5)}
                    </text>
                )
            ))}
        </svg>
    );
}

export default function Statistics() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [diaries, setDiaries] = useState<{ created_at: string; analysis?: { emotions: Record<string, number> } }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch(`${API}/api/statistics`).then(r => r.json()),
            fetch(`${API}/api/diaries`).then(r => r.json()),
        ]).then(([statsData, diaryData]) => {
            setStats(statsData);
            if (Array.isArray(diaryData)) setDiaries(diaryData);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    // 날짜별 감정 평균 계산
    const trend = (() => {
        const map: Record<string, { emotions: Record<string, number[]> }> = {};
        diaries.forEach(d => {
            if (!d.analysis?.emotions) return;
            const date = d.created_at.slice(0, 10);
            if (!map[date]) map[date] = { emotions: {} };
            Object.entries(d.analysis.emotions).forEach(([em, v]) => {
                if (!map[date].emotions[em]) map[date].emotions[em] = [];
                map[date].emotions[em].push(v);
            });
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-14)
            .map(([date, { emotions }]) => ({
                date,
                emotions: Object.fromEntries(
                    Object.entries(emotions).map(([em, vals]) => [em, vals.reduce((a, b) => a + b, 0) / vals.length])
                ),
            }));
    })();

    const topEmotions = stats ? Object.keys(stats.emotion_distribution).slice(0, 3) : [];

    return (
        <div className="flex flex-col p-6 min-h-[100dvh] max-w-md mx-auto bg-background transition-colors">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-foreground text-xl">←</Link>
                <h1 className="text-2xl font-bold text-foreground">내 마음 통계</h1>
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
                    {/* 감정 흐름 그래프 */}
                    {trend.length >= 2 && (
                        <section className="flex flex-col gap-3">
                            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">감정 흐름 그래프 📈</h2>
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl">
                                <EmotionLineChart trend={trend} emotions={topEmotions} />
                                {/* 범례 */}
                                <div className="flex gap-3 flex-wrap mt-2 justify-center">
                                    {topEmotions.map(em => (
                                        <div key={em} className="flex items-center gap-1 text-xs text-slate-500">
                                            <span className="w-3 h-3 rounded-full inline-block" style={{ background: EMOTION_COLORS[em] || "#7dd3fc" }} />
                                            {em}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 이번 달 감정 분포 */}
                    <section className="flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">이번 달 내 마음의 색깔 🎨</h2>
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl flex flex-col gap-4">
                            {Object.entries(stats.emotion_distribution).map(([emotion, score]) => (
                                <div key={emotion} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <span>{emotion}</span>
                                        <span>{Math.round(score * 100)}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${score * 100}%`, background: EMOTION_COLORS[emotion] || "#7dd3fc" }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 잘한 일 */}
                    <section className="flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">칭찬해! 내가 잘한 일들 🌟</h2>
                        <div className="grid grid-cols-1 gap-3">
                            {stats.recent_positive_points.flat().slice(0, 6).map((point, i) => (
                                <div key={i} className="bg-haru-sky-light p-4 rounded-2xl border border-haru-sky-accent/30 text-sm font-medium text-slate-600 dark:text-slate-300">
                                    👍 {point}
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="bg-slate-900 dark:bg-slate-700 p-6 rounded-3xl text-white">
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
