"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, LogIn, User, ArrowRight } from "lucide-react";
import { toast } from "@/components/Toast";
import AIAgent from "@/components/AIAgent";
import FortuneTeller from "@/components/FortuneTeller";
import TarotReader from "@/components/TarotReader";
import { useBackendToken } from "@/components/AuthProvider";

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
  const { data: session } = useSession();
  const { backendToken } = useBackendToken();
  const [darkMode, setDarkMode] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true";
    setDarkMode(saved);
    document.documentElement.classList.toggle("dark", saved);

    // 로그인된 경우에만 일기 목록 가져오기
    const fetchOptions = backendToken
      ? { headers: { Authorization: `Bearer ${backendToken}` } }
      : {};

    fetch(`${API}/api/diaries`, fetchOptions)
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
  }, [session, backendToken]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 sm:p-8 gap-8 sm:gap-12 bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="text-center flex flex-col items-center gap-6 mb-4">
        <div className="relative group cursor-pointer">
          <div className="w-28 h-28 bg-white dark:bg-slate-900 rounded-[3rem] flex items-center justify-center text-5xl shadow-soft animate-float border-4 border-haru-sky-accent/20 overflow-hidden">
            {session?.user?.image ? (
              <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              "☁️"
            )}
          </div>
          {/* 스트릭 뱃지 */}
          {(() => {
            const badges = [
              { min: 0, max: 2, icon: "🌱", name: "새싹", next: 3 },
              { min: 3, max: 6, icon: "🔥", name: "불꽃", next: 7 },
              { min: 7, max: 29, icon: "⭐", name: "별", next: 30 },
              { min: 30, max: Infinity, icon: "👑", name: "왕관", next: null },
            ];
            const badge = badges.find(b => streak >= b.min && streak <= b.max) ?? badges[0];
            return (
              <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 flex flex-col items-end gap-0.5 max-w-[120px] sm:max-w-none">
                <div className={`bg-haru-sky-accent text-haru-sky-deep text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-800 transform group-hover:scale-110 transition-transform flex items-center gap-1 whitespace-nowrap`}>
                  <span>{badge.icon}</span>
                  <span>{streak}일 연속</span>
                </div>
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 pr-1 whitespace-nowrap">
                  {badge.next ? `${badge.name} · ${badge.next - streak}일` : `${badge.name} 🎉`}
                </span>
              </div>
            );
          })()}
        </div>
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-4xl font-black bg-gradient-to-br from-slate-900 via-slate-700 to-slate-400 dark:from-white dark:via-slate-200 dark:to-slate-500 bg-clip-text text-transparent tracking-tighter">
            {session?.user?.name ? `${session.user.name} 님의 HaruLog` : "HaruLog"}
          </h1>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 tracking-wide">
            {greeting}
          </p>
        </div>
      </header>

      {/* 액션 버튼 그룹 (다크모드 & 로그인/로그아웃) */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <button
          onClick={toggleDark}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-soft flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
          title="다크모드 전환"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>

        {session ? (
          <button
            onClick={() => signOut()}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-soft flex items-center justify-center text-slate-400 hover:text-haru-pink-accent hover:scale-110 active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        ) : (
          <Link
            href="/login"
            className="w-12 h-12 rounded-2xl bg-haru-sky-deep dark:bg-haru-sky-accent shadow-soft flex items-center justify-center text-white dark:text-haru-sky-deep hover:scale-110 active:scale-95 transition-all"
            title="로그인"
          >
            <LogIn className="w-5 h-5" />
          </Link>
        )}
      </div>

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* 상단 통합 섹션 (모바일에서는 맨 위, 데스크톱에서는 왼쪽 또는 중앙) */}
        <div className="md:col-span-2 flex flex-col gap-6 mb-4">
          <Link href="/diary/write" className="fluffy-card flex items-center gap-4 sm:gap-6 group hover:shadow-xl hover:-translate-y-1 py-5 sm:py-8 px-5 sm:px-10 bg-gradient-to-r from-haru-sky-light/30 to-white dark:from-haru-sky-deep/10 dark:to-slate-900 border-2 border-haru-sky-accent/20">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-haru-sky-accent/20 dark:bg-haru-sky-accent/10 rounded-[2rem] flex items-center justify-center text-3xl sm:text-5xl group-hover:scale-110 transition-transform animate-float flex-shrink-0">✨</div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-lg sm:text-2xl text-foreground mb-1 whitespace-nowrap">오늘을 기록하기</h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">따뜻한 말 한마디로 하루를 마무리해요</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-haru-sky-deep text-white flex items-center justify-center group-hover:translate-x-2 transition-transform shadow-lg flex-shrink-0">
              <ArrowRight size={20} />
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <Link href="/diary/list" className="fluffy-card flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">📅</div>
            <div className="flex-1">
              <h2 className="font-black text-lg text-foreground mb-0.5">기록 달력</h2>
              <p className="text-xs text-slate-400 font-medium">지난 소중한 날들을 모아봐요</p>
            </div>
          </Link>

          <Link href="/diary/gallery" className="fluffy-card flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">🖼️</div>
            <div className="flex-1">
              <h2 className="font-black text-lg text-foreground mb-0.5">추억 갤러리</h2>
              <p className="text-xs text-slate-400 font-medium">사진 리스트로 모아보기</p>
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <Link href="/statistics" className="fluffy-card flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">📊</div>
            <div className="flex-1">
              <h2 className="font-black text-lg text-foreground mb-0.5">내 마음 통계</h2>
              <p className="text-xs text-slate-400 font-medium">데이터로 보는 나의 감정 흐름</p>
            </div>
          </Link>

          <Link href="/report" className="fluffy-card flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">💌</div>
            <div className="flex-1">
              <h2 className="font-black text-lg text-foreground mb-0.5">AI 월간 리포트</h2>
              <p className="text-xs text-slate-400 font-medium">한 달의 마음 정성스레 요약</p>
            </div>
          </Link>
        </div>

        <div className="md:col-span-2">
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
        </div>
      </main>

      <footer className="mt-12 text-slate-400 text-[10px] font-bold tracking-widest uppercase opacity-50">
        © 2026 HaruLog. All rights fluffy.
      </footer>

      <TarotReader />
      <FortuneTeller />
      <AIAgent />
    </div>
  );
}
