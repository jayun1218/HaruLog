"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DiaryWrite() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [interimText, setInterimText] = useState(""); // 실시간 인식 중인 텍스트
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [selectedMood, setSelectedMood] = useState<string>("");

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Web Speech API 지원 여부 확인
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            setSpeechSupported(false);
        }

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
        const target = categories.find(c => c.id === id);
        const catName = target?.name || "이 카테고리";
        if (!confirm(`"${catName}" 카테고리를 삭제하시겠습니까?\n\n⚠️ 해당 카테고리의 일기도 모두 함께 삭제됩니다.`)) return;
        try {
            const res = await fetch(`${API}/api/categories/${id}`, { method: "DELETE" });
            const data = await res.json();
            setCategories(categories.filter(c => c.id !== id));
            if (selectedCategoryId === id) setSelectedCategoryId("");
            if (data.deleted_diaries > 0) {
                alert(`"${catName}" 카테고리와 일기 ${data.deleted_diaries}개가 삭제되었습니다.`);
            }
        } catch {
            alert("카테고리 삭제에 실패했습니다.");
        }
    };

    const startRecording = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.interimResults = true; // 실시간 중간 결과 표시
        recognition.continuous = true;     // 계속 듣기

        let finalTranscript = "";

        recognition.onresult = (event: any) => {
            let interim = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interim += transcript;
                }
            }

            // 확정된 텍스트는 content에 추가, 인식 중인 텍스트는 별도 표시
            if (finalTranscript) {
                setContent(prev => {
                    const base = prev.trimEnd();
                    return base ? `${base} ${finalTranscript}` : finalTranscript;
                });
                finalTranscript = "";
            }
            setInterimText(interim);
        };

        recognition.onerror = (event: any) => {
            // no-speech: 조용해서 말 안 할 때 정상 발생, 무시하고 기다림
            // aborted: 개발자가 직접 stop() 호출 시 발생, 정상
            if (event.error === "no-speech" || event.error === "aborted") return;
            console.error("Speech recognition error:", event.error);
            setIsRecording(false);
            setInterimText("");
        };

        recognition.onend = () => {
            // 사용자가 멈치 않았고 세션이 끊기면 (예: no-speech timeout) 자동 재시작
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch {
                    // 이미 실행 중이면 무시
                }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
        setInterimText("");
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
                body: JSON.stringify({ title, content, category_id: selectedCategoryId || null, date: selectedDate, mood: selectedMood || null })
            });

            if (res.ok) {
                alert("일기가 저장되었습니다! ☁️ AI 분석이 시작됩니다.");
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
        <div className="flex flex-col p-6 min-h-[100dvh] max-w-md mx-auto bg-white dark:bg-slate-900 transition-colors">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-foreground">✕</Link>
                <div>
                    <h1 className="text-2xl font-bold">일기 쓰기</h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* 날짜 선택 */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">날짜</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-slate-200 rounded-2xl border-none focus:ring-2 focus:ring-haru-sky-accent outline-none text-base font-medium text-slate-700"
                    />
                </div>

                {/* 기분 태그 */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">오늘 기분은요?</label>
                    <div className="flex gap-2 flex-wrap">
                        {["😊", "😄", "😌", "🥰", "😢", "😰", "😤", "😴", "🤔", "😶"].map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => setSelectedMood(selectedMood === emoji ? "" : emoji)}
                                className={`w-12 h-12 text-2xl rounded-2xl transition-all ${selectedMood === emoji
                                    ? "bg-haru-sky-accent scale-110 shadow-soft"
                                    : "bg-slate-50 dark:bg-slate-800 hover:bg-haru-sky-light"
                                    }`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 제목 */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="오늘 하루는 어땠나요?"
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 rounded-2xl border-none focus:ring-2 focus:ring-haru-sky-accent outline-none text-lg font-medium"
                    />
                </div>

                {/* 카테고리 */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">카테고리</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(Number(e.target.value) || "")}
                            className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 dark:text-slate-200 rounded-xl border-none outline-none text-sm appearance-none"
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
                            className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 rounded-xl border-none text-xs outline-none"
                        />
                        <button type="button" onClick={handleAddCategory} className="px-4 py-2 bg-haru-sky-medium text-haru-sky-deep font-bold rounded-xl text-xs hover:bg-haru-sky-accent transition-colors">추가</button>
                        {selectedCategoryId && (
                            <button type="button" onClick={() => handleDeleteCategory(Number(selectedCategoryId))} className="px-4 py-2 bg-red-50 text-red-400 font-bold rounded-xl text-xs hover:bg-red-100 transition-colors">삭제</button>
                        )}
                    </div>
                </div>

                {/* 내용 & 마이크 */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">내용</label>
                        {!speechSupported && (
                            <span className="text-xs text-red-300">음성 인식은 Chrome/Edge에서만 지원됩니다</span>
                        )}
                    </div>
                    <div className="relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="자유롭게 이야기를 들려주세요..."
                            rows={10}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 rounded-2xl border-none focus:ring-2 focus:ring-haru-sky-accent outline-none resize-none"
                        />

                        {/* 실시간 인식 중인 텍스트 미리보기 */}
                        {interimText && (
                            <div className="absolute bottom-20 left-4 right-16 text-sm text-slate-400 italic bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-haru-sky-accent/30">
                                {interimText}...
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={!speechSupported}
                            className={`absolute bottom-4 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isRecording
                                ? "bg-red-500 animate-pulse scale-110"
                                : "bg-haru-sky-deep hover:bg-haru-sky-accent"
                                } text-white text-2xl disabled:opacity-40`}
                        >
                            {isRecording ? "⏹️" : "🎤"}
                        </button>
                    </div>

                    {isRecording && (
                        <div className="flex items-center gap-2 text-xs text-red-400 font-medium animate-pulse">
                            <span className="w-2 h-2 bg-red-400 rounded-full inline-block"></span>
                            말씀하세요... 버튼을 다시 누르면 종료됩니다
                        </div>
                    )}
                </div>

                {/* 제출 버튼 */}
                <button
                    type="submit"
                    disabled={isSubmitting || isRecording}
                    className="mt-4 w-full p-5 bg-haru-sky-accent text-foreground font-bold rounded-2xl shadow-soft hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {isSubmitting ? "저장 중..." : isRecording ? "녹음을 먼저 종료해주세요" : "일기 작성 완료 ✨"}
                </button>
            </form>

            <footer className="mt-8 text-center text-slate-300 text-xs">
                말로 하셔도 괜찮아요, 제가 다 들어드릴게요.
            </footer>
        </div>
    );
}
