# SalesEX 웹페이지 ↔ ERD 테이블 매핑

> 작성일: 2026-06-15
> 기준: ERD 정의서 v2.0 rev.1 + 데이터소스 입력흐름 정의서 v1.1 + 양식비교 15개 공통업무
> 범례: C=Create, R=Read, U=Update, D=Delete

---

## 데이터소스 분류

| 기호 | 소스 | 설명 |
|------|------|------|
| 🔵 | Supabase 직접 | SalesEX/K-DUO-LINK 공유 DB에서 직접 CRUD |
| 🟡 | 전자결재 추적 | 그룹웨어 결재 상태만 조회/갱신 (양식은 그룹웨어) |
| ⚪ | ERP API | KUMKANG_API_URL 통해 읽기 전용 조회 |
| 🟢 | 집계/계산 | 기존 테이블 데이터를 집계·계산하여 표시 |

---

## 1. Dashboard

| 영역 | 테이블 | 조작 | 소스 | 표시 데이터 |
|------|--------|------|------|------------|
| 수주 현황 | orders | R | 🔵 | 금월 수주건수·금액, 전월 대비 |
| 입찰 현황 | bids | R | 🔵 | 진행중 입찰건수, 결과대기 |
| 영업활동 | meeting_logs | R | 🔵 | 금주 방문·상담 건수 |
| 목표달성률 | kpi_snapshots | R | 🔵 | 수주율, 목표대비 달성% |
| 전자결재 미발행 | approval_tracking | R | 🟡 | 미발행 건수 알림 |
| 미수금 요약 | receivables | R | 🔵 | 위험/주의 현장 수 |

---

## 2. 사업계획

| 페이지 | 테이블 | 조작 | 소스 | 주요 필드 |
|--------|--------|------|------|----------|
| 연간계획 등록 | business_plans | CRUD | 🔵 | year, user_id, team, product_group, target_order/sales/profit |
| 월별계획 | business_plans | CRUD | 🔵 | month별 필터, 동일 테이블 |
| 실적 대비 | business_plans + orders | R | 🟢 | 계획 vs 실적(orders 집계) 비교 |

---

## 3. 영업관리

### 3-1. 거래처

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 거래처 목록 | companies | R | 🔵 | 전체 목록 (erp_company_code 유무로 ERP등록 구분) |
| 거래처 상세 | companies | R | 🔵 | 기본정보 + 소속 담당자 + 관련 현장 |
| 신규 등록 | companies | C | 🔵 | K-DUO-LINK 앱에서 주로 등록, 웹에서도 가능 |
| ERP 연계 거래처 | companies (erp_company_code≠NULL) | R | 🔵+⚪ | ERP 거래처정보 보강 조회 |

> **입력 채널**: K-DUO-LINK 명함 OCR(주) / SalesEX 웹 직접 등록(부)
> **ERP 연계**: 수주확정 시 erp_company_code 자동 부여

### 3-2. 담당자

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 담당자 목록 | contacts | R | 🔵 | 거래처별 필터, 태그(본사/현장) 필터 |
| 담당자 상세 | contacts + meeting_logs | R | 🔵 | 기본정보 + 해당 담당자 영업활동 이력 |
| 등록/수정 | contacts | CU | 🔵 | K-DUO-LINK 앱에서 주로 등록 |

> **입력 채널**: K-DUO-LINK 명함 OCR(주) / SalesEX 웹(부)

### 3-3. 현장

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 현장 목록 | projects | R | 🔵 | type 필터(수주현장/견적현장), status 필터 |
| 현장 상세 | projects + orders + approval_tracking | R | 🔵+🟡 | 기본정보 + 수주상태 + 전자결재상태 |
| 현장 등록/수정 | projects | CU | 🔵 | 앱/웹 양쪽에서 등록 가능 |
| 현장 타임라인 | projects + meeting_logs + bids + orders | R | 🟢 | 사전영업→현설→입찰→수주 흐름 시각화 |

> **생명주기 표시**: erp_site_code 기준 — NULL(영업중) / 값(ERP등록) / status=closed(종료)

### 3-4. 영업활동

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 활동 목록 | meeting_logs | R | 🔵 | 날짜·유형·현장 필터 |
| 활동 상세 | meeting_logs + meeting_log_action_items | R | 🔵 | 녹음 재생, STT 텍스트, 후속조치 체크 |
| 활동 등록 | meeting_logs + meeting_log_action_items | CU | 🔵 | 웹에서도 직접 등록 가능 |
| 후속조치 관리 | meeting_log_action_items | U | 🔵 | pending→completed 체크 |

> **입력 채널**: K-DUO-LINK 앱(주 — 녹음·STT) / SalesEX 웹(부 — 수동 입력)

### 3-5. 사전영업

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 사전영업 목록 | pre_sales | R | 🔵 | 상태별 필터, 수주가능성 정렬 |
| 사전영업 상세 | pre_sales + projects + competitors | R | 🔵 | 현장정보 + 경쟁현황 + 전략 |
| 등록/수정 | pre_sales | CRU | 🔵 | |

### 3-6. 경쟁사관리

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 경쟁사 목록 | competitors | R | 🔵 | |
| 경쟁사 상세 | competitors + competitor_assets | R | 🔵 | 기본정보 + 자산보유현황 |
| 등록/수정 | competitors + competitor_assets | CRUD | 🔵 | |

---

## 4. 견적관리

### 4-1. 실행견적

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 견적 목록 | quotes | R | 🔵 | 상태·현장·담당자 필터 |
| 견적 작성 | quotes + quote_items | CU | 🔵 | 품목별 수량·단가 입력 (KEY-IN) |
| 견적 상세 | quotes + quote_items + quote_costs | R | 🔵 | 견적서 미리보기 |
| 견적서 출력 | quotes + quote_items | R | 🔵 | PDF/Excel 다운로드 |

> **물량산출(CAD)**: 파일 업로드 아님, 견적 화면에서 KEY-IN 입력

### 4-2. 견적이력

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 버전 비교 | quotes (version_no별) | R | 🔵 | V1↔V2 금액 차이 비교 |
| 변경 이력 | quotes (updated_at 기준) | R | 🔵 | 수정일·수정자·변경사유 |

### 4-3. 원가분석

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 원가 입력 | quote_costs | CU | 🔵 | 제조·물류·현장·기타 원가 |
| 이익률 자동계산 | quote_costs | R | 🟢 | expected_margin 자동 산출 |
| 원가 비교 | quote_costs (여러 견적) | R | 🟢 | 현장별 원가구조 비교 |

---

## 5. 입찰관리

### 5-1. 현설 (현장설명회)

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 현설 목록 | site_briefings | R | 🔵 | 날짜순, 상태 필터 |
| 현설 등록 | site_briefings | CU | 🔵 | 현설일·동수·층수·예상물량 |
| 첨부파일 | attachments (entity_type='site_briefings') | CRD | 🔵 | 도면·시방서·현설자료 |

### 5-2. 입찰

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 입찰 목록 | bids | R | 🔵 | 상태별 필터 (예정/진행/결과) |
| 입찰 등록 | bids | CU | 🔵 | 입찰일·금액·참여업체수 |
| 입찰 결과 | bids + bid_histories | U | 🔵 | 낙찰/탈락 결과 입력 |

### 5-3. 입찰이력

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 차수별 이력 | bid_histories | R | 🔵 | 1차→2차→최종 금액·결과 비교 |
| 경쟁사 분석 | bid_histories | R | 🟢 | 수주경쟁사·실패사유 통계 |

---

## 6. 수주관리

### 6-1. 수주등록

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 수주 목록 | orders | R | 🔵 | 상태별 필터 |
| 수주 등록 | orders + order_items | CU | 🔵 | 입찰 낙찰 → 수주 전환 |
| 수주확정보고서 | order_confirmations | CU | 🔵 | 시뮬레이션 10시트 웹 버전 |
| ERP 전송 | orders | U | 🔵 | erp_transfer_yn=TRUE, 연계 코드 부여 |

> **수주확정 시 자동 처리:**
> 1. companies.erp_company_code 부여
> 2. projects.erp_site_code 부여
> 3. projects.status → 'erp_registered'
> 4. approval_tracking 레코드 생성 (출고의뢰·설계의뢰 = '미발행')

### 6-2. 수주잔고

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 잔고 현황 | orders + receivables | R | 🟢 | 담당자별·팀별·지역별·품목별 집계 |
| 잔고 상세 | orders + vw_delivery_status | R | 🔵+⚪ | 수주금액 - 출고금액 = 잔고 |

### 6-3. 설계의뢰 (전자결재 상태)

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 설계의뢰 현황 | approval_tracking (type='설계의뢰') | R | 🟡 | 미발행/발행/승인 상태 조회 |
| 상태 갱신 | approval_tracking | U | 🟡 | 그룹웨어 결재 완료 시 수동/연동 갱신 |

> **양식 자체는 그룹웨어에서 작성·결재**. SalesEX는 "했는지 안 했는지"만 보여줌.

### 6-4. 출고의뢰 (전자결재 상태)

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 출고의뢰 현황 | approval_tracking (type='출고의뢰') | R | 🟡 | 미발행/발행/승인 상태 조회 |
| 상태 갱신 | approval_tracking | U | 🟡 | 동일 |

---

## 7. 운영관리

> **전체 읽기 전용**. ERP API 호출 → 화면 표시. SalesEX에서 입력 없음.

| 페이지 | VIEW/API | 조작 | 소스 | 주요 필터 |
|--------|----------|------|------|----------|
| 생산현황 | vw_production_status | R | ⚪ | 현장·품목·상태 |
| 출고현황 | vw_delivery_status | R | ⚪ | 현장·품목·날짜 |
| 회수현황 | vw_return_status | R | ⚪ | 현장·품목·상태 |
| 손망실현황 | (TBD - ERP 확인 필요) | R | ⚪ | 현장·품목·정산상태 |
| 임대현황 | vw_inventory_status | R | ⚪ | 품목별 재고·임대·회수 |

---

## 8. 채권관리

### 8-1. 세금계산서현황

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 세금계산서 목록 | vw_tax_invoice_status | R | ⚪ | ERP 데이터 조회 |

### 8-2. 기성청구관리

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 청구 목록 | claims | R | 🔵 | 현장·상태 필터 |
| 청구 등록 | claims | CU | 🔵 | 기성률·청구금액·누적금액 |
| 청구서 출력 | claims + orders | R | 🔵 | 건설사별 양식 → Excel 다운로드 |

> **기성청구서 양식은 건설사마다 다름** → 핵심 데이터만 웹 입력, 양식은 엑셀 다운로드 제공

### 8-3. 수금현황

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 수금 목록 | vw_collection_status | R | ⚪ | ERP 데이터 조회 |

### 8-4. 미수금관리 (채권현황)

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 채권 목록 | receivables | R | 🔵 | 위험도별 필터 (정상/주의/위험) |
| 채권 상세 | receivables + claims + guarantees | R | 🔵 | 계약금액·청구·수금·미수금·지급보증 |
| 위험도 변경 | receivables | U | 🔵 | risk_level 수동 조정 |
| 지급보증 관리 | guarantees | CRUD | 🔵 | 갑·을·병 3자 약정 |

---

## 9. 경영분석

> **전체 읽기 전용 집계**. 기존 테이블 데이터 + KPI 스냅샷 조합.

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 사업계획대비 | business_plans + orders | R | 🟢 | 목표 vs 실적 달성률 |
| 수주율 | bids + orders | R | 🟢 | 입찰건수 ÷ 수주건수 |
| 담당자 KPI | kpi_snapshots | R | 🔵 | 영업활동·견적·입찰·수주 건수 |
| 팀 KPI | kpi_snapshots | R | 🔵 | 팀별 수주·수주율 |
| 지역 KPI | kpi_snapshots | R | 🔵 | 수도권·충청·영남·호남 |

---

## 10. 추가 페이지 (15개 공통업무 기반)

정의서 v1.1 메뉴에 명시되지 않았지만, 양식비교에서 확인된 업무:

### 10-1. 현장이관 (전자결재 상태)

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 이관 현황 | approval_tracking (type='현장이관') | R | 🟡 | 상태 추적만 |

> 메뉴 위치 제안: 수주관리 > 현장이관

### 10-2. 주간업무보고

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 보고서 목록 | weekly_reports | R | 🔵 | 팀·주차 필터 |
| 보고서 작성 | weekly_reports + weekly_report_items | CU | 🔵 | 현장별 활동·금액 입력 |
| 보고서 조회 | weekly_reports + weekly_report_items | R | 🔵 | 팀장 확인 |

> 메뉴 위치 제안: 영업관리 > 주간보고 (또는 별도 탭)

### 10-3. 정산

| 페이지 | 테이블 | 조작 | 소스 | 비고 |
|--------|--------|------|------|------|
| 정산 목록 | settlements | R | 🔵 | 현장·단계·상태 필터 |
| 정산 등록 | settlements | CU | 🔵 | 단계별(요청→기안→실물량→확약서) |
| 정산 기안 | approval_tracking (간접) | R | 🟡 | 기안 단계는 전자결재 병행 |

> 메뉴 위치 제안: 채권관리 > 정산

---

## 요약 매트릭스

### 테이블별 사용 페이지 수

| 테이블 | 조회(R) | 입력(C) | 수정(U) | 삭제(D) | 주 사용 메뉴 |
|--------|---------|---------|---------|---------|-------------|
| profiles | 전체 | - | 마이페이지 | - | 공통 |
| companies | 5+ | 1 | 1 | - | 영업관리 > 거래처 |
| contacts | 4+ | 1 | 1 | - | 영업관리 > 담당자 |
| projects | 8+ | 1 | 2 | - | 영업관리 > 현장 |
| meeting_logs | 4+ | 1 | 1 | - | 영업관리 > 영업활동 |
| meeting_log_action_items | 2 | 1 | 1 | - | 영업관리 > 영업활동 |
| business_plans | 3 | 1 | 1 | 1 | 사업계획 |
| pre_sales | 2 | 1 | 1 | - | 영업관리 > 사전영업 |
| competitors | 2 | 1 | 1 | 1 | 영업관리 > 경쟁사 |
| competitor_assets | 1 | 1 | 1 | 1 | 영업관리 > 경쟁사 |
| quotes | 5 | 1 | 1 | - | 견적관리 |
| quote_items | 3 | 1 | 1 | 1 | 견적관리 > 실행견적 |
| quote_costs | 3 | 1 | 1 | - | 견적관리 > 원가분석 |
| site_briefings | 2 | 1 | 1 | - | 입찰관리 > 현설 |
| bids | 4 | 1 | 1 | - | 입찰관리 |
| bid_histories | 2 | 1 | - | - | 입찰관리 > 이력 |
| **orders** | **8+** | **1** | **2** | - | **수주관리 (핵심)** |
| order_items | 2 | 1 | 1 | 1 | 수주관리 > 수주등록 |
| order_confirmations | 2 | 1 | 1 | - | 수주관리 > 수주확정보고 |
| **approval_tracking** | **5+** | **자동** | **2** | - | **수주관리·Dashboard** |
| claims | 3 | 1 | 1 | - | 채권관리 > 기성청구 |
| receivables | 4 | 자동 | 1 | - | 채권관리 > 미수금 |
| guarantees | 2 | 1 | 1 | 1 | 채권관리 > 미수금 |
| settlements | 2 | 1 | 1 | - | 채권관리 > 정산 |
| weekly_reports | 2 | 1 | 1 | - | 주간보고 |
| weekly_report_items | 1 | 1 | 1 | 1 | 주간보고 |
| attachments | 전체 | 전체 | - | 전체 | 공통 (모든 상세화면) |
| kpi_snapshots | 4 | 배치 | - | - | 경영분석 |

### 소스별 페이지 수

| 소스 | 페이지 수 | 비고 |
|------|----------|------|
| 🔵 Supabase 직접 CRUD | ~25 | 핵심 업무 화면 |
| 🟡 전자결재 추적 | 4 | 출고의뢰·설계의뢰·현장이관·정산기안 |
| ⚪ ERP API 조회 | 7 | 운영관리 5 + 세금계산서 + 수금 |
| 🟢 집계/계산 | 6 | Dashboard + 경영분석 |

---

## 메뉴 구조 (최종 제안)

```
SalesEX
├─ Dashboard ─────────────────── 종합현황 (수주·입찰·미수금·전자결재 알림)
│
├─ 사업계획 ─────────────────── business_plans CRUD
│
├─ 영업관리
│   ├─ 거래처 ─────────────── companies R (+ 신규 C)
│   ├─ 담당자 ─────────────── contacts CRUD
│   ├─ 현장 ───────────────── projects CRUD + 타임라인
│   ├─ 영업활동 ───────────── meeting_logs R (앱 주도) + CU (웹 보조)
│   ├─ 사전영업 ───────────── pre_sales CRUD
│   ├─ 경쟁사관리 ─────────── competitors + competitor_assets CRUD
│   └─ 주간업무보고 ────────── weekly_reports CRUD ← 추가
│
├─ 견적관리
│   ├─ 실행견적 ───────────── quotes + quote_items CRUD
│   ├─ 견적이력 ───────────── quotes R (버전비교)
│   └─ 원가분석 ───────────── quote_costs CRUD
│
├─ 입찰관리
│   ├─ 현설 ───────────────── site_briefings CRUD
│   ├─ 입찰 ───────────────── bids CRUD
│   └─ 입찰이력 ───────────── bid_histories R
│
├─ 수주관리
│   ├─ 수주등록 ───────────── orders + order_items + order_confirmations CRUD
│   ├─ 수주잔고 ───────────── orders 집계 R
│   ├─ 전자결재현황 ────────── approval_tracking R ← 통합 (출고·설계·이관)
│   └─ 현장이관 ───────────── approval_tracking (type='현장이관') R
│
├─ 운영관리 (ERP 조회 전용)
│   ├─ 생산현황 ───────────── vw_production_status R
│   ├─ 출고현황 ───────────── vw_delivery_status R
│   ├─ 회수현황 ───────────── vw_return_status R
│   ├─ 손망실현황 ─────────── (TBD) R
│   └─ 임대현황 ───────────── vw_inventory_status R
│
├─ 채권관리
│   ├─ 세금계산서현황 ──────── vw_tax_invoice_status R (ERP)
│   ├─ 기성청구관리 ────────── claims CRUD
│   ├─ 수금현황 ───────────── vw_collection_status R (ERP)
│   ├─ 미수금관리 ─────────── receivables + guarantees CRUD
│   └─ 정산 ───────────────── settlements CRUD ← 추가
│
└─ 경영분석
    ├─ 사업계획대비 ────────── business_plans + orders 집계
    ├─ 수주율 ─────────────── bids + orders 집계
    ├─ 담당자 KPI ──────────── kpi_snapshots R
    ├─ 팀 KPI ─────────────── kpi_snapshots R
    └─ 지역 KPI ───────────── kpi_snapshots R
```

---

## 개발 우선순위 제안

### Phase 1 — 핵심 파이프라인 (수주 전)
1. 현장 목록/상세 (projects)
2. 영업활동 조회 (meeting_logs — 앱 데이터 확인용)
3. 견적 작성 (quotes + quote_items)
4. 입찰 등록/결과 (bids)
5. 수주 등록 (orders)

### Phase 2 — 수주 후 관리
6. 수주확정보고서 (order_confirmations)
7. 전자결재현황 (approval_tracking)
8. 기성청구 (claims)
9. 미수금관리 (receivables + guarantees)

### Phase 3 — 보고·분석
10. Dashboard
11. 사업계획 (business_plans)
12. 주간업무보고 (weekly_reports)
13. 경영분석/KPI (kpi_snapshots)

### Phase 4 — ERP 연동
14. 운영관리 5개 화면 (ERP API)
15. 세금계산서/수금 조회 (ERP API)
