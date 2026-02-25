# ☁️ HaruLog (하루로그)

> **"너의 하루를 몽글몽글하게 기록해봐"**  
> 음성으로 하루를 기록하고, AI가 감정을 분석해 나만의 마음 데이터를 만들어주는 일기 서비스입니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|---|---|
| 🎤 **실시간 음성 인식** | Web Speech API로 말하는 즉시 텍스트 입력 (Chrome/Edge/Safari 지원) |
| 🗓️ **날짜 선택 일기 작성** | 오늘 이전 날짜를 선택해 놓친 일기도 작성 가능 |
| 📁 **카테고리 관리** | 카테고리 추가/삭제, 삭제 시 소속 일기 함께 삭제 |
| 🤖 **AI 자동 분석** | 저장 시 GPT-4o가 한국어로 요약 · 감정 점수 · 잘한 일 3가지 · 개선점 생성 |
| � **달력형 기록 뷰** | 월간 달력에서 일기 있는 날에 감정 이모지 표시, 날짜 클릭으로 상세 확인 |
| 📊 **마음 통계** | 감정 분포 시각화 및 최근 긍정 순간 모음 |

---

## 🛠 기술 스택

**Frontend**: Next.js 16 (App Router) · Tailwind CSS · Web Speech API  
**Backend**: Python · FastAPI · PostgreSQL (SQLAlchemy ORM)  
**AI**: OpenAI GPT-4o (감정 분석 · 요약) · Whisper-1 (STT 옵션)  
**인프라**: Docker Compose

---

## 🚀 시작하기

### 1. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하세요:
```env
OPENAI_API_KEY=sk-...         # AI 분석 기능에 필요 (없으면 분석 생략)
NEXTAUTH_SECRET=원하는_시크릿  # 추후 소셜 로그인용
```

### 2. Docker로 실행
```bash
docker-compose up --build
```
- **웹 앱**: [http://localhost:3000](http://localhost:3000)
- **API 문서**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. 데이터 초기화
```bash
docker-compose down -v
rm -rf ./data/postgres
docker-compose up --build
```

---

## 📂 프로젝트 구조

```
HaruLog/
├── frontend/src/app/
│   ├── page.tsx              # 메인 홈
│   ├── diary/write/          # 일기 작성 (날짜 선택 + 음성 인식)
│   ├── diary/list/           # 달력형 기록 뷰
│   └── statistics/           # 마음 통계
├── backend/app/
│   ├── api.py                # API 라우터
│   ├── models.py             # DB 모델
│   └── schemas.py            # Pydantic 스키마
├── data/                     # PostgreSQL 볼륨
└── docker-compose.yml
```

---

## 📅 로드맵
- [x] 실시간 음성 인식 및 일기 저장
- [x] 날짜 선택 일기 작성 (과거 날짜 지원)
- [x] 카테고리 분류 및 cascade 삭제
- [x] GPT-4o 한국어 감정 분석 (요약 · 감정 · 잘한 일 · 개선점)
- [x] 달력형 기록 뷰 (감정 이모지 · 날짜 클릭 상세)
- [x] 감정 통계 시각화
- [ ] 소셜 로그인 (Auth.js v5 적용 예정)
- [ ] 주간/월간 멘탈 리포트 내보내기

---

© 2026 HaruLog. All rights fluffy. ☁️
