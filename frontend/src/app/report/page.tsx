"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MonthlyReport() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [report, setReport] = useState<{ report: string; diary_count?: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchReport = async () => {
        setIsLoading(true);
        setReport(null);
        try {
            const res = await fetch(`${API}/api/report/monthly?year=${year}&month=${month}`);
            const data = await res.json();
            setReport(data);
        } catch {
            setReport({ report: "리포트를 불러오는데 실패했어요." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, []);

    return (
        <div className="flex flex-col p-6 min-h-[100dvh] max-w-md mx-auto bg-slate-50 dark:bg-slate-900 transition-colors">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-foreground text-xl">←</Link>
                <h1 className="text-2xl font-bold">💌 월간 AI 리포트</h1>
            </header>

            {/* 월 선택 */}
            <div className="flex items-center gap-3 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft">
                <button onClick={() => { const d = new Date(year, month - 2, 1); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }} className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-700 hover:bg-haru-sky-light flex items-center justify-center">‹</button>
                <span className="flex-1 text-center font-bold text-foreground dark:text-slate-100">{year}년 {month}월</span>
                <button onClick={() => { const d = new Date(year, month, 1); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-haru-sky-light flex items-center justify-center">›</button>
                <button onClick={fetchReport} className="px-4 py-2 bg-haru-sky-medium text-haru-sky-deep font-bold rounded-xl text-sm hover:bg-haru-sky-accent transition-colors">분석</button>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-haru-sky-medium rounded-full flex items-center justify-center text-3xl animate-pulse">☁️</div>
                    <p className="text-slate-400 text-sm">AI가 이번 달 일기를 분석하고 있어요...</p>
                </div>
            ) : report ? (
                <div className="flex flex-col gap-4">
                    {report.diary_count !== undefined && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <span className="w-8 h-8 bg-haru-sky-medium rounded-full flex items-center justify-center">📝</span>
                            이번 달 <span className="text-haru-sky-deep font-bold">{report.diary_count}개</span>의 일기를 쓰셨어요
                        </div>
                    )}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🤗</span>
                            <span className="text-sm font-bold text-slate-500">AI 카운슬러의 월간 리포트</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{report.report}</p>
                    </div>
                    <div className="bg-haru-sky-light p-4 rounded-2xl border border-haru-sky-accent/30 text-xs text-slate-500 text-center">
                        이 리포트는 AI가 생성한 감정 분석 결과입니다.<br />전문 심리 상담을 대체하지 않습니다.
                    </div>
                </div>
            ) : null}
        </div>
    );
}
