# 프로젝트 컨텍스트

## 회사
- 회사명: 금강공업
- 사업 영역: 건축·산업설비 제조

## ERP Track 2 팀 구성 (AI가 알아야 할 존칭·역할)

### 이노베이터 그룹
- **PM**: 홍세민 — 이노베이터 총괄 매니저 · 공용 계정·인프라 운영 책임
- **이노베이터 7기**: 금강 사내 일반 직원 60명 (📝 개인 자격 참여)
  - 사용 도구: 안티그래비티 (Free 또는 Pro 자율)

### 바이브코더 (선정 PL 4명)
이노베이터 중 선정된 프로젝트 리더. 신규 서비스 직접 빌드 책임.
- **홍세민 PM** — 이노베이터 PM 겸직
- **오흥철 PL** — SalesEX 주축
- **장한나 PL** — 프로젝트 진행
- **김은지 PL** — 프로젝트 진행
- **염용래 PL** — 프로젝트 진행
- 사용 도구: 클로드 코드 + 안티그래비티 자유 활용
- 담당 환경: Vercel + Supabase (공용 계정)

### SAC (System Automation Center) ERP Track 2
기존 ERP 운영 + 대외 API 제공 책임. 정규 개발자 그룹.
- **총괄**: 이용철 부장 — SAC 부산 부장 · ERP Track 2 전체 기술 총괄
- **API 담당**: 이영호 차장 — Playground + API 환경 운영

## 역할 구분
- 바이브코더 = 신규 서비스 구축 (Vercel/Supabase 영역)
- SAC = 기존 ERP 운영 + API 제공 (MSSQL/사내 서버 영역)
- 두 영역을 이어주는 것 = API 계약 (필요 서비스만 국한)

## ERP 환경
- DB 엔진: MSSQL 2022 (Always On AG)
- 아키텍처: CS 클라이언트 + Vercel/Supabase 하이브리드
- 신규 서비스 DB: Supabase (PostgreSQL)
- 신규 서비스 프론트: Next.js (Vercel)

## 도메인 용어 (필수 숙지)
- **수불**: 입출고 관리 (입고·출고·재고 흐름)
- **전표**: 회계 거래 기록 단위
- **KKV**: [회사 내부 정의 — 추후 채워주세요]
- **DLS**: 모바일 ERP 시스템
- **언양**: 언양 공장 (수불 별도 운용)
- **POP**: 생산 정보 시스템 (ORACLE DB 기반)

## DB 패턴 (금강 ERP 특화)
- **Detail 14개 테이블 구조**: 메인 + 14개 상세 테이블 패턴
- **KV 테이블**: chatbot_details 등 키-값 형태
- **배열·JSON 정책**:
  - MSSQL: 배열 컬럼 금지 → 정규화 테이블 사용
  - Supabase: JSONB 허용 (단, 검색 필드는 컬럼으로 분리)

## 금강 API 연결
- 운영 URL: KUMKANG_API_URL 환경변수로만 사용 (코드에 직접 하드코딩 금지)
- 인증: KUMKANG_API_KEY (서버 측에서만 사용, 클라이언트 노출 금지)
- 호출 경로: 클라이언트 → Vercel API Routes → 금강 API
- 접근 원칙: 필요한 서비스 API만 호출 (전체 래핑 X)

## 담당 프로젝트
- **프로젝트명**: SalesEX
- **설명**: 현업 영업 흐름을 중심으로, 입찰·견적·수주·실적 데이터를 연결하고, ERP의 한계를 넘어서는 차세대 영업 운영 플랫폼 (Sales + ERP·Next·Experience·Exceed·Expansion)
- **담당 PL**: 오흥철
- **이메일**: hcoh@kumkangkind.com
- **GitHub**: github-ohheungchul
- **주 도구**: 클로드 코드
- **구독 플랜**: Pro $20

## UI/디자인 규칙 (SAC-AX 공용)

### 스타일가이드
- **스타일가이드 파일**: `style-guide.html` (프로젝트 루트에 위치)
- 프레임워크: Next.js + TailwindCSS
- **스타일가이드를 엄격히 따르고 토큰 외 값은 쓰지 말 것**
- AI에게 디자인 지시 시 HTML 파일을 직접 전달하는 것이 MD보다 효과적

### 공용 로고
- 파일: `public/Kumkang_Kind_logo.png` (원본 — 크기 줄여서 사용)

### UI 제작 시 주의사항
- **로그인 화면**: UI만 만들고, 로직과 실제 사용자 DB는 연결하지 말 것
- **Google·네이버·카카오 로그인 연동 금지** (SSO 버튼 자체도 넣지 말 것)
- 인증·계정 표준은 추후 SAC와 합의 후 일괄 적용
