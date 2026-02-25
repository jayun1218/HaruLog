"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

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
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[100dvh] bg-background transition-colors">
      {/* 다크모드 토글 */}
      <button
        onClick={toggleDark}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-haru-sky-medium flex items-center justify-center text-lg hover:bg-haru-sky-accent transition-colors"
        title="다크모드 전환"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      <div className="w-32 h-32 bg-haru-sky-accent rounded-full mb-6 flex items-center justify-center animate-bounce duration-[2000ms] shadow-soft">
        <span className="text-5xl">☁️</span>
      </div>

      <header className="text-center mb-4">
        <h1 className="text-4xl font-extrabold text-foreground mb-2 tracking-tight">HaruLog</h1>
        <p className="text-base text-slate-500 font-medium">너의 하루를 몽글몽글하게 기록해봐</p>
      </header>

      {/* 스트릭 배지 */}
      {streak > 0 && (
        <div className="mb-8 px-5 py-2.5 bg-haru-sky-medium rounded-full flex items-center gap-2 shadow-soft">
          <span className="text-xl">🔥</span>
          <span className="text-sm font-bold text-haru-sky-deep">{streak}일 연속 기록 중!</span>
        </div>
      )}
      {streak === 0 && <div className="mb-8" />}

      <main className="w-full max-w-sm flex flex-col gap-4">
        <Link href="/diary/write" className="fluffy-card text-left flex items-center gap-4 group hover:bg-haru-sky-light active:bg-haru-sky-light transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-haru-sky-medium rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition-transform">✏️</div>
          <div>
            <h2 className="font-bold text-lg text-foreground">오늘의 일기 쓰기</h2>
            <p className="text-sm text-slate-400">간직하고 싶은 순간을 남겨요</p>
          </div>
        </Link>

        <Link href="/diary/list" className="fluffy-card text-left flex items-center gap-4 group hover:bg-haru-sky-light active:bg-haru-sky-light transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-haru-sky-medium rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition-transform">📅</div>
          <div>
            <h2 className="font-bold text-lg text-foreground">기록 모아보기</h2>
            <p className="text-sm text-slate-400">달력으로 지난 하루들을 꺼내봐요</p>
          </div>
        </Link>

        <Link href="/statistics" className="fluffy-card text-left flex items-center gap-4 group hover:bg-haru-sky-light active:bg-haru-sky-light transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-haru-sky-medium rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition-transform">✨</div>
          <div>
            <h2 className="font-bold text-lg text-foreground">내 마음 통계</h2>
            <p className="text-sm text-slate-400">이번 달은 어떤 감정이 많았을까요?</p>
          </div>
        </Link>

        <Link href="/report" className="fluffy-card text-left flex items-center gap-4 group hover:bg-haru-sky-light active:bg-haru-sky-light transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-haru-sky-medium rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition-transform">💌</div>
          <div>
            <h2 className="font-bold text-lg text-foreground">월간 AI 리포트</h2>
            <p className="text-sm text-slate-400">한 달의 마음을 AI가 요약해줘요</p>
          </div>
        </Link>

        {/* 리마인더 설정 */}
        <button
          onClick={async () => {
            if (!('Notification' in window)) { alert('이 브라우저는 알림을 지원하지 않아요.'); return; }
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              const h = prompt('알림 시간 (시 단위, 0-23):', '21');
              if (h !== null) {
                localStorage.setItem('reminderHour', h);
                alert(`매일 ${h}시에 일기 작성 알림을 설정했어요 ✔️\n(브라우저 실행 중 알림이 동작합니다)`);
              }
            } else {
              alert('알림 권한을 허용해주세요.');
            }
          }}
          className="fluffy-card text-left flex items-center gap-4 group hover:bg-haru-sky-light transition-colors w-full"
        >
          <div className="w-12 h-12 bg-haru-sky-medium rounded-2xl flex items-center justify-center text-2xl">🔔</div>
          <div>
            <h2 className="font-bold text-lg text-foreground">일기 리마인더</h2>
            <p className="text-sm text-slate-400">매일 일기 작성 알림 설정</p>
          </div>
        </button>
      </main>

      <footer className="mt-12 text-slate-400 text-sm font-medium">
        © 2026 HaruLog. All rights fluffy.
      </footer>
    </div>
  );
}
