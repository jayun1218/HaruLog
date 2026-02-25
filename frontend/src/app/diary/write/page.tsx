"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DiaryWrite() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        fetch(`${API}/api/categories`)
            .then(res => res.json())
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(err => console.error("카테고리 로드 실패:", err));
    }, []);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const res = await fetch(`${API}/api/categories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCategoryName })
            });
            const data = await res.json();
            setCategories([...categories, data]);
            setNewCategoryName("");
            setSelectedCategoryId(data.id);
        } catch {
            alert("카테고리 추가에 실패했습니다.");
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm("이 카테고리를 삭제하시겠습니까?")) return;
        try {
            await fetch(`${API}/api/categories/${id}`, { method: "DELETE" });
            setCategories(categories.filter(c => c.id !== id));
            if (selectedCategoryId === id) setSelectedCategoryId("");
        } catch {
            alert("카테고리 삭제에 실패했습니다.");
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
                await sendAudioToSTT(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch {
            alert("마이크 접근 권한이 필요합니다. 브라우저 주소창의 자물쇠 아이콘을 눌러 권한을 허용해주세요.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const sendAudioToSTT = async (blob: Blob) => {
        const formData = new FormData();
        formData.append("file", blob, "recording.wav");
        try {
            const res = await fetch(`${API}/api/stt`, { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) {
                alert(`음성 인식 실패: ${data.detail || '서버 오류'}`);
                return;
            }
            if (data.text) {
                setContent(prev => prev ? `${prev} ${data.text}` : data.text);
            }
        } catch {
            alert("음성 인식에 실패했습니다.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) {
            alert("제목과 내용을 모두 입력해주세요!");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API}/api/diaries`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, category_id: selectedCategoryId || null })
            });

            if (res.ok) {
                alert("일기가 저장되었습니다! ☁️");
                router.push("/");
            } else {
                const err = await res.json();
                throw new Error(err.detail || "Failed to save diary");
            }
        } catch (err: any) {
            alert(`저장에 실패했습니다: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col p-6 min-h-[100dvh] max-w-md mx-auto bg-white">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-foreground">✕</Link>
                <h1 className="text-2xl font-bold">오늘의 일기 쓰기</h1>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-500">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="오늘 하루는 어땠나요?"
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-haru-sky-accent outline-none text-lg font-medium"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-500">카테고리</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(Number(e.target.value) || "")}
                            className="flex-1 p-3 bg-slate-50 rounded-xl border-none outline-none text-sm appearance-none"
                        >
                            <option value="">카테고리 선택</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2 mt-1">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                            placeholder="새 카테고리"
                            className="flex-1 p-2 bg-slate-50 rounded-xl border-none text-xs outline-none"
                        />
                        <button type="button" onClick={handleAddCategory} className="px-4 py-2 bg-haru-sky-medium text-haru-sky-deep font-bold rounded-xl text-xs hover:bg-haru-sky-accent transition-colors">추가</button>
                        {selectedCategoryId && (
                            <button type="button" onClick={() => handleDeleteCategory(Number(selectedCategoryId))} className="px-4 py-2 bg-red-50 text-red-400 font-bold rounded-xl text-xs hover:bg-red-100 transition-colors">삭제</button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 relative">
                    <label className="text-sm font-semibold text-slate-500">내용</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="자유롭게 이야기를 들려주세요..."
                        rows={10}
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-haru-sky-accent outline-none resize-none"
                    />
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`absolute bottom-4 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isRecording ? "bg-red-500 animate-pulse scale-110" : "bg-haru-sky-deep hover:bg-haru-sky-accent"
                            } text-white text-2xl`}
                    >
                        {isRecording ? "⏹️" : "🎤"}
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 w-full p-5 bg-haru-sky-accent text-foreground font-bold rounded-2xl shadow-soft hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {isSubmitting ? "저장 중..." : "일기 작성 완료 ✨"}
                </button>
            </form>

            <footer className="mt-8 text-center text-slate-300 text-xs">
                말로 하셔도 괜찮아요, 제가 다 들어드릴게요.
            </footer>
        </div>
    );
}
