"use client";

import { useRef, useState } from "react";

interface ShareCardProps {
    diary: {
        title: string;
        content: string;
        created_at: string;
        mood?: string;
        analysis?: {
            summary?: string;
            emotions?: Record<string, number>;
        };
    };
    onClose: () => void;
}

function getTopEmotion(emotions?: Record<string, number>): string {
    if (!emotions) return "";
    const labelMap: Record<string, string> = {
        "기쁨": "기쁨", "joy": "기쁨", "슬픔": "슬픔", "sadness": "슬픔",
        "분노": "분노", "anger": "분노", "불안": "불안", "anxiety": "불안",
        "평온": "평온", "calm": "평온",
    };
    const top = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0];
    return top ? (labelMap[top[0]] ?? top[0]) : "";
}

export default function ShareCard({ diary, onClose }: ShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const dateStr = new Date(diary.created_at + "T00:00:00").toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric",
    });
    const topEmotion = getTopEmotion(diary.analysis?.emotions);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: null,
                useCORS: true,
            });
            const link = document.createElement("a");
            link.download = `harulog-${diary.created_at?.slice(0, 10) ?? "card"}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch {
            alert("이미지 저장 중 오류가 발생했어요.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                {/* 공유 카드 본체 */}
                <div
                    ref={cardRef}
                    className="w-72 rounded-[2.5rem] overflow-hidden shadow-2xl"
                    style={{ background: "linear-gradient(135deg, #a8d8f0 0%, #e0f2fe 50%, #f0f9ff 100%)" }}
                >
                    {/* 상단 헤더 */}
                    <div className="px-6 pt-7 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">☁️</span>
                            <span className="text-xs font-black text-sky-700 tracking-widest uppercase">HaruLog</span>
                        </div>
                        <span className="text-xs font-bold text-sky-600">{dateStr}</span>
                    </div>

                    {/* 기분 & 감정 */}
                    {(diary.mood || topEmotion) && (
                        <div className="px-6 pb-2 flex items-center gap-2">
                            {diary.mood && <span className="text-2xl">{diary.mood}</span>}
                            {topEmotion && (
                                <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">{topEmotion}</span>
                            )}
                        </div>
                    )}

                    {/* 제목 */}
                    <div className="px-6 pb-2">
                        <h2 className="text-lg font-black text-sky-900 leading-snug">{diary.title}</h2>
                    </div>

                    {/* AI 요약 또는 내용 미리보기 */}
                    <div className="mx-6 mb-5 bg-white/70 rounded-2xl p-4">
                        <p className="text-sm text-sky-800 leading-relaxed line-clamp-4 font-medium">
                            {diary.analysis?.summary
                                ? `✨ ${diary.analysis.summary}`
                                : diary.content.slice(0, 120) + (diary.content.length > 120 ? "..." : "")}
                        </p>
                    </div>

                    {/* 하단 워터마크 */}
                    <div className="px-6 pb-5 flex justify-end">
                        <span className="text-[9px] font-bold text-sky-400 opacity-60 tracking-widest">© 2026 HaruLog · All rights fluffy.</span>
                    </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="px-6 py-3 bg-sky-500 text-white font-bold rounded-2xl shadow-lg hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-60 text-sm"
                    >
                        {isDownloading ? "저장 중..." : "📥 이미지 저장"}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-3 bg-white text-slate-500 font-bold rounded-2xl shadow hover:bg-slate-50 active:scale-95 transition-all text-sm"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
