# ☁️ HaruLog (하루로그)

> **"너의 하루를 몽글몽글하게 기록해봐"**  
> 음성으로 하루를 기록하고, AI가 감정을 분석해 나만의 마음 데이터를 만들어주는 프리미엄 일기 서비스입니다.

---

## ✨ 주요 기능

### 일기 작성 & 디자인
| 기능 | 설명 |
|---|---|
| 🎤 **실시간 음성 인식** | Web Speech API로 말하는 즉시 텍스트 입력 |
| 🍯 **감정 믹서 (Mood Mixer)** | 5가지 감정 스푼을 솥에 담아 나만의 고유한 컬러와 이름을 생성하는 인터랙티브 UI |
| ✍️ **AI 제목 자동 추천** | 내용 입력 후 GPT가 감성적인 제목 3개를 추천, 클릭하면 자동 입력 |
| 😊 **기분 이모지 선택** | 오늘 기분을 이모지로 태그하고 달력에 수집 |
| 📁 **카테고리 관리** | 카테고리별 분류 및 필터링 |
| 📷 **이미지 첨부** | 소중한 사진을 일기에 함께 저장 |
| 🔒 **PIN 잠금** | 개인적인 기록을 PIN 번호로 보호 |

### AI 기능
| 기능 | 설명 |
|---|---|
| 🤖 **AI 자동 분석** | GPT-4o가 요약·감정 점수·칭찬/개선점·키워드 자동 도출 |
| ☁️ **AI 에이전트 (구름)** | 홈 화면의 구름 마스코트와 나누는 따뜻한 일상 대화 |
| 🍀 **오늘의 운세** | 매일 새로운 행운 메시지 |
| 🃏 **타로 3장 스프레드** | 과거·현재·미래 카드 선택, DALL-E 3가 테마별 카드 이미지 실시간 생성 |
| 💌 **AI 월간 리포트** | 한 달의 감정 흐름을 종합 분석한 자동 리포트 |
| 🔑 **Google 소셜 로그인** | NextAuth.js 기반 안전한 연동 및 모바일 인앱 브라우저(In-App Browser) 최적화 |
| 📱 **Hybrid 모바일 앱 (iOS)** | Capacitor를 이용한 네이티브 앱 패키징 및 딥링크 기반 세션 동기화 제공 |
| 🎨 **반응형 & 전용 UI** | 데스크톱 다단 레이아웃부터 모바일 노치(Notch) 대응 전용 UI까지 완벽 지원 |

### 기록 보기 & 관리
| 기능 | 설명 |
|---|---|
| 🎨 **감정 믹서 캘린더** | 직접 조합한 고유 감정 색상과 이모지로 한눈에 보는 마음 지도 |
| 🔥 **스트릭 뱃지** | 연속 작성 일수에 따라 🌱새싹→🔥불꽃→⭐별→👑왕관 단계별 뱃지 |
| 📊 **감정 통계** | Recharts 기반 감정 분포 & 추이 시각화 |
| 🖼 **추억 갤러리** | 이미지 첨부 일기 모아보기 |
| 📤 **SNS 공유 카드** | 일기를 예쁜 카드로 변환하여 PNG 이미지로 저장 |
| 📌 **일기 고정** | 중요한 기록을 리스트 최상단에 핀으로 고정 |

---

## 🛠 기술 스택

**Frontend**: Next.js (App Router) · Tailwind CSS · Recharts · Lucide React · html2canvas  
**Backend**: Python · FastAPI · PostgreSQL (SQLAlchemy) · python-dotenv  
**AI**: OpenAI GPT-4o (분석 · 대화 · 제목추천 · 리포트) · DALL-E 3 (타로 이미지) · Whisper-1 (STT)

---

## 🚀 시작하기

### 1. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하세요:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/mindtrace
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. 백엔드 실행
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```
접속: [http://localhost:3000](http://localhost:3000)

---

## 📂 프로젝트 구조

```
HaruLog/
├── frontend/src/app/
│   ├── page.tsx              # 홈 (스트릭 뱃지, 구름 애니메이션)
│   ├── diary/write/          # 일기 작성 (STT, AI 제목 추천)
│   ├── diary/list/           # 감정 히트맵 달력 + 리스트
│   ├── diary/gallery/        # 추억 갤러리
│   ├── statistics/           # 감정 통계 시각화
│   └── report/               # AI 월간 리포트
├── frontend/src/components/
│   ├── AIAgent.tsx           # 구름 AI 에이전트 채팅
│   ├── FortuneTeller.tsx     # 오늘의 운세
│   ├── TarotReader.tsx       # 타로 3장 스프레드 (DALL-E 3 이미지)
│   └── ShareCard.tsx         # SNS 공유 카드 (html2canvas)
├── backend/app/
│   ├── api.py                # 모든 API 엔드포인트
│   ├── models.py             # DB 스키마
│   └── database.py           # DB 연결
└── .env
```

---

## 📅 로드맵
- [x] 실시간 음성 인식 및 감성적인 UI/UX
- [x] GPT-4o 기반 AI 분석 (요약·키워드·감정·응원 카드)
- [x] 감정 통계 시각화 & 갤러리 모드
- [x] AI 에이전트 + 독립형 운세/타로 분리
- [x] 타로 3장 스프레드 + DALL-E 3 카드 이미지 생성
- [x] AI 일기 제목 자동 추천
- [x] 감정 히트맵 캘린더
- [x] 스트릭 뱃지 시스템 (🌱🔥⭐👑)
- [x] SNS 공유 카드 (PNG 다운로드)
- [x] 🍯 감정 믹서 (Mood Mixer) & 고유 컬러 생성
- [x] Google 소셜 로그인 (NextAuth.js)
- [x] 웹/모바일(iOS) 반응형 레이아웃 최적화
- [ ] 모바일 앱 패키징 (Capacitor/React Native)

---

© 2026 HaruLog. All rights fluffy. ☁️ ✨
