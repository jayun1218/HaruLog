"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Image as ImageIcon, Calendar, Heart, Search } from "lucide-react";
import { useBackendToken } from "@/components/AuthProvider";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Diary {
    id: number;
    title: string;
    image_url: string;
    created_at: string;
    mood?: string;
}

export default function Gallery() {
    const { data: session, status } = useSession();
    const { backendToken } = useBackendToken();
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQ, setSearchQ] = useState("");

    useEffect(() => {
        if (status === "loading") return;
        if (!backendToken) { setIsLoading(false); return; }

        fetch(`${API}/api/diaries`, {
            headers: { "Authorization": `Bearer ${backendToken}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // 이미지가 있는 일기만 필터링
                    setDiaries(data.filter(d => d.image_url));
                }
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [backendToken, status]);

    const filteredDiaries = diaries.filter(d =>
        d.title.toLowerCase().includes(searchQ.toLowerCase())
    );

    return (
        <div className="flex flex-col p-6 min-h-[100dvh] max-w-6xl mx-auto transition-colors pb-12">
            <header className="flex flex-col gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-soft flex items-center justify-center text-slate-400 hover:text-foreground transition-all">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">추억 갤러리</h1>
                </div>

                <div className="relative max-w-md md:mx-auto w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="기억하고 싶은 순간 검색..."
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl shadow-soft border-none focus:ring-2 focus:ring-haru-sky-accent outline-none text-sm transition-all dark:text-slate-200"
                    />
                </div>
            </header>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-haru-sky-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium animate-pulse">사진첩을 열고 있어요... 📷</p>
                </div>
            ) : filteredDiaries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
                    <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-[3rem] flex items-center justify-center text-6xl shadow-inner text-slate-300">
                        <ImageIcon size={48} />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-lg mb-1">{searchQ ? "검색 결과가 없어요" : "아직 사진이 담긴 기록이 없어요"}</p>
                        <p className="text-slate-400 text-sm">소중한 순간에 사진을 남겨보세요!</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {filteredDiaries.map((diary) => (
                        <Link
                            key={diary.id}
                            href={`/diary/list?id=${diary.id}`}
                            className="group relative aspect-square rounded-[2rem] overflow-hidden shadow-soft bg-slate-200 animate-in fade-in zoom-in duration-500"
                        >
                            <img
                                src={`${API}${diary.image_url}`}
                                alt={diary.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <p className="text-white text-xs font-bold truncate">{diary.title}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <Calendar size={10} className="text-white/70" />
                                    <span className="text-[10px] text-white/70">{diary.created_at.slice(5, 10)}</span>
                                </div>
                            </div>
                            {diary.mood && (
                                <div className="absolute top-3 right-3 w-8 h-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl flex items-center justify-center text-lg shadow-soft">
                                    {diary.mood}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}

            <footer className="mt-12 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-haru-sky-light dark:bg-haru-sky-deep/20 rounded-full text-[10px] font-bold text-haru-sky-deep dark:text-haru-sky-accent">
                    <Heart size={12} fill="currentColor" />
                    총 {filteredDiaries.length}개의 순간이 담겨있어요
                </div>
            </footer>
        </div>
    );
}
