"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "@/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// 연속 일기 스트릭 계산
function calcStreak(diaries: { created_at: string }[]): number {
  if (!diaries.length) return 0;
  const dates = [...new Set(diaries.map(d => d.created_at.slice(0, 10)))].sort().reverse();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const dateStr of dates) {
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diff === 0 || diff === 1) {
      streak++;
      cursor = d;
    } else {
      break;
    }
  }
  return streak;
}

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true";
    setDarkMode(saved);
    document.documentElement.classList.toggle("dark", saved);

    fetch(`${API}/api/diaries`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStreak(calcStreak(data));
      })
      .catch(() => { });

    // 시간대별 인사말 설정 (Client-side)
    const hour = new Date().getHours();
    let g = "고요한 밤이에요 🌙";
    if (hour >= 5 && hour < 12) g = "상쾌한 아침이에요 ☀️";
    else if (hour >= 12 && hour < 17) g = "나른한 오후네요 ☁️";
    else if (hour >= 17 && hour < 21) g = "포근한 저녁이에요 🌅";
    setGreeting(g);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-8 gap-12 bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="text-center flex flex-col items-center gap-6 mb-4">
        <div className="relative group cursor-pointer">
          <div className="w-28 h-28 bg-white dark:bg-slate-900 rounded-[3rem] flex items-center justify-center text-5xl shadow-soft animate-float border-4 border-haru-sky-accent/20">
            ☁️
          </div>
          <div className="absolute -top-3 -right-3 bg-haru-sky-accent text-haru-sky-deep text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-800 transform group-hover:scale-110 transition-transform">
            {streak}일 기록 중
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-4xl font-black bg-gradient-to-br from-slate-900 via-slate-700 to-slate-400 dark:from-white dark:via-slate-200 dark:to-slate-500 bg-clip-text text-transparent tracking-tighter">
            HaruLog
          </h1>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 tracking-wide">
            {greeting}
          </p>
        </div>
      </header>

      <button
        onClick={toggleDark}
        className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-soft flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
        title="다크모드 전환"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      <main className="w-full max-w-sm flex flex-col gap-4">
        <Link href="/diary/write" className="fluffy-card flex items-center gap-4 group hover:shadow-xl hover:-translate-y-1">
          <div className="w-14 h-14 bg-haru-sky-accent/20 dark:bg-haru-sky-accent/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">✨</div>
          <div className="flex-1">
            <h2 className="font-bold text-lg text-foreground mb-0.5">오늘을 기록하기</h2>
            <p className="text-xs text-slate-400 font-medium">따뜻한 말 한마디로 하루를 마무리해요</p>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/diary/list" className="fluffy-card flex flex-col gap-3 group hover:shadow-lg hover:-translate-y-1">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-xl">📅</div>
            <div>
              <h2 className="font-bold text-sm text-foreground">캘린더</h2>
              <p className="text-[10px] text-slate-400">지난 날들</p>
            </div>
          </Link>

          <Link href="/diary/gallery" className="fluffy-card flex flex-col gap-3 group hover:shadow-lg hover:-translate-y-1">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-xl">🖼️</div>
            <div>
              <h2 className="font-bold text-sm text-foreground">갤러리</h2>
              <p className="text-[10px] text-slate-400">사진 모아보기</p>
            </div>
          </Link>
        </div>

        <Link href="/statistics" className="fluffy-card flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl">📊</div>
          <div className="flex-1">
            <h2 className="font-bold text-base text-foreground">내 마음 통계</h2>
            <p className="text-xs text-slate-400">데이터로 보는 나의 감정</p>
          </div>
        </Link>

        <Link href="/report" className="fluffy-card flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1 opacity-60">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl">💌</div>
          <div className="flex-1">
            <h2 className="font-bold text-base text-foreground">AI 리포트</h2>
            <p className="text-xs text-slate-400">한 달의 마음 요약 (준비 중)</p>
          </div>
        </Link>

        <button
          onClick={async () => {
            if (!('Notification' in window)) { toast('이 브라우저는 알림을 지원하지 않아요.', 'error'); return; }
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              const h = prompt('알림 시간 (시 단위, 0-23):', '21');
              if (h !== null) {
                localStorage.setItem('reminderHour', h);
                toast(`매일 ${h}시에 일기 작성 알림을 설정했어요 ✔️`, 'success');
              }
            } else {
              toast('알림 권한을 허용해주세요.', 'info');
            }
          }}
          className="fluffy-card flex items-center gap-4 group w-full text-left"
        >
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-xl group-hover:rotate-12 transition-transform">🔔</div>
          <div>
            <h2 className="font-bold text-sm text-foreground">일기 리마인더</h2>
            <p className="text-xs text-slate-400">알림 설정</p>
          </div>
        </button>
      </main>

      <footer className="mt-12 text-slate-400 text-[10px] font-bold tracking-widest uppercase opacity-50">
        © 2026 HaruLog. All rights fluffy.
      </footer>
    </div>
  );
}
