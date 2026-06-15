# SalesEX ERD 정의서 v2.0

> 작성일: 2026-06-15 (rev.1)
> 기반: 데이터소스 입력흐름 정의서 v1.1 + K-DUO-LINK Supabase 스키마 + 양식비교 결과 (15개 공통업무)
> DB: Supabase (PostgreSQL)

---

# 1. 설계 원칙

## 시스템 경계 (3원 구조)

```
┌─────────────────────────────────────────────────────────────┐
│  Supabase (SalesEX + K-DUO-LINK)                            │
│  ═══════════════════════════════                            │
│  수주 전 영업 파이프라인                                      │
│  거래처(신규) · 담당자 · 현장(견적) · 영업활동                  │
│  사전영업 · 견적 · 입찰 · 수주확정                             │
│                                                             │
│  ※ 수주확정 시 → ERP로 전송 (companies/projects에 ERP코드 부여)│
├─────────────────────────────────────────────────────────────┤
│  ERP (MSSQL)                                                │
│  ═══════════                                                │
│  수주 후 운영 · 기존 거래처/현장 마스터                         │
│  생산 · 출고 · 회수 · 세금계산서 · 수금 · 재고                 │
│  SalesEX는 API로 조회만 (VIEW)                               │
├─────────────────────────────────────────────────────────────┤
│  그룹웨어 (전자결재)                                          │
│  ══════════════════                                         │
│  출고의뢰서 · 설계의뢰서 · 현장이관신청서 등                    │
│  SalesEX는 결재 상태만 추적 (미발행/발행/승인)                  │
│  ※ 직무조사표에 전자결재로 명시된 양식은 웹 양식 불필요          │
└─────────────────────────────────────────────────────────────┘
```

## 데이터 생명주기

```
K-DUO-LINK 앱 (명함OCR·방문기록·STT)
  ↓ Supabase 저장
SalesEX 웹 (사전영업·견적·입찰 관리)
  ↓ 수주확정
ERP 수주등록 (거래처코드·현장코드 부여)
  ↓ 이후 운영
ERP (생산·출고·회수·세금계산서·수금)  ← SalesEX는 VIEW로 조회
그룹웨어 (출고의뢰·설계의뢰·현장이관)  ← SalesEX는 상태만 추적
```

**핵심**: companies/projects 테이블은 `erp_company_code` / `erp_site_code`가 NULL이면 수주 전(Supabase 전용), 값이 있으면 ERP에도 등록된 상태.

## 테이블 분류

### 공유 테이블 (K-DUO-LINK 앱 ↔ SalesEX 웹)
동일 Supabase 인스턴스. 앱에서 현장 데이터 수집 → 웹에서 조회·확장.
- profiles, companies, contacts, projects, meeting_logs, meeting_log_action_items

### EX 전용 테이블 (SalesEX 웹 전용)
- business_plans, pre_sales, competitors, competitor_assets
- quotes, quote_items, quote_costs
- site_briefings, bids, bid_histories
- orders, order_items, order_confirmations
- claims, receivables, guarantees
- settlements, weekly_reports, weekly_report_items
- approval_tracking (전자결재 상태 추적)
- attachments, kpi_snapshots

### ERP 조회용 VIEW (읽기 전용)
ERP API를 통해 데이터 수신. Supabase에 실제 테이블 생성하지 않음.
- vw_production_status, vw_delivery_status, vw_return_status
- vw_inventory_status, vw_tax_invoice_status, vw_collection_status

### 삭제 테이블 (v2.0 초안 대비)
전자결재로 처리되므로 SalesEX에 양식 테이블 불필요:
- ~~delivery_requests, delivery_request_items~~ → approval_tracking으로 대체
- ~~design_requests~~ → approval_tracking으로 대체
- ~~site_transfers~~ → approval_tracking으로 대체

## 네이밍 규칙
- 테이블명: snake_case, 복수형
- PK: `id` (UUID, gen_random_uuid())
- FK: `{참조테이블_단수}_id`
- 타임스탬프: `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- 상태: `status` (TEXT, CHECK 제약조건)
- 금액: BIGINT (원 단위, 소수점 없음)
- 비율: NUMERIC(5,2) (소수점 2자리)

---

# 2. 공유 테이블 (K-DUO-LINK 기존)

## profiles

사용자 프로필 (auth.users 연동)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, FK→auth.users(id) ON DELETE CASCADE | 사용자 ID |
| name | TEXT | NOT NULL, DEFAULT '' | 이름 |
| email | TEXT | NOT NULL, DEFAULT '' | 이메일 |
| team | TEXT | NOT NULL, CHECK ('sales','design'), DEFAULT 'sales' | 소속팀 |
| role | TEXT | NOT NULL, CHECK ('member','leader','admin'), DEFAULT 'member' | 역할 |
| employee_id | TEXT | NULLABLE | 사번 (ERP 매핑) |
| team_id | TEXT | NULLABLE | 부서코드 (ERP 매핑) |
| mobile_phone | TEXT | NULLABLE | 휴대폰 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

> RLS: 본인 조회 + 팀장 팀원 조회 + 본인 생성/수정

---

## companies

거래처

**생명주기**: K-DUO-LINK에서 명함OCR 등록(erp_company_code=NULL) → 수주확정 시 ERP 등록(erp_company_code 부여) → 이후 ERP에서도 마스터 관리. 기존 ERP 거래처는 erp_company_code가 이미 존재.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 거래처 ID |
| name | TEXT | NOT NULL | 거래처명 |
| group_name | TEXT | NULLABLE | 그룹명 |
| business_reg_number | TEXT | NULLABLE | 사업자번호 |
| industry | TEXT | NULLABLE | 업종 |
| credit_rating | TEXT | NULLABLE | 신용등급 (A/B/C/D) |
| erp_company_code | VARCHAR(20) | NULLABLE, UNIQUE | ERP 거래처코드 (NULL=수주전, 값=ERP등록) |
| ceo_name | VARCHAR(50) | NULLABLE | 대표자명 |
| address | TEXT | NULLABLE | 주소 |
| status | TEXT | NULLABLE, DEFAULT 'active' | 거래상태 (active/inactive) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

> K-DUO-LINK 기본 6컬럼 + SalesEX 확장 4컬럼 (erp_company_code, ceo_name, address, status)
> **erp_company_code 판별**: NULL → Supabase 전용(수주 전 신규) / 값 있음 → ERP 연계 완료

---

## contacts

담당자 (앱에서 명함 OCR·방문 시 등록 → 웹에서 영업관리)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 담당자 ID |
| company_id | UUID | FK→companies(id) ON DELETE SET NULL | 소속 거래처 |
| name | TEXT | NOT NULL | 성명 |
| department | TEXT | NULLABLE | 부서 |
| position | TEXT | NULLABLE | 직급 |
| phone | TEXT | NULLABLE | 휴대폰 |
| email | TEXT | NULLABLE | 이메일 |
| sns | TEXT | NULLABLE | SNS |
| school | TEXT | NULLABLE | 학교 |
| personality_tag | TEXT | NULLABLE | 성향 태그 |
| preference | TEXT | NULLABLE | 선호사항 |
| tag | TEXT | DEFAULT '본사' | 구분 (본사/현장/기타) |
| last_contact_date | DATE | NULLABLE | 최근 연락일 |
| memo | TEXT | NULLABLE | 메모 (SalesEX 확장) |
| user_id | UUID | FK→auth.users(id), DEFAULT auth.uid() | 등록자 |
| team | TEXT | NULLABLE, CHECK ('sales','design') | 등록자 소속팀 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

## projects

현장/프로젝트

**생명주기**: K-DUO-LINK에서 등록(erp_site_code=NULL, type='견적현장') → 수주확정 시 ERP 등록(erp_site_code 부여, type='수주현장') → 세금계산서·납기 등 ERP 운영. 기존 ERP 현장은 erp_site_code가 이미 존재.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 현장 ID |
| company_id | UUID | FK→companies(id) ON DELETE SET NULL | 시공사 |
| project_no | TEXT | NULLABLE | 프로젝트 번호 |
| name | TEXT | NOT NULL | 현장명 |
| address | TEXT | NULLABLE | 주소 |
| type | TEXT | DEFAULT '기타' | 구분 (수주현장/견적현장/기타) |
| bidding_date | DATE | NULLABLE | 입찰예정일 |
| bidding_status | TEXT | NULLABLE | 입찰상태 |
| target_price | BIGINT | NULLABLE | 목표단가 |
| competitor_price | BIGINT | NULLABLE | 경쟁사 단가 |
| last_meeting_date | DATE | NULLABLE | 최근 미팅일 |
| owner_company_id | UUID | FK→companies(id) | 발주처 (SalesEX 확장) |
| region | VARCHAR(20) | NULLABLE | 지역 (수도권/충청/영남/호남) |
| start_date | DATE | NULLABLE | 착공예정일 |
| expected_end_date | DATE | NULLABLE | 준공예정일 |
| building_count | INTEGER | NULLABLE | 동수 |
| floor_count | INTEGER | NULLABLE | 층수 |
| expected_quantity | BIGINT | NULLABLE | 예상물량 |
| erp_site_code | VARCHAR(20) | NULLABLE, UNIQUE | ERP 현장코드 (NULL=수주전, 값=ERP등록) |
| status | TEXT | DEFAULT 'active' | 현장상태 (active/erp_registered/closed) |
| user_id | UUID | FK→auth.users(id), DEFAULT auth.uid() | 등록자 |
| assigned_sales_id | UUID | FK→auth.users(id) | 담당 영업사원 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

> **erp_site_code 판별**: NULL → 수주 전(Supabase 파이프라인) / 값 있음 → ERP 등록 완료
> **status 흐름**: active(영업중) → erp_registered(수주확정·ERP등록) → closed(현장종료)

---

## meeting_logs

영업활동/상담기록 (앱에서 방문·녹음·STT → 웹에서 이력 조회)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 활동 ID |
| project_id | UUID | FK→projects(id) ON DELETE SET NULL | 현장 |
| contact_id | UUID | FK→contacts(id) ON DELETE SET NULL | 담당자 |
| contact_name | TEXT | NULLABLE | 담당자명 (비정규화) |
| meeting_type | TEXT | NULLABLE | 유형 (방문/통화/유선/화상/문자/이메일/기타) |
| date | DATE | NOT NULL, DEFAULT CURRENT_DATE | 활동일 |
| author | TEXT | NULLABLE | 작성자명 |
| notes | TEXT | NULLABLE | 상담내용 |
| recording_text | TEXT | NULLABLE | STT 변환 텍스트 |
| recording_url | TEXT | NULLABLE | 녹음 파일 URL |
| key_topics | TEXT | NULLABLE | 핵심 주제 |
| summary_result | TEXT | NULLABLE | 결과 (수주/검토/실패) |
| next_step | TEXT | NULLABLE | 후속조치 |
| extra_participants | JSONB | NULLABLE | 추가 참석자 배열 |
| user_id | UUID | FK→auth.users(id), DEFAULT auth.uid() | 작성자 ID |
| team | TEXT | NULLABLE, CHECK ('sales','design') | 작성 팀 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

---

## meeting_log_action_items

영업활동 후속 조치 항목

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 항목 ID |
| log_id | UUID | FK→meeting_logs(id) ON DELETE CASCADE | 상위 활동 |
| seq_no | INTEGER | NOT NULL | 순번 |
| description | TEXT | NOT NULL | 내용 |
| status | TEXT | NOT NULL, DEFAULT 'pending' | 상태 (pending/completed) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

---

# 3. EX 전용 테이블 — 사업계획

## business_plans

연간/월별 사업계획

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 계획 ID |
| year | INTEGER | NOT NULL | 연도 |
| month | INTEGER | NULLABLE, CHECK (1~12) | 월 (NULL=연간) |
| user_id | UUID | FK→profiles(id) NOT NULL | 담당자 |
| team | VARCHAR(20) | NOT NULL | 팀 |
| region | VARCHAR(20) | NULLABLE | 지역 |
| product_group | VARCHAR(50) | NULLABLE | 품목군 (알폼/갱폼/유로폼) |
| target_order | BIGINT | DEFAULT 0 | 수주목표(원) |
| target_sales | BIGINT | DEFAULT 0 | 매출목표(원) |
| target_profit | BIGINT | DEFAULT 0 | 이익목표(원) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

# 4. EX 전용 테이블 — 영업관리

## pre_sales

사전영업 (현설 이전 영업활동)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 사전영업 ID |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| company_id | UUID | FK→companies(id) | 시공사 |
| user_id | UUID | FK→profiles(id) NOT NULL | 담당자 |
| expected_start_date | DATE | NULLABLE | 예상착공일 |
| expected_quantity | BIGINT | NULLABLE | 예상물량 |
| proposal_contents | TEXT | NULLABLE | 제품제안내용 |
| design_request | TEXT | NULLABLE | 설계반영 요청사항 |
| competitor_analysis | TEXT | NULLABLE | 경쟁사 현황 |
| winning_probability | NUMERIC(5,2) | NULLABLE | 수주가능성(%) |
| strategy | TEXT | NULLABLE | 영업전략 |
| status | TEXT | DEFAULT '진행중' | 상태 (예정/진행중/완료/취소) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

## competitors

경쟁사

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 경쟁사 ID |
| company_name | VARCHAR(100) | NOT NULL | 경쟁사명 |
| ceo_name | VARCHAR(50) | NULLABLE | 대표자 |
| head_office | TEXT | NULLABLE | 본사 주소 |
| organization | TEXT | NULLABLE | 영업조직 |
| strengths | TEXT | NULLABLE | 강점 |
| weaknesses | TEXT | NULLABLE | 약점 |
| major_clients | TEXT | NULLABLE | 주요 고객 |
| remarks | TEXT | NULLABLE | 비고 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

## competitor_assets

경쟁사 보유자산

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 자산 ID |
| competitor_id | UUID | FK→competitors(id) ON DELETE CASCADE | 경쟁사 |
| asset_type | VARCHAR(30) | NOT NULL | 자산유형 (알폼/갱폼/유로폼/잭서포트/기타) |
| quantity | INTEGER | DEFAULT 0 | 수량 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

# 5. EX 전용 테이블 — 견적관리

## quotes

실행견적

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 견적 ID |
| quote_no | VARCHAR(30) | NOT NULL, UNIQUE | 견적번호 |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| company_id | UUID | FK→companies(id) | 거래처 |
| user_id | UUID | FK→profiles(id) NOT NULL | 담당자 |
| version_no | INTEGER | DEFAULT 1 | 버전 (V1, V2...) |
| quote_date | DATE | NOT NULL | 견적일 |
| quote_amount | BIGINT | DEFAULT 0 | 견적금액(원) |
| competitor_count | INTEGER | DEFAULT 0 | 경쟁사 수 |
| status | TEXT | DEFAULT '작성중' | 상태 (작성중/제출/수정/승인/종료) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

## quote_items

견적 품목 상세

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 품목 ID |
| quote_id | UUID | FK→quotes(id) ON DELETE CASCADE | 견적 |
| product_name | VARCHAR(100) | NOT NULL | 품명 |
| specification | VARCHAR(100) | NULLABLE | 규격 |
| quantity | INTEGER | DEFAULT 0 | 수량 |
| unit_price | BIGINT | DEFAULT 0 | 단가(원) |
| amount | BIGINT | DEFAULT 0 | 금액(원) |

---

## quote_costs

원가분석

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 원가 ID |
| quote_id | UUID | FK→quotes(id) ON DELETE CASCADE, UNIQUE | 견적 (1:1) |
| manufacturing_cost | BIGINT | DEFAULT 0 | 제조원가(원) |
| logistics_cost | BIGINT | DEFAULT 0 | 물류원가(원) |
| site_cost | BIGINT | DEFAULT 0 | 현장관리비(원) |
| etc_cost | BIGINT | DEFAULT 0 | 기타원가(원) |
| expected_profit | BIGINT | DEFAULT 0 | 예상이익(원) |
| expected_margin | NUMERIC(5,2) | DEFAULT 0 | 예상이익률(%) |

---

# 6. EX 전용 테이블 — 입찰관리

## site_briefings

현장설명회 (현설)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 현설 ID |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| briefing_date | DATE | NOT NULL | 현설일 |
| building_count | INTEGER | NULLABLE | 동수 |
| floor_count | INTEGER | NULLABLE | 층수 |
| expected_quantity | BIGINT | NULLABLE | 예상물량 |
| attendee_id | UUID | FK→profiles(id) | 참석 담당자 |
| contact_id | UUID | FK→contacts(id) | 시공사 담당자 |
| remarks | TEXT | NULLABLE | 비고 |
| status | TEXT | DEFAULT '예정' | 상태 (예정/완료) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

---

## bids

입찰

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 입찰 ID |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| quote_id | UUID | FK→quotes(id) | 견적 |
| user_id | UUID | FK→profiles(id) NOT NULL | 담당자 |
| bid_round | INTEGER | DEFAULT 1 | 입찰 차수 |
| bid_date | DATE | NOT NULL | 입찰일 |
| bid_amount | BIGINT | DEFAULT 0 | 입찰금액(원) |
| participant_count | INTEGER | DEFAULT 0 | 참여업체 수 |
| expected_rank | INTEGER | NULLABLE | 예상순위 |
| status | TEXT | DEFAULT '예정' | 상태 (예정/진행중/제출완료/결과대기/낙찰/탈락) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

## bid_histories

입찰 이력 (차수별)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 이력 ID |
| bid_id | UUID | FK→bids(id) ON DELETE CASCADE | 입찰 |
| round_no | INTEGER | NOT NULL | 차수 (1차/2차/재입찰/최종) |
| bid_amount | BIGINT | DEFAULT 0 | 입찰금액(원) |
| result | VARCHAR(20) | NULLABLE | 결과 (낙찰/탈락/보류) |
| competitor_info | TEXT | NULLABLE | 수주경쟁사 |
| failure_reason | TEXT | NULLABLE | 실패사유 |
| remarks | TEXT | NULLABLE | 비고 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

---

# 7. EX 전용 테이블 — 수주관리

## orders

수주 (핵심 테이블, ERP 연동 기준점)

수주확정 시: orders 생성 → companies.erp_company_code 부여 → projects.erp_site_code 부여 → ERP 전송

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 수주 ID |
| order_no | VARCHAR(30) | UNIQUE | 수주번호 |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| company_id | UUID | FK→companies(id) | 거래처 |
| quote_id | UUID | FK→quotes(id) | 견적 |
| bid_id | UUID | FK→bids(id) | 입찰 |
| user_id | UUID | FK→profiles(id) NOT NULL | 담당자 |
| order_date | DATE | NOT NULL | 수주일 |
| order_amount | BIGINT | DEFAULT 0 | 수주금액(원) |
| contract_start | DATE | NULLABLE | 계약시작일 |
| contract_end | DATE | NULLABLE | 계약종료일 |
| erp_transfer_yn | BOOLEAN | DEFAULT FALSE | ERP 전송 여부 |
| erp_transfer_date | TIMESTAMPTZ | NULLABLE | ERP 전송일 |
| status | TEXT | DEFAULT '협의중' | 상태 (협의중/수주확정/ERP전송대기/ERP등록완료) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

## order_items

수주 품목 상세

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 품목 ID |
| order_id | UUID | FK→orders(id) ON DELETE CASCADE | 수주 |
| product_name | VARCHAR(100) | NOT NULL | 품명 |
| specification | VARCHAR(100) | NULLABLE | 규격 |
| quantity | INTEGER | DEFAULT 0 | 수량 |
| unit_price | BIGINT | DEFAULT 0 | 단가(원) |
| amount | BIGINT | DEFAULT 0 | 금액(원) |

---

## order_confirmations

수주확정보고서 (VBA 매크로 10시트 → 웹 시뮬레이션)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 보고서 ID |
| order_id | UUID | FK→orders(id) ON DELETE CASCADE, UNIQUE | 수주 (1:1) |
| simulation_data | JSONB | NULLABLE | 시뮬레이션 결과 |
| form_depreciation | JSONB | NULLABLE | 거푸집 상각비 |
| operation_standard | JSONB | NULLABLE | 조업기준 |
| accessory_cost | JSONB | NULLABLE | 부속류 원가 |
| rental_info | JSONB | NULLABLE | 임대정보 |
| confirmed_by | UUID | FK→profiles(id) | 확정자 |
| confirmed_at | TIMESTAMPTZ | NULLABLE | 확정일 |
| status | TEXT | DEFAULT '작성중' | 상태 (작성중/검토중/확정) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

---

# 8. 전자결재 상태 추적

## approval_tracking

그룹웨어 전자결재 상태 추적 (양식 자체는 그룹웨어에 존재, SalesEX는 상태만 관리)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 추적 ID |
| order_id | UUID | FK→orders(id) | 수주 |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| approval_type | TEXT | NOT NULL | 결재유형 (출고의뢰/설계의뢰/현장이관) |
| approval_status | TEXT | DEFAULT '미발행' | 상태 (미발행/발행/승인/반려/완료) |
| approval_no | VARCHAR(50) | NULLABLE | 그룹웨어 결재번호 (향후 연동 시) |
| requested_by | UUID | FK→profiles(id) | 요청자 |
| approved_at | TIMESTAMPTZ | NULLABLE | 결재완료일 |
| remarks | TEXT | NULLABLE | 비고 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

> **사용 패턴**: 수주확정 후 해당 현장에 필요한 전자결재 항목을 '미발행'으로 생성 → 그룹웨어에서 결재 진행 → 상태 업데이트
> **향후 연동**: 그룹웨어 API 연동 시 approval_no로 자동 상태 동기화 가능

---

# 9. EX 전용 테이블 — 채권관리

## claims

기성청구

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 청구 ID |
| order_id | UUID | FK→orders(id) NOT NULL | 수주 |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| claim_date | DATE | NOT NULL | 청구일 |
| progress_rate | NUMERIC(5,2) | DEFAULT 0 | 기성률(%) |
| claim_amount | BIGINT | DEFAULT 0 | 청구금액(원) |
| accumulated_amount | BIGINT | DEFAULT 0 | 누적청구금액(원) |
| status | TEXT | DEFAULT '미발행' | 상태 (미발행/발행/완료) |
| remarks | TEXT | NULLABLE | 비고 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

## receivables

채권 (현장 단위 미수금 관리)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 채권 ID |
| order_id | UUID | FK→orders(id) NOT NULL | 수주 |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| user_id | UUID | FK→profiles(id) | 담당자 |
| contract_amount | BIGINT | DEFAULT 0 | 계약금액(원) |
| claimed_amount | BIGINT | DEFAULT 0 | 누적청구금액(원) |
| collected_amount | BIGINT | DEFAULT 0 | 수금금액(원) |
| outstanding_amount | BIGINT | DEFAULT 0 | 미수금액(원) |
| guarantee_amount | BIGINT | DEFAULT 0 | 지급보증금액(원) |
| risk_level | TEXT | DEFAULT '정상' | 위험도 (정상/주의/위험) |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

---

## guarantees

지급보증약정서

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 약정 ID |
| order_id | UUID | FK→orders(id) NOT NULL | 수주 |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| party_a_company_id | UUID | FK→companies(id) | 갑 (원청사) |
| party_b_company_id | UUID | FK→companies(id) | 을 (형틀업체) |
| party_c_company_id | UUID | FK→companies(id) | 병 (자재임대사-금강) |
| guarantee_amount | BIGINT | DEFAULT 0 | 보증금액(원) |
| guarantee_start | DATE | NULLABLE | 보증시작일 |
| guarantee_end | DATE | NULLABLE | 보증종료일 |
| status | TEXT | DEFAULT '작성중' | 상태 (작성중/체결/만료/해지) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

---

# 10. EX 전용 테이블 — 현장운영

## settlements

정산 (현장종료 시 정산 프로세스)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 정산 ID |
| order_id | UUID | FK→orders(id) NOT NULL | 수주 |
| project_id | UUID | FK→projects(id) NOT NULL | 현장 |
| user_id | UUID | FK→profiles(id) NOT NULL | 담당자 |
| settlement_type | TEXT | NOT NULL | 단계 (요청/기안/실물량/확약서) |
| contract_amount | BIGINT | DEFAULT 0 | 계약금액(원) |
| actual_quantity | BIGINT | DEFAULT 0 | 실물량 |
| settlement_amount | BIGINT | DEFAULT 0 | 정산금액(원) |
| loss_amount | BIGINT | DEFAULT 0 | 손망실금액(원) |
| remarks | TEXT | NULLABLE | 비고 |
| status | TEXT | DEFAULT '요청' | 상태 (요청/검토중/승인/완료) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

> 정산 중 '기안' 단계는 그룹웨어 전자결재 병행 가능 → approval_tracking에서 추적

---

# 11. EX 전용 테이블 — 보고

## weekly_reports

주간업무보고

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 보고 ID |
| user_id | UUID | FK→profiles(id) NOT NULL | 작성자 |
| team | VARCHAR(20) | NOT NULL | 팀 |
| year | INTEGER | NOT NULL | 연도 |
| week_no | INTEGER | NOT NULL | 주차 |
| report_date | DATE | NOT NULL | 작성일 |
| activities_summary | TEXT | NULLABLE | 영업실적 요약 |
| next_week_plan | TEXT | NULLABLE | 차주 계획 |
| issues | TEXT | NULLABLE | 이슈사항 |
| status | TEXT | DEFAULT '작성중' | 상태 (작성중/제출/확인) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

---

## weekly_report_items

주간업무 상세 항목

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 항목 ID |
| report_id | UUID | FK→weekly_reports(id) ON DELETE CASCADE | 보고서 |
| project_id | UUID | FK→projects(id) | 현장 |
| activity_type | VARCHAR(20) | NULLABLE | 활동유형 (방문/견적/입찰/수주) |
| description | TEXT | NULLABLE | 내용 |
| amount | BIGINT | DEFAULT 0 | 금액(원) |
| seq_no | INTEGER | DEFAULT 0 | 순번 |

---

# 12. EX 전용 테이블 — 공통

## attachments

첨부파일 (범용)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 파일 ID |
| entity_type | VARCHAR(30) | NOT NULL | 대상 테이블 (quotes/bids/orders/...) |
| entity_id | UUID | NOT NULL | 대상 레코드 ID |
| file_name | VARCHAR(255) | NOT NULL | 파일명 |
| file_url | TEXT | NOT NULL | Supabase Storage URL |
| file_size | BIGINT | DEFAULT 0 | 파일크기(bytes) |
| mime_type | VARCHAR(100) | NULLABLE | MIME 타입 |
| uploaded_by | UUID | FK→profiles(id) NOT NULL | 업로더 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

---

## kpi_snapshots

KPI 스냅샷 (야간 배치 자동 생성)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 스냅샷 ID |
| snapshot_date | DATE | NOT NULL | 기준일 |
| user_id | UUID | FK→profiles(id) NOT NULL | 담당자 |
| team | VARCHAR(20) | NOT NULL | 팀 |
| region | VARCHAR(20) | NULLABLE | 지역 |
| order_amount | BIGINT | DEFAULT 0 | 수주금액(원) |
| order_count | INTEGER | DEFAULT 0 | 수주건수 |
| quote_count | INTEGER | DEFAULT 0 | 견적건수 |
| bid_count | INTEGER | DEFAULT 0 | 입찰건수 |
| win_rate | NUMERIC(5,2) | DEFAULT 0 | 수주율(%) |
| target_rate | NUMERIC(5,2) | DEFAULT 0 | 목표달성률(%) |
| activity_count | INTEGER | DEFAULT 0 | 영업활동건수 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |

---

# 13. ERP 조회용 VIEW (읽기 전용)

실제 테이블 생성 안 함. ERP API 호출 → JSON 응답으로 사용.

## vw_production_status
생산현황: 현장, 동명, 품목, 물량, 상태(생산대기/생산중/생산완료)

## vw_delivery_status
출고현황: 현장, 동명, 품목, 물량, 상태(출고예정/출고중/출고완료)

## vw_return_status
회수현황: 현장, 동명, 품목, 물량, 상태(회수예정/회수중/회수완료)

## vw_inventory_status
임대현황: 품목, 총재고, 임대중, 회수대기, 수리중

## vw_tax_invoice_status
세금계산서: 현장, 발행금액, 발행일, 상태

## vw_collection_status
수금현황: 현장, 수금금액, 수금일, 상태

---

# 14. 핵심 관계도 (텍스트)

```
profiles (사용자)
  └── 모든 업무 테이블의 user_id / created_by

companies (거래처) ─── K-DUO-LINK 공유
  │   erp_company_code: NULL=수주전 / 값=ERP등록
  ├── contacts (담당자) ─── K-DUO-LINK 공유
  ├── projects (현장) ─── K-DUO-LINK 공유
  │     │   erp_site_code: NULL=수주전 / 값=ERP등록
  │     ├── meeting_logs (영업활동) ─── K-DUO-LINK 공유
  │     │     └── meeting_log_action_items (후속조치)
  │     ├── pre_sales (사전영업)
  │     ├── site_briefings (현설)
  │     ├── bids (입찰)
  │     │     └── bid_histories (입찰이력)
  │     ├── quotes (견적)
  │     │     ├── quote_items (견적품목)
  │     │     └── quote_costs (원가분석)
  │     ├── orders (수주) ← 핵심, ERP 연동점
  │     │     ├── order_items (수주품목)
  │     │     ├── order_confirmations (수주확정보고서)
  │     │     ├── claims (기성청구)
  │     │     ├── receivables (채권)
  │     │     ├── guarantees (지급보증)
  │     │     ├── settlements (정산)
  │     │     └── approval_tracking (전자결재 추적)
  │     │           - 출고의뢰 → 그룹웨어
  │     │           - 설계의뢰 → 그룹웨어
  │     │           - 현장이관 → 그룹웨어
  │     └── weekly_report_items (주간업무항목)
  └── guarantees.party_a/b/c (지급보증 3자)

competitors (경쟁사) — 독립
  └── competitor_assets (보유자산)

business_plans (사업계획) — 독립

weekly_reports (주간업무보고)
  └── weekly_report_items (상세항목)

attachments (첨부파일) — 다형성 참조 (entity_type + entity_id)

kpi_snapshots (KPI 스냅샷) — 배치 생성

ERP VIEW (읽기 전용, API)
  ├── vw_production_status
  ├── vw_delivery_status
  ├── vw_return_status
  ├── vw_inventory_status
  ├── vw_tax_invoice_status
  └── vw_collection_status
```

---

# 15. 데이터 흐름 요약

## 수주 전 (Supabase)
```
K-DUO-LINK 앱
  → companies (erp_company_code = NULL)
  → contacts
  → projects (erp_site_code = NULL, type = '견적현장')
  → meeting_logs + action_items

SalesEX 웹
  → pre_sales → quotes → site_briefings → bids → orders
```

## 수주 확정 시 (Supabase → ERP)
```
orders.status = '수주확정'
  → companies.erp_company_code ← ERP 거래처코드 부여
  → projects.erp_site_code ← ERP 현장코드 부여
  → projects.type = '수주현장'
  → projects.status = 'erp_registered'
  → orders.erp_transfer_yn = TRUE
  → approval_tracking 생성 (출고의뢰·설계의뢰 = '미발행')
```

## 수주 후 (ERP 운영 + 그룹웨어 결재)
```
ERP (조회만)
  → vw_production_status (생산)
  → vw_delivery_status (출고)
  → vw_return_status (회수)
  → vw_tax_invoice_status (세금계산서)
  → vw_collection_status (수금)

그룹웨어 (상태 추적만)
  → approval_tracking.출고의뢰: 미발행 → 발행 → 승인
  → approval_tracking.설계의뢰: 미발행 → 발행 → 승인
  → approval_tracking.현장이관: 미발행 → 발행 → 승인

SalesEX (채권관리)
  → claims (기성청구)
  → receivables (미수금)
  → guarantees (지급보증)
  → settlements (정산 → 현장종료)
```

---

# 16. v1.0 대비 변경사항

| 구분 | 변경 내용 |
|------|----------|
| 테이블명 변경 | users → profiles, sites → projects, activities → meeting_logs (K-DUO-LINK 기준) |
| 신규 추가 | site_briefings, order_confirmations, guarantees, settlements, weekly_reports, weekly_report_items, approval_tracking |
| 삭제 (→전자결재) | delivery_requests, delivery_request_items, design_requests, site_transfers |
| ERP 연계 필드 | companies.erp_company_code, projects.erp_site_code 추가 |
| 데이터 타입 | 모든 컬럼에 타입 명시 (v1.0은 다수 누락) |
| K-DUO-LINK 통합 | 공유 테이블 6개 명시, 확장 컬럼 구분 |
| 3원 경계 | Supabase(수주전) / ERP(수주후) / 그룹웨어(전자결재) 명시 |
| 총 테이블 수 | v1.0: 20개 → v2.0: 25개 (+ ERP VIEW 6개) |
