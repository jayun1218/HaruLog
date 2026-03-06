"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { useBackendToken } from "@/components/AuthProvider";
import { ArrowLeft, BarChart3, TrendingUp, Sparkles, Award } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EMOTION_COLORS: Record<string, string> = {
    "기쁨": "#FCD34D", "슬픔": "#60A5FA", "불안": "#F472B6",
    "분노": "#FB7185", "평온": "#34D399",
    "joy": "#FCD34D", "sadness": "#60A5FA", "anxiety": "#F472B6",
    "anger": "#FB7185", "calm": "#34D399",
};

interface Stats {
    emotion_distribution: Record<string, number>;
    total_count: number;
    recent_positive_points: string[][];
    emotion_trend?: { date: string; emotions: Record<string, number> }[];
}

export default function Statistics() {
    const { backendToken, isLoading: tokenLoading } = useBackendToken();
    const [stats, setStats] = useState<Stats | null>(null);
    const [diaries, setDiaries] = useState<{ created_at: string; analysis?: { emotions: Record<string, number> } }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (tokenLoading) return;

        if (!backendToken) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const headers = { "Authorization": `Bearer ${backendToken}` };

                const [statsRes, diaryRes] = await Promise.all([
                    fetch(`${API}/api/statistics`, { headers }),
                    fetch(`${API}/api/diaries`, { headers }),
                ]);

                if (!statsRes.ok || !diaryRes.ok) {
                    const statsErr = await statsRes.text();
                    console.error("Stats fetch failed:", statsRes.status, statsErr);
                    throw new Error("Failed to fetch statistics");
                }

                const statsData = await statsRes.json();
                const diaryData = await diaryRes.json();

                setStats(statsData);
                if (Array.isArray(diaryData)) setDiaries(diaryData);
            } catch (error) {
                console.error("Fetch stats error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [backendToken, tokenLoading]);

    const trendData = useMemo(() => {
        const map: Record<string, { emotions: Record<string, number[]> }> = {};
        diaries.forEach((d: any) => {
            if (!d.analysis?.emotions) return;
            const date = d.created_at.slice(5, 10); // MM-DD
            if (!map[date]) map[date] = { emotions: {} };
            Object.entries(d.analysis.emotions || {}).forEach(([em, v]: [string, any]) => {
                if (!map[date].emotions[em]) map[date].emotions[em] = [];
                map[date].emotions[em].push(v);
            });
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-7) // 최근 7일
            .map(([date, { emotions }]) => ({
                name: date,
                ...Object.fromEntries(
                    Object.entries(emotions).map(([em, vals]) => [em, (vals.reduce((a, b) => a + b, 0) / vals.length) * 100])
                ),
            }));
    }, [diaries]);

    const pieData = useMemo(() => {
        if (!stats?.emotion_distribution || Object.keys(stats.emotion_distribution).length === 0) return [];
        const emotionMap: Record<string, string> = {
            "joy": "기쁨", "happiness": "기쁨",
            "sadness": "슬픔", "sad": "슬픔",
            "anxiety": "불안", "fear": "불안",
            "anger": "분노", "angry": "분노",
            "calm": "평온", "neutral": "평온"
        };
        return Object.entries(stats.emotion_distribution).map(([name, value]) => ({
            name: emotionMap[name.toLowerCase()] || name,
            value: Math.round(value * 100)
        })).sort((a, b) => b.value - a.value);
    }, [stats]);

    return (
        <div className="flex flex-col px-6 pt-14 pb-12 min-h-[100dvh] max-w-md mx-auto transition-colors">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-soft flex items-center justify-center text-slate-400 hover:text-foreground transition-all">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">내 마음 통계</h1>
            </header>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-haru-sky-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium animate-pulse">데이터를 분석하고 있어요... 📊</p>
                </div>
            ) : !stats || stats.total_count === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
                    <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-[3rem] flex items-center justify-center text-6xl shadow-inner">📊</div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-lg mb-1">아직 분석할 데이터가 부족해요</p>
                        <p className="text-slate-400 text-sm">일기를 더 써주시면 멋진 통계를 보여드릴게요!</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* 감정 흐름 차트 */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-soft border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-500">
                                <TrendingUp size={18} />
                            </div>
                            <h2 className="font-bold text-slate-800 dark:text-slate-100">최근 감정 변화</h2>
                        </div>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        {Object.keys(EMOTION_COLORS).map(em => (
                                            <linearGradient key={em} id={`color${em}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={EMOTION_COLORS[em]} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={EMOTION_COLORS[em]} stopOpacity={0} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#888' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    {Object.keys(EMOTION_COLORS).slice(0, 5).map(em => (
                                        <Area key={em} type="monotone" dataKey={em} stroke={EMOTION_COLORS[em]} fillOpacity={1} fill={`url(#color${em})`} strokeWidth={3} />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* 감정 분포 파이 차트 */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] shadow-soft border border-slate-100 dark:border-slate-800 col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-500">
                                    <BarChart3 size={18} />
                                </div>
                                <h2 className="font-bold text-slate-800 dark:text-slate-100">이달의 마음 컬러</h2>
                            </div>
                            <div className="h-56 w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={EMOTION_COLORS[entry.name] || '#eee'} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute text-center pointer-events-none">
                                    <p className="text-[10px] text-slate-400 font-medium">가장 많은</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{pieData[0]?.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 잘한 일 칭찬 */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-soft border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-500">
                                <Award size={18} />
                            </div>
                            <h2 className="font-bold text-slate-800 dark:text-slate-100">스스로 칭찬해! ✨</h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            {(stats.recent_positive_points || []).flat().slice(0, 3).map((point: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl group transition-all">
                                    <span className="text-lg group-hover:scale-125 transition-transform">🌟</span>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-tight">{point}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI 코멘트 */}
                    <div className="bg-slate-900 dark:bg-slate-100 p-6 rounded-[2.5rem] shadow-xl text-white dark:text-slate-900 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-slate-900/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-amber-400" />
                            <p className="text-xs font-bold opacity-70 uppercase tracking-widest text-amber-400">AI Counselor</p>
                        </div>
                        <p className="text-sm font-medium leading-relaxed relative z-10">
                            최근 {pieData[0]?.name || "다양한"} 감정들이 마음속에 가득했네요.
                            {pieData[0]?.name === '기쁨' ? "이 행복한 기운을 계속 간직하시길 바라요." : "조금은 지쳐있는 마음을 위해 따뜻한 차 한 잔 어떨까요?"}
                            당신은 충분히 잘하고 있어요. ☁️
                        </p>
                    </div>
                </div>
            )}

            <footer className="mt-8 text-center text-slate-400 text-[10px] font-medium opacity-50">차트 데이터는 지난 7일간의 기록을 바탕으로 생성됩니다</footer>
        </div>
    );
}
