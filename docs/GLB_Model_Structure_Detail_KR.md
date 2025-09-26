# GLB 모델 구조 초상세 분석

## 유니폼의 물리적 구조

### 유니폼의 2대 주요 부분
ST Configurator의 유니폼은 **물리적으로 2개의 독립된 의류**로 구성됩니다:

```
완전한 유니폼 = 셔츠 (Shirt) + 바지 (Pants)
```

#### 1. 셔츠 (Shirt) - 상의 부분
- **물리적 특성**: 실제 셔츠와 동일한 구조
- **구성**: 4개의 분리된 GLB 파일로 모델링
- **착용 방식**: 머리를 통해 입는 상의

#### 2. 바지 (Pants) - 하의 부분
- **물리적 특성**: 실제 바지와 동일한 구조
- **구성**: 1개의 GLB 파일로 모델링
- **착용 방식**: 다리를 통해 입는 하의

## 셔츠의 4부품 분해 구조

### 셔츠 = 4개 GLB 파일의 조합
실제 셔츠를 만들 때처럼, 3D 모델도 **4개의 개별 부품**으로 제작되어 조합됩니다:

```
셔츠 = 후면몸체 + 전면몸체 + 넥부분 + 팔부분
     (Back)   (Front)  (Neck)  (Arms)
```

### 각 부품의 물리적 역할

#### 1. 후면 몸체 (Back Body) - `*_back_body.glb`
```
물리적 범위: 어깨 뒤쪽 ~ 허리 뒤쪽
포함 영역:
├── 어깨날 부분 (Shoulder Blades)
├── 등 중앙부 (Back Center)
├── 등 하단부 (Lower Back)
└── 허리 뒤쪽 (Back Waist)

특징:
- 모든 셔츠 조합에서 동일하게 사용
- 디자인 타입별로만 구분 (reg_ vs setin_)
- 넥 타입이나 팔 길이와 무관
```

#### 2. 전면 몸체 (Front Body) - 3가지 타입
전면 몸체는 **넥 디자인에 따라 3가지 형태**로 제작됩니다:

##### 타입 1: 일반 상단 몸체 (`u_body`)
```
물리적 구조: 일반적인 라운드넥 셔츠의 앞면
포함 영역:
├── 가슴 부분 (Chest)
├── 배 부분 (Abdomen)
├── 어깨 앞쪽 (Front Shoulders)
└── 일반 넥라인 (Regular Neckline)

사용 넥 타입:
- std_a (표준 A형)
- cft_c (컴포트 C형)

이유: 일반적인 원형 넥라인에 맞게 설계된 몸체
```

##### 타입 2: V넥 몸체 (`v_body`)
```
물리적 구조: V자 모양으로 파인 넥라인을 가진 앞면
포함 영역:
├── 가슴 부분 (V자로 노출된 상태)
├── 배 부분 (Abdomen)
├── 어깨 앞쪽 (Front Shoulders)
└── V자 넥라인 (V-shaped Neckline)

사용 넥 타입:
- std_b (표준 B형)
- cft_b (컴포트 B형)

이유: V자 모양의 깊은 넥라인 디자인에 맞게 설계
```

##### 타입 3: V넥용 상단 몸체 (`u_v_body`)
```
물리적 구조: V넥과 일반넥의 중간 형태
포함 영역:
├── 가슴 부분 (살짝 노출)
├── 배 부분 (Abdomen)
├── 어깨 앞쪽 (Front Shoulders)
└── 얕은 V자 넥라인 (Shallow V-neckline)

사용 넥 타입:
- cft_d (컴포트 D형)

이유: 컴포트D의 특수한 넥 디자인에 맞춤 설계
```

#### 3. 넥 부분 (Neck Parts) - 5가지 타입
넥 부분은 **셔츠의 칼라와 넥라인**을 담당하는 별도 부품입니다:

##### std_a (표준 넥 A형)
```
물리적 특성:
├── 기본적인 라운드 넥
├── 일반적인 칼라 높이
├── 표준적인 넥 둘레
└── 클래식한 마감

연결되는 전면몸체: u_body (일반 상단 몸체)
사용 시나리오: 가장 기본적인 셔츠 스타일
```

##### std_b (표준 넥 B형)
```
물리적 특성:
├── V자 모양 넥라인
├── 표준보다 깊은 파임
├── V자 각도: 중간 정도
└── 세미 포멀한 느낌

연결되는 전면몸체: v_body (V넥 몸체)
사용 시나리오: 세미 포멀한 V넥 셔츠
```

##### cft_b (컴포트 넥 B형)
```
물리적 특성:
├── 편안한 V자 넥라인
├── 여유있는 넥 둘레
├── 부드러운 V자 곡선
└── 캐주얼한 마감

연결되는 전면몸체: v_body (V넥 몸체)
사용 시나리오: 캐주얼한 V넥 셔츠
```

##### cft_c (컴포트 넥 C형)
```
물리적 특성:
├── 편안한 라운드 넥
├── 여유있는 넥 둘레
├── 부드러운 곡선 마감
└── 릴렉스한 느낌

연결되는 전면몸체: u_body (일반 상단 몸체)
사용 시나리오: 편안한 일반 넥 셔츠
```

##### cft_d (컴포트 넥 D형)
```
물리적 특성:
├── 독특한 얕은 V자 넥
├── 특별한 디자인 요소
├── u_v_body 전용 설계
└── 프리미엄 마감

연결되는 전면몸체: u_v_body (V넥용 상단 몸체)
사용 시나리오: 특수 디자인 셔츠
```

#### 4. 팔 부분 (Arms) - 2가지 길이
팔 부분은 **길이에 따라서만** 구분됩니다:

##### 반팔 (Short Arms) - `*_short_arms.glb`
```
물리적 범위: 어깨 ~ 팔꿈치 위
포함 영역:
├── 어깨 연결부 (Shoulder Joint)
├── 상완 부분 (Upper Arm)
├── 팔꿈치 위 (Above Elbow)
└── 반팔 마감선 (Short Sleeve Hem)

특징:
- 넥 타입과 완전 독립
- 여름용 / 캐주얼용
```

##### 긴팔 (Long Arms) - `*_long_arms.glb`
```
물리적 범위: 어깨 ~ 손목
포함 영역:
├── 어깨 연결부 (Shoulder Joint)
├── 상완 부분 (Upper Arm)
├── 팔꿈치 (Elbow)
├── 하완 부분 (Forearm)
└── 손목 마감 (Wrist Cuff)

특징:
- 넥 타입과 완전 독립
- 겨울용 / 포멀용
```

## 넥-몸체 연결의 물리적 원리

### 왜 넥 타입이 전면 몸체를 결정하는가?

실제 의류 제작에서처럼, **넥라인의 모양에 따라 몸체의 절단선이 달라집니다**:

#### 원리 1: 넥라인 호환성
```
일반 넥 (Round Neck):
├── 넥라인이 원형으로 절단됨
├── u_body의 원형 넥라인과 정확히 매치
└── std_a, cft_c 넥과 완벽 연결

V넥 (V-Neck):
├── 넥라인이 V자로 깊게 절단됨
├── v_body의 V자 넥라인과 정확히 매치
└── std_b, cft_b 넥과 완벽 연결

특수 V넥 (Shallow V):
├── 얕은 V자로 절단됨
├── u_v_body의 특수 넥라인과 정확히 매치
└── cft_d 넥과 완벽 연결
```

#### 원리 2: 3D 메쉬 연결점
```
┌─────────────────────────────────────────────────┐
│              넥 부품 (Neck Part)                │
│     ┌───────────────────────────────────┐       │
│     │          넥라인 경계              │       │
│     └─────────────┬───────────────────┘       │
└───────────────────┼─────────────────────────────┘
                    │ (연결점)
┌───────────────────┼─────────────────────────────┐
│                   │                             │
│            전면 몸체 (Front Body)               │
│     ┌─────────────┴───────────────────┐       │
│     │          몸체 넥라인            │       │
│     │      (넥 부품과 정확히 일치)     │       │
│     └─────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

### 넥-몸체 조합 상세 매핑

#### 그룹 A: 일반 넥라인 그룹
```
std_a + u_body:
물리적 연결:
├── std_a의 원형 넥라인
├── u_body의 원형 절단면
├── 완벽한 원형 매칭
└── 심리스 연결

cft_c + u_body:
물리적 연결:
├── cft_c의 편안한 원형 넥라인
├── u_body의 원형 절단면
├── 여유있는 원형 매칭
└── 컴포트 핏 연결
```

#### 그룹 B: V넥라인 그룹
```
std_b + v_body:
물리적 연결:
├── std_b의 표준 V자 넥라인
├── v_body의 V자 절단면
├── 정확한 V자 각도 매칭
└── 세미 포멀 연결

cft_b + v_body:
물리적 연결:
├── cft_b의 편안한 V자 넥라인
├── v_body의 V자 절단면
├── 부드러운 V자 매칭
└── 캐주얼 핏 연결
```

#### 그룹 C: 특수 넥라인 그룹
```
cft_d + u_v_body:
물리적 연결:
├── cft_d의 특수 얕은 V자
├── u_v_body의 맞춤 절단면
├── 독특한 디자인 매칭
└── 프리미엄 연결
```

## 바지 구조 (Pants Structure)

### 바지의 단순성
```
바지 = pants.glb (단일 파일)

물리적 범위:
├── 허리 밴드 (Waistband)
├── 엉덩이 부분 (Hip)
├── 허벅지 (Thigh)
├── 무릎 (Knee)
├── 종아리 (Calf)
└── 발목 (Ankle)

특징:
- 모든 조합에서 동일
- 디자인 타입 구분 없음
- 넥이나 팔과 무관한 독립 부품
```

### 바지가 단순한 이유
```
실제 유니폼에서:
├── 바지는 표준화된 디자인
├── 상의와 독립적인 의류
├── 색상/패턴만 변경
└── 구조적 변형 불필요

3D 모델에서:
├── 하나의 GLB로 충분
├── 텍스처로 모든 변형 처리
├── 메모리 효율성 극대화
└── 렌더링 성능 최적화
```

## 디자인 타입별 구조 차이

### Regulan vs Set-in의 물리적 차이

#### Regulan (레귤러) - `reg_*` 시리즈
```
물리적 특성:
├── 전통적인 셔츠 구조
├── 일반적인 소매 연결
├── 표준적인 핏
└── 클래식한 비율

파일 구조:
reg_back_body.glb     (후면 - 레귤러 스타일)
reg_u_body.glb        (전면 - 일반형)
reg_v_body.glb        (전면 - V넥형)
reg_u_v_body.glb      (전면 - 특수형)
reg_std_a.glb         (넥 - 표준A)
reg_std_b.glb         (넥 - 표준B)
reg_cft_b.glb         (넥 - 컴포트B)
reg_cft_c.glb         (넥 - 컴포트C)
reg_cft_d.glb         (넥 - 컴포트D)
reg_short_arms.glb    (팔 - 반팔)
reg_long_arms.glb     (팔 - 긴팔)
```

#### Set-in (세트인) - `setin_*` 시리즈
```
물리적 특성:
├── 세트인 소매 구조
├── 정교한 소매 연결
├── 모던한 핏
└── 프리미엄 비율

파일 구조:
setin_back_body.glb   (후면 - 세트인 스타일)
setin_u_body.glb      (전면 - 일반형)
setin_v_body.glb      (전면 - V넥형)
setin_u_v_body.glb    (전면 - 특수형)
setin_std_a.glb       (넥 - 표준A)
setin_std_b.glb       (넥 - 표준B)
setin_cft_b.glb       (넥 - 컴포트B)
setin_cft_c.glb       (넥 - 컴포트C)
setin_cft_d.glb       (넥 - 컴포트D)
setin_short_arms.glb  (팔 - 반팔)
setin_long_arms.glb   (팔 - 긴팔)
```

### 두 시리즈의 구조적 동일성
```
중요: Regulan과 Set-in은 구조는 동일하고 스타일만 다름

동일한 조합 규칙:
├── 넥-몸체 매핑 규칙 완전 동일
├── 4부품 조합 방식 완전 동일
├── 파일명 패턴 완전 동일 (접두사만 다름)
└── 물리적 연결 방식 완전 동일

차이점은 오직:
├── 3D 모델링 스타일
├── 핏과 비율
└── 디테일 요소들
```

## 조합 생성의 물리적 과정

### 1단계: 기본 프레임 구성
```
1. 후면 몸체 배치
   reg_back_body.glb → 3D 공간에 로드

2. 전면 몸체 선택 및 배치
   넥 타입 확인 → 매핑 테이블 조회 → 해당 전면몸체 로드
   예: std_a → u_body.glb

3. 몸체 연결
   후면몸체 ←연결→ 전면몸체 (어깨와 옆구리에서 연결)
```

### 2단계: 넥 부분 연결
```
4. 넥 부품 로드
   선택된 넥 타입의 GLB 파일 로드
   예: std_a.glb

5. 넥-몸체 연결
   넥부품의 하단 ←연결→ 전면몸체의 넥라인
   넥부품의 후면 ←연결→ 후면몸체의 어깨
```

### 3단계: 팔 부분 연결
```
6. 팔 길이 결정
   세트 옵션 확인 → 반팔 or 긴팔 결정

7. 팔 부품 로드 및 연결
   팔부품의 어깨 ←연결→ 전면몸체의 어깨
   팔부품의 등쪽 ←연결→ 후면몸체의 어깨
```

### 4단계: 하의 추가
```
8. 바지 로드 (선택적)
   pants.glb → 3D 공간에 배치

9. 상하의 배치
   셔츠: 상단 위치
   바지: 하단 위치 (허리에서 자연스럽게 연결)
```

### 최종 결과
```
완성된 유니폼 = 조합된 5개 GLB 파일
├── 1개 후면몸체 GLB
├── 1개 전면몸체 GLB
├── 1개 넥부품 GLB
├── 1개 팔부품 GLB
└── 1개 바지 GLB (선택적)

모든 부품이 물리적으로 정확히 연결되어
완전한 3D 유니폼 형성
```

이러한 **물리적 구조 기반의 모듈화 시스템**을 통해 실제 의류 제작 과정을 정확히 재현하면서도, 3D 환경에서의 효율적인 조합과 렌더링을 실현합니다.

## 파일 명명 규칙 (File Naming Convention)

### 기본 구조
```
{design_type}_{part_type}_{variant}.glb
```

### 디자인 타입 접두사 (Design Type Prefix)
- **`reg_`** : Regulan (레귤러) 스타일
- **`setin_`** : Set-in (세트인) 스타일

### 부품 타입 (Part Types)

#### 1. 몸체 부품 (Body Parts)
```
back_body     - 후면 몸체 (등 부분)
u_body        - 상단 몸체 (일반형)
u_v_body      - 상단 몸체 (V넥용)
v_body        - V넥 몸체
```

#### 2. 팔 부품 (Arm Parts)
```
short_arms    - 반팔
long_arms     - 긴팔
```

#### 3. 넥 부품 (Neck Parts)
```
std_a         - 표준 넥 A형
std_b         - 표준 넥 B형
cft_b         - 컴포트 넥 B형
cft_c         - 컴포트 넥 C형
cft_d         - 컴포트 넥 D형
```

#### 4. 공통 부품 (Common Parts)
```
pants         - 하의 (바지) - 접두사 없음
```

## 모델 그룹핑 시스템

### 1. 기본 유니폼 구성 요소
완전한 유니폼은 **4개의 상의 부품 + 1개의 하의 부품**으로 구성됩니다:

```
유니폼 = 후면몸체 + 넥부품 + 전면몸체 + 팔부품 + 하의
```

### 2. 상의 4부품 시스템 (4-Part Shirt System)

#### 구성도:
```
    [넥 부품]
        |
[전면 몸체] - [팔 부품]
        |
   [후면 몸체]
```

#### 예시 조합:
```javascript
// Regulan 반팔 세트
const regularShortSet = [
    'reg_back_body.glb',    // 1. 후면 몸체
    'reg_std_a.glb',        // 2. 넥 부품
    'reg_u_body.glb',       // 3. 전면 몸체
    'reg_short_arms.glb',   // 4. 팔 부품
    'pants.glb'             // 5. 하의
];
```

## 넥 타입과 몸체 타입 매핑 규칙

### 중요한 조합 규칙:
**넥 타입에 따라 호환되는 전면 몸체가 결정됩니다.**

```javascript
const neckToFrontBodyMap = {
    'std_a': 'u_body',      // 표준A → 일반 상단몸체
    'cft_c': 'u_body',      // 컴포트C → 일반 상단몸체
    'cft_b': 'v_body',      // 컴포트B → V넥 몸체
    'std_b': 'v_body',      // 표준B → V넥 몸체
    'cft_d': 'u_v_body'     // 컴포트D → V넥용 상단몸체
};
```

### 넥-몸체 조합 상세:

#### 그룹 1: 일반 상단 몸체 (`u_body`)
- **std_a** (표준 넥 A형) + **u_body** (일반 상단몸체)
- **cft_c** (컴포트 넥 C형) + **u_body** (일반 상단몸체)

```javascript
// 예시: 표준A 넥 조합
const stdACombo = [
    'reg_back_body.glb',    // 후면
    'reg_std_a.glb',        // 넥: 표준A
    'reg_u_body.glb',       // 전면: 일반 상단몸체
    'reg_short_arms.glb'    // 팔
];
```

#### 그룹 2: V넥 몸체 (`v_body`)
- **cft_b** (컴포트 넥 B형) + **v_body** (V넥 몸체)
- **std_b** (표준 넥 B형) + **v_body** (V넥 몸체)

```javascript
// 예시: 컴포트B 넥 조합
const cftBCombo = [
    'reg_back_body.glb',    // 후면
    'reg_cft_b.glb',        // 넥: 컴포트B
    'reg_v_body.glb',       // 전면: V넥 몸체
    'reg_short_arms.glb'    // 팔
];
```

#### 그룹 3: V넥용 상단 몸체 (`u_v_body`)
- **cft_d** (컴포트 넥 D형) + **u_v_body** (V넥용 상단몸체)

```javascript
// 예시: 컴포트D 넥 조합
const cftDCombo = [
    'reg_back_body.glb',    // 후면
    'reg_cft_d.glb',        // 넥: 컴포트D
    'reg_u_v_body.glb',     // 전면: V넥용 상단몸체
    'reg_short_arms.glb'    // 팔
];
```

## 후면 몸체 (back_body) 사용법

### 공통 사용:
- **모든 조합에 `back_body`가 포함됩니다**
- Regulan과 Set-in 각각 별도의 후면 몸체 파일 존재:
  - `reg_back_body.glb` (Regulan용)
  - `setin_back_body.glb` (Set-in용)

### 역할:
```
back_body = 유니폼의 뒷면 전체
         = 어깨 뒷부분 + 등 + 허리 뒷부분
```

### 다른 부품과의 관계:
```
전면 몸체 (u_body/v_body/u_v_body) ←→ 후면 몸체 (back_body)
                    ↑
                 넥 부품이 연결
                    ↑
                 팔 부품이 연결
```

## 팔 그룹 (Arms Group)

### 팔 길이 결정:
```javascript
const armLength = setOption.includes('long') ? 'long_arms' : 'short_arms';
```

### 팔 타입별 사용:

#### 반팔 (short_arms)
```javascript
// 반팔 세트들
'short-shirt-set'  → 'short_arms'
'short-shirt'      → 'short_arms'
```

#### 긴팔 (long_arms)
```javascript
// 긴팔 세트들
'long-shirt-set'   → 'long_arms'
'long-shirt'       → 'long_arms'
```

### 팔 부품의 독립성:
- **팔 부품은 넥 타입과 무관**하게 선택됩니다
- 오직 세트 옵션(반팔/긴팔)에 의해서만 결정됩니다

```javascript
// 예시: 같은 넥이지만 다른 팔 길이
const shortArmCombo = ['reg_back_body.glb', 'reg_std_a.glb', 'reg_u_body.glb', 'reg_short_arms.glb'];
const longArmCombo  = ['reg_back_body.glb', 'reg_std_a.glb', 'reg_u_body.glb', 'reg_long_arms.glb'];
```

## 전체 모델 조합 매트릭스

### Regulan 시리즈 조합표:

| 넥 타입 | 전면 몸체 | 후면 몸체 | 팔 부품 | 하의 |
|---------|-----------|-----------|---------|------|
| std_a   | u_body    | back_body | short/long_arms | pants |
| std_b   | v_body    | back_body | short/long_arms | pants |
| cft_b   | v_body    | back_body | short/long_arms | pants |
| cft_c   | u_body    | back_body | short/long_arms | pants |
| cft_d   | u_v_body  | back_body | short/long_arms | pants |

### Set-in 시리즈 조합표:
(Regulan과 동일한 구조, 접두사만 `setin_`로 변경)

| 넥 타입 | 전면 몸체 | 후면 몸체 | 팔 부품 | 하의 |
|---------|-----------|-----------|---------|------|
| std_a   | u_body    | back_body | short/long_arms | pants |
| std_b   | v_body    | back_body | short/long_arms | pants |
| cft_b   | v_body    | back_body | short/long_arms | pants |
| cft_c   | u_body    | back_body | short/long_arms | pants |
| cft_d   | u_v_body  | back_body | short/long_arms | pants |

## 세트 옵션별 모델 조합

### 1. 풀 세트 (Full Set)
```javascript
// short-shirt-set, long-shirt-set
const fullSet = [
    `${prefix}_back_body.glb`,      // 후면 몸체
    `${prefix}_${neckType}.glb`,    // 넥 부품
    `${prefix}_${frontBodyType}.glb`, // 전면 몸체 (넥에 따라)
    `${prefix}_${armLength}.glb`,   // 팔 부품 (길이에 따라)
    'pants.glb'                     // 하의
];
```

### 2. 상의 전용 (Shirt Only)
```javascript
// short-shirt, long-shirt
const shirtOnly = [
    `${prefix}_back_body.glb`,      // 후면 몸체
    `${prefix}_${neckType}.glb`,    // 넥 부품
    `${prefix}_${frontBodyType}.glb`, // 전면 몸체
    `${prefix}_${armLength}.glb`    // 팔 부품
    // pants.glb 제외
];
```

### 3. 하의 전용 (Pants Only)
```javascript
// pants
const pantsOnly = [
    'pants.glb'  // 하의만
];
```

## 실제 조합 예시

### 예시 1: Regulan 표준A 반팔 세트
```javascript
const combo1 = [
    'reg_back_body.glb',    // 후면 몸체
    'reg_std_a.glb',        // 표준A 넥
    'reg_u_body.glb',       // 일반 상단몸체 (std_a → u_body)
    'reg_short_arms.glb',   // 반팔
    'pants.glb'             // 하의
];
```

### 예시 2: Set-in 컴포트B 긴팔 세트
```javascript
const combo2 = [
    'setin_back_body.glb',  // 후면 몸체 (Set-in)
    'setin_cft_b.glb',      // 컴포트B 넥
    'setin_v_body.glb',     // V넥 몸체 (cft_b → v_body)
    'setin_long_arms.glb',  // 긴팔
    'pants.glb'             // 하의
];
```

### 예시 3: Regulan 컴포트D 반팔 (상의만)
```javascript
const combo3 = [
    'reg_back_body.glb',    // 후면 몸체
    'reg_cft_d.glb',        // 컴포트D 넥
    'reg_u_v_body.glb',     // V넥용 상단몸체 (cft_d → u_v_body)
    'reg_short_arms.glb'    // 반팔
    // 하의 제외 (shirt-only 모드)
];
```

## 메쉬 명명 규칙 (Mesh Naming in GLB Files)

각 GLB 파일 내부의 메쉬들은 다음과 같은 패턴을 따릅니다:

### 내부 메쉬 구조 예상:
```javascript
// reg_back_body.glb 내부
{
    meshes: [
        'back_body_mesh',      // 메인 후면 몸체 메쉬
        'back_seam_mesh',      // 솔기 메쉬 (옵션)
        'back_detail_mesh'     // 디테일 메쉬 (옵션)
    ]
}

// reg_std_a.glb 내부
{
    meshes: [
        'neck_std_a_mesh',     // 표준A 넥 메쉬
        'collar_mesh',         // 칼라 메쉬 (옵션)
    ]
}

// reg_u_body.glb 내부
{
    meshes: [
        'front_body_mesh',     // 전면 몸체 메쉬
        'front_detail_mesh'    // 전면 디테일 메쉬 (옵션)
    ]
}
```

## 텍스처 공유 시스템과 모델 구조

### 공유 재질 적용:
모든 GLB 모델의 메쉬는 **동일한 공유 텍스처**를 사용합니다:

```javascript
// ModelCache에서 모든 모델에 공유 재질 적용
applySharedTextureToModel(scene) {
    scene.traverse((child) => {
        if (child.isMesh && child.material) {
            // 모든 메쉬에 동일한 공유 재질 적용
            child.material = this.sharedMaterial;
        }
    });
}
```

### UV 매핑 일관성:
- 모든 GLB 모델의 UV 좌표가 **동일한 텍스처 공간**을 참조
- 패턴, 로고, 텍스트가 모든 부품에 일관되게 표시
- 부품별 개별 텍스처가 아닌 **통합 텍스처 시스템** 사용

## 요약

### 핵심 구조 규칙:
1. **4부품 상의 시스템**: 후면몸체 + 넥부품 + 전면몸체 + 팔부품
2. **넥-몸체 매핑**: 넥 타입이 전면 몸체 타입을 결정
3. **디자인 타입 분리**: Regulan(`reg_`)과 Set-in(`setin_`) 완전 독립
4. **공통 하의**: `pants.glb`는 모든 조합에서 동일
5. **팔 길이 독립**: 팔 부품은 세트 옵션에만 의존, 넥 타입 무관

### 조합 생성 공식:
```
최종모델 = 후면몸체 + 넥부품 + 매핑된전면몸체 + 선택된팔부품 + [하의]
```

이러한 모듈화된 구조를 통해 수십 가지의 유니폼 변형을 효율적으로 관리하고 실시간으로 조합할 수 있습니다.