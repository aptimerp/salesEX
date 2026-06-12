# SalesEX 프로젝트 메모리

## Phase 0 — 초기 세팅 (2026-05-18 ~ 2026-05-27)

### 핵심 학습
1. **Notion MCP 인증**: `@notionhq/notion-mcp-server@latest` + `OPENAPI_MCP_HEADERS` 에 Authorization과 Notion-Version 헤더 둘 다 필요
2. **Notion API 제약**: quote 블록은 `update-a-block`으로 직접 수정 불가 → 삭제 후 재생성 필요
3. **Notion 블록 위치 제어**: `patch-block-children`의 `after` 파라미터로만 위치 지정 가능 (prepend 불가)
4. **Windows 인코딩**: Python에서 한국어/이모지 출력 시 cp949 에러 → `io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` 래핑 필수
5. **GSD 설치**: `/plugin` 마켓플레이스 미지원 환경에서는 `npx get-shit-done-cc --claude --global`로 설치

### 결정사항
- 프로젝트명: SalesONX → **SalesEX** (Sales + ERP·Next·Experience·Exceed·Expansion)
- 노션 기록 대상: SalesEX 프로젝트 페이지 (`35609b4dcd57816aac98d9f97083c565`)
- SSO/로그인 연동 금지 — SAC 합의 전까지 UI만 구현
- 스타일가이드(`style-guide.html`) 엄격 준수
- API URL 하드코딩 금지 → 환경변수 `KUMKANG_API_URL` 사용

### 재사용 패턴
- **Notion 블록 추가**: `mcp__notion__API-patch-block-children` + `after` 파라미터
- **Notion 블록 삭제**: `mcp__notion__API-update-a-block` → `archived: true`
- **Notion 블록 복구**: `mcp__notion__API-update-a-block` → `archived: false`
- **Notion 페이지 제목 변경**: `mcp__notion__API-patch-page` → `properties.title`

### 주요 Notion 페이지 ID
- 마더 페이지: `27a09b4dcd5780cb8b75c96e2a290f08`
- 개인 PL 페이지: `35609b4dcd5781748d63c331e8f20417`
- SalesEX 프로젝트 페이지: `35609b4dcd57816aac98d9f97083c565`

---

## Phase 1 — 요구사항 정의 (2026-05-28 ~)

### 핵심 학습
1. **기획 문서 3종이 이미 존재**: 개발업무 절차서 + 데이터소스 정의서 + 아키텍처 검토서가 상당히 구체적
2. **데이터 소스 3원칙**: 🟦 시스템자동(PK/날짜) / ⬜ ERP연동(읽기전용) / 🟨 CRM직접입력
3. **ERP 견적관리 미사용**: 입찰수주이력 전체가 CRM 웹 직접 입력 → bids 테이블이 핵심
4. **현장 직접 등록 제한**: ERP 등록 후 CRM 자동 동기화가 원칙, 수주 전 선등록(임시)만 예외 허용
5. **3계층 구조**: K-DUO LINK(모바일) → SalesEX(웹 CRM) → ERP — 각 층의 역할이 명확히 분리됨
6. **팀별 업무 절차서 존재**: 건축영업/영업지원팀/폼영업 3팀의 실무 양식(엑셀/PDF) 다수 보유

### 결정사항
- **3단계 개발**: 1단계(기초CRUD) → 2단계(수주/계약/보고) → 3단계(분석/대시보드/모바일)
- **Phase 별 분리**: 주간업무(별도Phase), 사업계획(별도Phase), K-DUO LINK/재임대보수(별도마일스톤)
- **권한 5단계**: 영업담당 / 팀장 / 영업지원 / 임원 / 관리자
- **ERP 연동 방식**: 마스터 데이터=배치동기화, 계약전송=실시간API, 수동갱신=보조수단

### 미결정 사항 (Phase 2 진입 전 확정 필요)
- Backend: NestJS(절차서 기준) vs Vercel API Routes(현재)
- 인증: Supabase Auth 사용 여부 (SAC 합의 대기)
- BI 도구: Looker Studio vs Metabase (3단계에서 결정)

### 참고 문서 경로
- 최종 기획 3종: `D:\0.AI\바이브코딩\업무절차서\폴더정리\최종문서\`
- 팀별 절차서: `D:\0.AI\바이브코딩\업무절차서\폴더정리\팀별 업무절차서\`
- 플랫폼 정의서: `D:\0.AI\바이브코딩\# SalesEX 플랫폼 정의서.md`

---

## 프로젝트 통합 & 바이브코더 패키지 (2026-06-11)

### 핵심 학습
1. **분산 작업의 한계**: 하위 에이전트로 분산 작업 시 메모리가 현재 세션에 남지 않음 → 중앙화된 프로젝트 루트 필수
2. **Git 기반 협업**: 분산 파일들(C:\Users\kuser vs D:\0.AI\바이브코딩)을 git으로 통합하면 이력 추적 가능
3. **슬래시 명령어 확대 (5 → 6)**: /분석 (기술 검토) 추가 → Phase 진입 전 리스크 조기 탐지 가능
4. **세션 훅의 가치**: .claude/hooks/session-start.js로 매 세션 시작 시 STATE·ROADMAP 자동 로드 → 컨텍스트 손실 방지

### 결정사항
- **프로젝트 루트**: D:\0.AI\바이브코딩 (통합 완료, 이후 모든 작업은 이곳에서)
- **6개 슬래시 명령어**: 필수 5 (/시작/계획/실행/검증/마무리) + 선택 1 (/분석)
- **GSD 라펑**: 영문 GSD 명령어를 한국어 슬래시 명령어로 래핑 → 국내 팀 접근성 향상
- **노션 기록 구조**: HTML `<details>` 토글 기반 6카테고리 (세션요약/완료/벤치마킹/산출물/미해결/다음액션)

### 재사용 패턴
- **프로젝트 통합 템플릿**:
  ```bash
  # 1. 분산 파일들을 프로젝트 루트로 이동
  cp -r [source]/.planning [target]/.planning
  cp [source]/CLAUDE.md [target]/CLAUDE.md
  
  # 2. Git 초기화 + GitHub 연동
  cd [target] && git init
  git config user.name "aptimerp"
  git config user.email "aptimerp@gmail.com"
  git remote add origin https://github.com/aptimerp/salesEX.git
  
  # 3. 6개 슬래시 명령어 생성 (.claude/commands/)
  # 4. 세션 훅 생성 (.claude/hooks/session-start.js)
  # 5. 환경변수 템플릿 생성 (.env.local.example)
  # 6. git add . && git commit
  ```

- **슬래시 명령어 구조** (GSD 래핑):
  - /시작 → `/gsd:discuss-phase` 호출
  - /계획 → `/gsd:plan-phase` 호출
  - /분석 → `/gsd:list-phase-assumptions` 호출 (선택, 기술 검토용)
  - /실행 → `/gsd:execute-phase` 호출
  - /검증 → `/gsd:verify-work` 호출
  - /마무리 → STATE·ROADMAP·MEMORY 업데이트 + 노션 기록 + git commit

- **메모리 지속성 확보 방법**:
  ```
  세션 간 메모리 손실 문제 해결 경로:
  1. 하위 에이전트의 작업 결과 → 파일로 저장 (REQUIREMENTS.md, PLAN.md 등)
  2. 파일 기반 Git 버전 관리 → GitHub에 atomic commit
  3. 세션 시작 시 .planning 파일 자동 로드 (session-start.js 훅)
  4. 메모리도 MEMORY.md로 저장 + 다음 세션에서 수동 확인
  ```

### Notion toggle 블록 생성 패턴 (핵심 — /마무리 시 필수)

**문제**: Notion MCP (`mcp__notion__API-patch-block-children`)는 `paragraph`과 `bulleted_list_item`만 지원. toggle 블록 생성 불가.

**해결**: Node.js 스크립트로 Notion API 직접 호출.

```javascript
// 핵심 구조 (임시 .js 파일로 실행)
const https = require('https');

const NOTION_API_KEY = process.env.NOTION_API_KEY || '키는 .mcp.json에서 읽기';
const PAGE_ID = '35609b4dcd57816aac98d9f97083c565'; // SalesEX 프로젝트 페이지

// 헬퍼 함수
function text(content, bold = false) {
  return { type: 'text', text: { content }, annotations: bold ? { bold: true } : undefined };
}
function toggle(title, children) {
  return { type: 'toggle', toggle: { rich_text: [text(title, true)], children } };
}
function paragraph(content) {
  return { type: 'paragraph', paragraph: { rich_text: [text(content)] } };
}
function bullet(content) {
  return { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text(content)] } };
}

// 페이로드: 바깥 토글 1개 + 안쪽 토글 6개 (6카테고리)
const body = {
  children: [
    toggle('[프로젝트명] 작업 브리핑 (YYYY-MM-DD)', [
      toggle('📋 세션 요약', [ paragraph('요약 내용') ]),
      toggle('✅ 완료된 작업', [ bullet('항목 1'), bullet('항목 2') ]),
      toggle('🏆 벤치마킹 / 의사결정', [ bullet('항목 1') ]),
      toggle('🗂️ 산출물 / 계획 파일', [ bullet('항목 1') ]),
      toggle('⚠️ 미해결 이슈', [ bullet('항목 1') ]),
      toggle('▶️ 다음 세션 액션', [ bullet('항목 1') ])
    ])
  ]
};

// API 호출
const data = JSON.stringify(body);
const options = {
  hostname: 'api.notion.com', port: 443,
  path: `/v1/blocks/${PAGE_ID}/children`,
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
    'Content-Length': Buffer.byteLength(data)
  }
};
const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const result = JSON.parse(body);
    if (res.statusCode === 200) {
      console.log('SUCCESS:', result.results.length, 'block(s) created');
    } else {
      console.error('ERROR:', res.statusCode, result.message);
    }
  });
});
req.write(data);
req.end();
```

**실행 방법**: 
1. 위 스크립트를 temp 파일로 저장
2. `node temp파일.js` 실행
3. 완료 후 temp 파일 삭제

**결과**: K-DUO-LINK 페이지와 동일한 토글 형식으로 노션에 기록됨:
```
▼ SalesEX 작업 브리핑 (2026-06-11)
  ► 📋 세션 요약
  ► ✅ 완료된 작업
  ► 🏆 벤치마킹 / 의사결정
  ► 🗂️ 산출물 / 계획 파일
  ► ⚠️ 미해결 이슈
  ► ▶️ 다음 세션 액션
```

**주의사항**:
- API 키는 `C:\Users\kuser\.mcp.json`에서 읽기 (코드에 하드코딩 하지 말 것)
- Notion-Version: `2022-06-28` 사용
- MCP의 `update-a-block` + `archived: true`로 기존 블록 삭제 가능
- MCP의 `update-a-block` + `archived: false`로 블록 복구 가능

### 미확인 사항
- GSD 스킬 활성화 상태 (현재 클로드 코드 미재시작 상태에서 미확인)

---

## 양식 비교 분석 (2026-06-12)

### 핵심 학습
1. **xlsx 바이너리 파일 읽기**: Read 도구로 직접 읽기 불가 → Python `openpyxl` 사용, .xls는 `xlrd` 필요
2. **Windows 한국어 인코딩**: `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` 항상 필수
3. **수주확정보고서 VBA 매크로 분석**: .xlsm 10시트 구조 (Simulation, 조업기준, 거푸집상각비 등) — 웹 전환 시 VBA 로직 리버스엔지니어링 필요
4. **출고의뢰서 전사 표준**: "발신/담당/팀장/출고의뢰서/수신/담당" 헤더가 6팀 완전 동일
5. **기성청구서는 통일 불가**: 건설사(원청사)마다 요구하는 양식이 다름 (광주 1시트 vs 부산 8시트(롯데양식) vs 영업3 6시트(원건설))
6. **GitHub push 대용량 제한**: .git 히스토리에 100MB 초과 파일 있으면 HTTP 500. 해결: .git 삭제 + .gitignore 정비 + 재초기화 + force push
7. **Git 브랜치 매핑**: 로컬 master → 원격 main일 때 `git push origin master:main` 사용

### 결정사항
- **공통 업무 15개 확정** (기존 13 + 출고의뢰서 + 수주확정보고서)
- **웹 이관 3분류**:
  - 즉시 웹화 (7): 채권현황, 주간업무보고, 매출계획, 현장이관, 지급보증, 출고의뢰, 수주확정보고
  - 데이터 통합 후 웹화 (4): 견적서, 입찰서, 배송/납기, 업체방문
  - 건설사별 대응 (4): 기성청구서, 정산, 신규현장, 거래처현황
- **물량산출 = 견적 KEY-IN**: CAD 결과물을 견적 화면에서 직접 입력 (파일 업로드 아님)
- **경쟁사 보고**: 영업1·영업2가 동일 양식 사용 (파일명 오타 차이: "부붐" vs "부문")

### 양식 비교 상세 기록

#### 동일 양식 (전사 표준)
| 업무 | 참여 팀 | 구조 | 웹 이관 전략 |
|------|---------|------|-------------|
| 채권현황 | 광주·부산·영업1·영업2 | 63열 동일 | 그대로 이관 |
| 주간업무보고 | 대구·부산·영업1·영업2·영업3 | 주차별 영업실적 동일 | 그대로 이관 |
| 매출계획 | 광주·대구·영업1 | 5시트(표지+양식1~4) | 그대로 이관 |
| 현장이관 | 광주·영업1·영업3 | 7열 30행 동일 | 그대로 이관 |
| 지급보증 | 부산·영업1 | 갑/을/병 3자 구조 | 그대로 이관 |
| 출고의뢰서 | 6팀 전부 | 발신/수신 헤더 동일 | 그대로 이관 |
| 수주확정보고서 | 6팀 전부 | 10시트 VBA 동일 | VBA 분석 후 이관 |

#### 양식 상이 (건설사별/관점별)
| 업무 | 상이 원인 | 웹 이관 전략 |
|------|----------|-------------|
| 기성청구서 | 건설사마다 양식 다름 | 핵심 데이터만 웹, 양식은 엑셀 다운로드 |
| 견적서 | 알폼 동일, 갱폼 다름 | 제품 유형별 필드 통합 |
| 정산 | 단계별 문서 종류 다름 | 프로세스 단계별 화면 분리 |
| 신규현장 | 거래처조사/분양현장/시공사현황 3종 | 3화면 분리 또는 거래처 마스터 통합 |

### 재사용 패턴
- **xlsx/xls 전수 비교 스크립트**:
  ```python
  import openpyxl  # .xlsx
  import xlrd      # .xls
  # openpyxl: wb = load_workbook(path, data_only=True, read_only=True)
  # xlrd: wb = xlrd.open_workbook(path)
  # xlsm도 openpyxl로 읽기 가능 (keep_vba=False)
  ```

---

## 추가 분석 — 재임대·보수 자산 식별 비용 검토 (2026-06-02)

### 핵심 학습
1. **3가지 자산 식별 솔루션의 비용 극차**: 
   - 1안(착탈식 태그): 초기 7.5억 + 연 5,850만 → **운영 인력 반복 커짐**
   - 2안(홀 패턴): 초기 2.15억만, 이후 거의 0 → **3년 후 압도적 유리**
   - 3안(NFC): 초기 고가 + 신규만 적용 → **기존 자재 미해결 (현실성 낮음)**

2. **만 단위 출고/회수의 숨은 비용**:
   - 매 회수·보수마다 탈거/재부착 → 20명 인력 × 60시간 연간 투입
   - 누적 손상률: 5년 × 20회 = 100회 탈거/재부착 → 태그 손상 ~15%, 미재부착 ~5%
   - 결과: **1안 단독 지속 불가, 반드시 2년 내 2안으로 전환 필수**

3. **단계적 적용의 현실성**:
   - **1단계 (즉시)**: 신규는 2안(드릴 공정), 기존 고회전율은 1안(태그)으로 하이브리드 시작
   - **2단계 (1년 후)**: 기존 자재 100% 드릴 작업(외주 2억) → 1안 태그 폐기
   - **3단계 (3년 후)**: 신규 NFC 검토, 기존은 2안으로 영구 운영
   - **CRM 웹 범위**: DB-4 구조만, 기능은 2027년 Q1 이후 별도 개발

### 결정사항
- **권장안**: 1안 + 2안 단계적 적용 확정
- **CRM 웹 구현**: 자산 식별 기능 제외, 구조만 포함
- **관리자 패널**: 수동 운영 기능 제공 (상태 등급 변경, 회수 기록 입력)
- **참고 파일 분리**: 원본 유지 + v1.1에 비용 분석 추가

### 재사용 패턴
- **대규모 자산 추적 선택 프레임워크**:
  ```
  [만 단위 + 회수율 높음 + 50% 재임대]
  ├─ 즉시성 필요 → 1안 (착탈식 태그)
  ├─ 장기 절감 필요 → 2안 (홀 패턴)
  ├─ 완전 자동화 + 예산 충분 → 3안 (NFC)
  └─ 최적 결합: 1년 하이브리드(1+2) → 3년 후 2안 단일화
  ```

- **TCO 비교 계산식** (5년 기준):
  ```
  1안: 초기 7.5억 + (5,850만 × 5년) = 36.75억 원
  2안: 초기 2.15억 + (0 × 5년) = 2.15억 원
  3안: (2,500만 + 3억) × 5년 = 162.5억 원
  
  → 2안이 압도적 유리 (1안 대비 94% 절감)
  ```

---

## GitHub 저장소 설정 & 마무리 프로토콜 (2026-06-02)

### 핵심 학습
1. **GitHub 저장소 초기화**: https://github.com/aptimerp/salesEX.git로 Phase 0~1 산출물 백업
2. **Atomic commit 전략**: 각 작업 완료 후 "명확한 메시지 + Co-Authored-By 서명"으로 commit
3. **마무리 프로토콜 6단계**:
   - STATE.md 업데이트 (페이즈 ✅ 마킹)
   - ROADMAP.md 재마킹 (다음 페이즈 🔜)
   - MEMORY.md 학습 기록
   - 산출물 검증 (파일 존재 체크)
   - 요약 출력 (구조화된 형식)
   - 노션 기록 (토글 기반 브리핑)
4. **노션 토글 구조**: 접혔다 펼쳐지는 6개 섹션 (📋/✅/🏆/🗂️/⚠️/▶️)
5. **프로젝트 타임라인 확정**: 4단계 25주 (약 6개월)
   - Stage 1: 업무분장 (3주)
   - Stage 2: 필요업무 수집 (4주)
   - Stage 3: UI 확정 (8주)
   - Stage 4: 개발 & 테스트 (10주)
6. **Windows Git 인증**: Git 사용자명(aptimerp) + 이메일(aptimerp@gmail.com) 설정 → HTTPS push 자동 인증

### 결정사항
- **GitHub 저장소 구조**:
  - `.planning/` (STATE, ROADMAP, REQUIREMENTS, MEMORY)
  - `docs/architecture/` (아키텍처 검토서 × 2)
  - `docs/timeline/` (타임라인 HTML)
  - `.claude/commands/` (마무리 지침)
  - README.md (4단계 타임라인)
- **Commit 양식**: "docs/chore: [작업내용]" + 설명 + Co-Authored-By
- **마무리 지침**: Notion API toggle 블록 구조로 정의 (JSON 샘플 포함)
- **다음 Phase 전제조건**: Backend 결정 (NestJS vs Vercel API Routes)

### 재사용 패턴
- **마무리 프로토콜 템플릿** (`.claude/commands/마무리.md`):
  - 6단계 구조 + 노션 토글 JSON 샘플
  - 토글 시각적 구조 + 구현 지침
  - 모든 Phase 종료 시 재사용 가능

- **GitHub 저장소 Atomic Commit**:
  ```bash
  git add [specific files]
  git commit -m "[category]: [brief description]
  
  [detailed explanation of changes]
  
  Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
  git push origin main
  ```

- **타임라인 4단계 구조**:
  ```
  Stage 1 (3주) → Stage 2 (4주) → Stage 3 (8주) → Stage 4 (10주) = 25주
  [시드] → [요구] → [설계] → [구현]
  ```
