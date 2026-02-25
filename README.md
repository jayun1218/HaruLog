# ☁️ HaruLog (하루로그)

> **"너의 하루를 몽글몽글하게 기록해봐"**  
> 사용자의 하루 감정과 생각을 음성 기반으로 기록하고, AI 분석을 통해 나의 마음 상태를 데이터로 시각화하는 멘탈 관리 서비스입니다.

---

## ✨ 핵심 기능 (Features)

### 1. 🎤 음성 기반 하루 기록 (Self-Discovery)
- **자유로운 기록**: 텍스트 입력은 물론, 마이크 기능을 통해 말로 편하게 하루를 정리할 수 있습니다.
- **Whisper STT**: OpenAI의 Whisper API를 탑재하여 한국어 음성을 높은 정확도로 텍스트로 변환합니다.

### 2. 🤖 AI 감정 및 패턴 분석 (Insight)
- **자동 요약**: 일기 전체 내용을 AI가 1~2줄로 명확하게 요약해줍니다.
- **감정 스코어링**: 기쁨, 슬픔, 불안, 분노, 평온 등 5가지 주요 감정 점수를 데이터화합니다.
- **긍정 인식 강화**: 일기 속에서 내가 오늘 잘했던 일 3가지를 AI가 찾아내어 칭찬해줍니다.

### 3. 📊 내 마음 데이터 시각화 (Visualization)
- **감정 통계**: 최근 내가 어떤 감정을 주로 느꼈는지 차트로 보여줍니다.
- **기록 저장소**: 과거의 기록들을 AI 요약과 함께 한눈에 모아볼 수 있습니다.

---

## 🛠 기술 스택 (Tech Stack)

### Frontend
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Interactions**: React Hooks & Web Media API

### Backend
- **Language**: Python (FastAPI)
- **Database**: PostgreSQL (SQLAlchemy ORM)
- **Proxy**: Docker Compose

### AI Engine
- **Speech-to-Text**: OpenAI Whisper-1
- **Analysis**: OpenAI GPT-4o

---

## 🚀 시작하기 (Getting Started)

### 1. 환경 변수 설정
`backend` 디렉토리에 `.env` 파일을 생성하거나 환경 변수에 다음을 추가하세요:
```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://user:password@db:5432/mindtrace
```

### 2. Docker로 한 번에 실행 (추천)
루트 디렉토리에서 다음 명령어를 입력하세요:
```bash
docker-compose up --build
```
실행 후 다음 링크로 접속 가능합니다:
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📂 프로젝트 구조 (Structure)

```text
HaruLog/
├── frontend/          # Next.js 프론트엔드
│   └── src/app/       # 페이지 및 컴포넌트
├── backend/           # FastAPI 백엔드
│   └── app/           # API 로직 및 모델
├── data/              # DB 데이터 볼륨 (Docker)
└── docker-compose.yml # 컨테이너 오케스트레이션
```

---

## 📅 프로젝트 로드맵
- [x] MVP: 음성 인식 및 기본 일기 저장 기능
- [x] MVP: GPT 기반 감정 분석 및 통계 대시보드
- [ ] 확장: 주간/월간 멘탈 리포트 PDF 생성
- [ ] 확장: 소셜 공유 및 알림 서비스

---
© 2026 HaruLog. All rights fluffy.
