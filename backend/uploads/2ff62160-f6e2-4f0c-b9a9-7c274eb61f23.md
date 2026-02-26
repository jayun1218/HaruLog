# ☁️ HaruLog (하루로그)

> **"너의 하루를 몽글몽글하게 기록해봐"**  
> 음성으로 하루를 기록하고, AI가 감정을 분석해 나만의 마음 데이터를 만들어주는 프리미엄 일기 서비스입니다.

---

## ✨ 주요 기능

### 일기 작성 & 디자인
| 기능 | 설명 |
|---|---|
| 🎤 **실시간 음성 인식** | Web Speech API로 말하는 즉시 텍스트 입력 |
| ☁️ **마이크로 애니메이션** | 홈 화면의 둥둥 떠다니는 구름 마스코트와 부드러운 인터랙션 |
| 😊 **기분 이모지 선택** | 오늘 기분을 이모지로 직접 태그하고 달력에 수집 |
| 📁 **카테고리 관리** | 카테고리별 분류 및 필터링 기능 |
| 📷 **이미지 첨부** | 소중한 순간의 사진을 일기에 함께 저장 |

### AI 기능 고도화
| 기능 | 설명 |
|---|---|
| 🤖 **AI 자동 분석** | GPT-4o가 일기를 읽고 요약, 감정 점수, 칭찬/개선점 도출 |
| #️⃣ **자동 키워드 추출** | 일기 내용에서 핵심 키워드를 해시태그로 추출 (#산책 #행복 #여유) |
| � **AI 응원 카드** | 지친 하루 끝에 AI가 건네는 따뜻한 한 줄 응원 메시지 카드 |
| 🤗 **AI 심층 대화** | 작성한 일기 내용을 바탕으로 AI 카운슬러와 실시간 채팅 |
| 💌 **AI 월간 리포트** | 한 달간의 감정 흐름과 성장 포인트를 종합 분석 |

### 기록 보기 & 관리
| 기능 | 설명 |
|---|---|
| 📅 **인텔리전트 캘린더** | 기분 이모지와 필터링이 연동되는 스마트 달력 뷰 |
| �️ **추억 갤러리** | 일기에 첨부된 사진들만 모아보는 감성적인 갤러리 모드 |
| � **비주얼 통계** | Recharts를 활용한 감정 분포 및 변화 추이 시각화 |
| � **중요 일기 고정** | 핀 기능을 사용하여 소중한 기억을 리스트 최상단에 유지 |
| � **안전한 일기 잠금** | 개인적인 기록을 보호하기 위한 PIN 번호 잠금 기능 |

---

## 🛠 기술 스택

**Frontend**: Next.js 16 (App Router) · Tailwind CSS · Recharts (시각화) · Lucide React (아이콘)  
**Backend**: Python · FastAPI · PostgreSQL (SQLAlchemy) · python-dotenv  
**AI**: OpenAI GPT-4o (분석 · 요약 · 대화 · 리포트) · Whisper-1 (STT)  
**인프라**: Docker Compose (Optional) · Local Environments 지원

---

## 🚀 시작하기

### 1. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하세요:
```env
DATABASE_URL=postgresql://jayun@localhost:5432/mindtrace # 로컬 DB 기준
OPENAI_API_KEY=sk-...         # AI 분석 및 요약에 필수
NEXTAUTH_SECRET=yoursecret    # 보안용 임의 문자열
```

### 2. 백엔드 실행
```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```
접속 주소: [http://localhost:3000](http://localhost:3000) (또는 사용 중인 포트 확인)

---

## 📂 프로젝트 구조

```
HaruLog/
├── frontend/src/app/
│   ├── page.tsx              # 홈 (스트릭, 구름 애니메이션)
│   ├── diary/write/          # 일기 작성 (STT, 이미지)
│   ├── diary/list/           # 달력 및 리스트 (필터링, 갤러리 링크)
│   ├── diary/gallery/        # 추억 갤러리 모드 [NEW]
│   ├── statistics/           # 감정 통계 시각화 (Recharts) [UPDATED]
│   └── report/               # AI 월간 리포트
├── backend/app/
│   ├── api.py                # AI 분석 처리 및 API 엔드포인트
│   ├── models.py             # DB 스키마 (Keywords/Card Message 추가)
│   └── database.py           # DB 연결 및 커넥션 관리
├── .env                      # 환경 변수 (OpenAI API 키 등)
└── README.md
```

---

## 📅 로드맵
- [x] 실시간 음성 인식 및 감성적인 UI/UX 개선
- [x] GPT-4o 기반 AI 요약, 해시태그, 응원 카드 기능
- [x] 감정 분포 통계 시각화 (Charts) 및 갤러리 모드
- [x] 달력 - 리스트 - 카테고리 필터링 완벽 연동
- [x] AI 월간 종합 리포트 및 채팅 서비스
- [ ] 소셜 로그인 (Auth.js v5)
- [ ] 모바일 앱 버전 (React Native)

---

© 2026 HaruLog. All rights fluffy. ☁️ ✨
