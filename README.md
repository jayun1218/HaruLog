# ☁️ HaruLog (하루로그)

> **"너의 하루를 몽글몽글하게 기록해봐"**  
> 음성으로 하루를 기록하고, AI가 감정을 분석해 나만의 마음 데이터를 만들어주는 일기 서비스입니다.

---

## ✨ 주요 기능

### 일기 작성
| 기능 | 설명 |
|---|---|
| 🎤 **실시간 음성 인식** | Web Speech API로 말하는 즉시 텍스트 입력 |
| 🗓️ **날짜 선택** | 오늘 이전 날짜로 놓친 일기 작성 가능 |
| 😊 **기분 이모지 선택** | 오늘 기분을 이모지로 직접 태그 |
| 📁 **카테고리 분류** | 카테고리 추가/삭제 (삭제 시 소속 일기 cascade 삭제) |
| 📷 **이미지 첨부** | 일기에 사진 첨부 |

### 기록 보기
| 기능 | 설명 |
|---|---|
| 📅 **달력형 뷰** | 일기 있는 날에 기분 이모지 표시, 클릭으로 상세 확인 |
| 🔍 **검색 · 필터** | 키워드 검색 및 카테고리 필터 |
| 📌 **즐겨찾기 고정** | 핀 토글로 중요 일기 최상단 고정 |
| 🔒 **일기 잠금** | PIN으로 특정 일기 잠금/해제 |
| 🤗 **AI 대화** | 일기 내용을 바탕으로 AI와 채팅 |

### 분석 · 통계
| 기능 | 설명 |
|---|---|
| 🤖 **AI 자동 분석** | 저장 시 GPT-4o가 요약 · 감정 점수 · 잘한 일 · 개선점 생성 |
| 📊 **감정 흐름 그래프** | 날짜별 감정 점수 SVG 선 그래프 시각화 |
| 💌 **AI 월간 리포트** | 한 달 일기를 GPT가 종합 분석 |
| 🔥 **연속 기록 스트릭** | 연속 작성 일수 홈 화면 표시 |

### 편의 기능
| 기능 | 설명 |
|---|---|
| 🌙 **다크 모드** | 토글 버튼으로 전환, localStorage 유지 |
| 🔔 **리마인더** | 브라우저 알림으로 매일 일기 작성 알림 |

---

## 🛠 기술 스택

**Frontend**: Next.js 16 (App Router) · Tailwind CSS · Web Speech API  
**Backend**: Python · FastAPI · PostgreSQL (SQLAlchemy ORM)  
**AI**: OpenAI GPT-4o (분석 · 요약 · 대화 · 리포트) · Whisper-1 (STT 옵션)  
**인프라**: Docker Compose

---

## 🚀 시작하기

### 1. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하세요:
```env
OPENAI_API_KEY=sk-...         # AI 기능에 필요 (없으면 분석 생략)
```

### 2. Docker로 실행
```bash
docker-compose up --build
```
- **웹 앱**: [http://localhost:3000](http://localhost:3000)
- **API 문서**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. 데이터 초기화
```bash
docker-compose down -v && rm -rf ./data/postgres && docker-compose up --build
```

---

## 📂 프로젝트 구조

```
HaruLog/
├── frontend/src/app/
│   ├── page.tsx              # 홈 (스트릭, 다크모드, 메뉴)
│   ├── diary/write/          # 일기 작성
│   ├── diary/list/           # 달력형 기록 뷰
│   ├── diary/[id]/chat/      # AI 대화형 일기
│   ├── statistics/           # 감정 통계 + 흐름 그래프
│   └── report/               # AI 월간 리포트
├── backend/app/
│   ├── api.py                # API 라우터
│   ├── models.py             # DB 모델
│   └── schemas.py            # Pydantic 스키마
├── data/                     # PostgreSQL 볼륨
└── docker-compose.yml
```

---

## 📅 로드맵
- [x] 실시간 음성 인식 · 날짜 선택 · 기분 이모지
- [x] 카테고리 분류 · 이미지 첨부 · 일기 잠금(PIN)
- [x] GPT-4o 감정 분석 · 월간 리포트 · AI 대화
- [x] 달력형 뷰 · 검색 · 즐겨찾기
- [x] 감정 흐름 그래프 · 스트릭 · 다크모드 · 리마인더
- [ ] 소셜 로그인 (Auth.js v5 예정)
- [ ] 모바일 앱 (React Native 예정)

---

© 2026 HaruLog. All rights fluffy. ☁️
