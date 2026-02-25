export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[100dvh]">
      {/* 귀여운 캐릭터 또는 로고 자리 */}
      <div className="w-32 h-32 bg-haru-sky-accent rounded-full mb-8 flex items-center justify-center animate-bounce duration-[2000ms] shadow-soft">
        <span className="text-5xl">☁️</span>
      </div>

      {/* 헤더 섹션 */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-foreground mb-3 tracking-tight">
          HaruLog
        </h1>
        <p className="text-lg text-slate-500 font-medium">
          너의 하루를 몽글몽글하게 기록해봐
        </p>
      </header>

      {/* 메인 액션 카드 (모바일 앱 느낌) */}
      <main className="w-full max-w-sm flex flex-col gap-6">
        <button className="fluffy-card text-left flex items-center gap-4 group active:bg-haru-sky-light transition-colors">
          <div className="w-12 h-12 bg-haru-sky-medium rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition-transform">
            ✏️
          </div>
          <div>
            <h2 className="font-bold text-lg">오늘의 일기 쓰기</h2>
            <p className="text-sm text-slate-400">간직하고 싶은 순간을 남겨요</p>
          </div>
        </button>

        <button className="fluffy-card text-left flex items-center gap-4 group active:bg-haru-sky-light transition-colors">
          <div className="w-12 h-12 bg-haru-sky-medium rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition-transform">
            📂
          </div>
          <div>
            <h2 className="font-bold text-lg">기록 모아보기</h2>
            <p className="text-sm text-slate-400">지난 소중한 하루들을 꺼내봐요</p>
          </div>
        </button>

        <button className="fluffy-card text-left flex items-center gap-4 group active:bg-haru-sky-light transition-colors">
          <div className="w-12 h-12 bg-haru-sky-medium rounded-2xl flex items-center justify-center text-2xl group-active:scale-90 transition-transform">
            ✨
          </div>
          <div>
            <h2 className="font-bold text-lg">내 마음 통계</h2>
            <p className="text-sm text-slate-400">이번 달은 어떤 감정이 많았을까요?</p>
          </div>
        </button>
      </main>

      {/* 푸터 영역 */}
      <footer className="mt-16 text-slate-400 text-sm font-medium">
        © 2026 HaruLog. All rights fluffy.
      </footer>
    </div>
  );
}

