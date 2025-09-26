# GLB 결합 시스템 종합 설명서

## 개요

ST Configurator의 GLB 결합 시스템은 여러 개의 3D 모델 파일(GLB)을 동적으로 조합하여 완성된 유니폼을 생성하는 고급 3D 렌더링 시스템입니다. 이 시스템은 모듈화된 아키텍처를 통해 효율적인 메모리 관리와 실시간 텍스처 공유를 구현합니다.

## 핵심 구성 요소

### 1. SceneManager (장면 관리자)
3D 장면의 전체적인 관리를 담당하는 핵심 컴포넌트입니다.

**주요 기능:**
- Three.js 장면, 카메라, 렌더러 초기화
- GLB 모델 로딩 및 관리
- 하이브리드 GLB 시스템 조정
- 텍스처 공유 및 업데이트

### 2. ModelCache (모델 캐시)
모든 GLB 모델을 메모리에 효율적으로 저장하고 관리하는 시스템입니다.

**주요 기능:**
- 모든 GLB 파일 사전 로딩
- 메모리 최적화를 위한 인스턴스 관리
- 공유 텍스처 시스템 구현
- 모델 가시성 동적 제어

### 3. LayerManager (레이어 관리자)
텍스처 생성 및 레이어 관리를 담당합니다.

**주요 기능:**
- 패턴 텍스처 생성
- 텍스트/로고 레이어 관리
- 텍스처 캔버스 조합
- ModelCache와의 텍스처 공유

## 시스템 아키텍처

```
┌─────────────────┐    텍스처 공유    ┌─────────────────┐
│   LayerManager  │◄──────────────────│   ModelCache    │
│                 │                   │                 │
│ - 패턴 생성     │                   │ - GLB 캐싱      │
│ - 텍스처 조합   │                   │ - 인스턴스 관리 │
│ - 레이어 관리   │                   │ - 가시성 제어   │
└─────────────────┘                   └─────────────────┘
         △                                     △
         │                                     │
         └─────────────┐     ┌─────────────────┘
                       │     │
                ┌─────────────────┐
                │  SceneManager   │
                │                 │
                │ - 장면 조정     │
                │ - 모델 로딩     │
                │ - 렌더링 관리   │
                └─────────────────┘
```

## GLB 모델 구조

### 유니폼 유형별 분류

**1. Regulan (레귤러) 시리즈**
```
reg_back_body.glb     - 후면 몸체
reg_u_body.glb        - 상단 몸체 (일반)
reg_u_v_body.glb      - 상단 몸체 (V넥)
reg_v_body.glb        - V넥 몸체
reg_std_a.glb         - 표준 넥 A타입
reg_std_b.glb         - 표준 넥 B타입
reg_cft_b.glb         - 컴포트 넥 B타입
reg_cft_c.glb         - 컴포트 넥 C타입
reg_cft_d.glb         - 컴포트 넥 D타입
reg_short_arms.glb    - 반팔
reg_long_arms.glb     - 긴팔
```

**2. Set-in (세트인) 시리즈**
```
setin_back_body.glb   - 후면 몸체
setin_u_body.glb      - 상단 몸체 (일반)
setin_u_v_body.glb    - 상단 몸체 (V넥)
setin_v_body.glb      - V넥 몸체
setin_std_a.glb       - 표준 넥 A타입
setin_std_b.glb       - 표준 넥 B타입
setin_cft_b.glb       - 컴포트 넥 B타입
setin_cft_c.glb       - 컴포트 넥 C타입
setin_cft_d.glb       - 컴포트 넥 D타입
setin_short_arms.glb  - 반팔
setin_long_arms.glb   - 긴팔
```

**3. 공통 부품**
```
pants.glb             - 하의 (바지)
```

## 모델 조합 시스템

### 1. 세트 옵션별 조합

#### Short Shirt Set (반팔 셔츠 세트)
```javascript
// Regulan 반팔 세트 예시
const shortShirtSet = [
    'reg_u_body.glb',        // 상단 몸체
    'reg_back_body.glb',     // 후면 몸체
    'reg_short_arms.glb',    // 반팔
    'reg_std_a.glb',         // 넥 타입 (선택에 따라 변경)
    'pants.glb'              // 하의
];

// Set-in 반팔 세트 예시
const setinShortShirtSet = [
    'setin_u_body.glb',      // 상단 몸체
    'setin_back_body.glb',   // 후면 몸체
    'setin_short_arms.glb',  // 반팔
    'setin_std_a.glb',       // 넥 타입
    'pants.glb'              // 하의
];
```

#### Long Shirt Set (긴팔 셔츠 세트)
```javascript
// Regulan 긴팔 세트
const longShirtSet = [
    'reg_u_body.glb',        // 상단 몸체
    'reg_back_body.glb',     // 후면 몸체
    'reg_long_arms.glb',     // 긴팔
    'reg_cft_b.glb',         // 넥 타입
    'pants.glb'              // 하의
];
```

#### V-Neck Set (V넥 세트)
```javascript
// V넥 세트 조합
const vNeckSet = [
    'reg_u_v_body.glb',      // V넥 상단 몸체
    'reg_back_body.glb',     // 후면 몸체
    'reg_short_arms.glb',    // 팔 부분
    'pants.glb'              // 하의
];
```

### 2. 동적 모델 조합 로직

```javascript
// main.js의 모델 조합 함수 예시
getModelCombinationForSet(setOption, designType = 'regulan', neckType = 'std_a') {
    const prefix = designType === 'setin' ? 'setin' : 'reg';

    const combinations = {
        'short-shirt-set': [
            `${prefix}_u_body.glb`,
            `${prefix}_back_body.glb`,
            `${prefix}_short_arms.glb`,
            `${prefix}_${neckType}.glb`,
            'pants.glb'
        ],
        'long-shirt-set': [
            `${prefix}_u_body.glb`,
            `${prefix}_back_body.glb`,
            `${prefix}_long_arms.glb`,
            `${prefix}_${neckType}.glb`,
            'pants.glb'
        ],
        'v-neck-set': [
            `${prefix}_u_v_body.glb`,
            `${prefix}_back_body.glb`,
            `${prefix}_short_arms.glb`,
            'pants.glb'
        ]
    };

    return combinations[setOption] || combinations['short-shirt-set'];
}
```

## 텍스처 공유 시스템

### 1. 하이브리드 GLB 시스템 개념

모든 GLB 모델이 하나의 공유 텍스처를 사용하여 일관된 외관을 유지하면서 메모리 효율성을 극대화합니다.

```javascript
// ModelCache에서의 텍스처 공유 구현
setSharedTextureCanvas(canvas) {
    this.sharedTextureCanvas = canvas;

    // 모든 모델에 공유 텍스처 적용
    this.updateSharedTextureForAll();
}

updateSharedTextureForAll() {
    if (!this.sharedTextureCanvas) return;

    // 모든 캐시된 모델의 재질에 공유 텍스처 적용
    for (const [filename, modelData] of this.cache) {
        this.applySharedTextureToModel(modelData.scene);
    }
}
```

### 2. 텍스처 업데이트 프로세스

```mermaid
graph TD
    A[LayerManager 텍스처 변경] --> B[Canvas 텍스처 업데이트]
    B --> C[ModelCache.updateSharedTextureForAll()]
    C --> D[모든 GLB 모델에 텍스처 적용]
    D --> E[Three.js 렌더링 업데이트]
```

## 실제 사용 예시

### 예시 1: 기본 반팔 유니폼 생성

```javascript
// 1단계: 기본 설정
const setOption = 'short-shirt-set';
const designType = 'regulan';
const neckType = 'std_a';

// 2단계: 모델 조합 결정
const models = [
    'reg_u_body.glb',        // 상단 몸체
    'reg_back_body.glb',     // 후면 몸체
    'reg_short_arms.glb',    // 반팔
    'reg_std_a.glb',         // 표준 넥
    'pants.glb'              // 하의
];

// 3단계: 모델 로딩 및 표시
await sceneManager.loadModelCombination(models);

// 4단계: 텍스처 적용
layerManager.updateTexture();
```

### 예시 2: Set-in 긴팔 컴포트 넥 유니폼

```javascript
// 고급 조합 예시
const advancedUniform = {
    setOption: 'long-shirt-set',
    designType: 'setin',
    neckType: 'cft_c',

    // 결과 모델 조합
    models: [
        'setin_u_body.glb',      // Set-in 상단 몸체
        'setin_back_body.glb',   // Set-in 후면 몸체
        'setin_long_arms.glb',   // Set-in 긴팔
        'setin_cft_c.glb',       // Set-in 컴포트 C 넥
        'pants.glb'              // 공통 하의
    ]
};

// 조합 적용
await applyUniformConfiguration(advancedUniform);
```

### 예시 3: 동적 디자인 타입 변경

```javascript
// Regulan에서 Set-in으로 변경하는 과정
async function changeDesignType(fromType, toType, currentSet, currentNeck) {
    console.log(`${fromType}에서 ${toType}으로 디자인 타입 변경`);

    // 1단계: 현재 모델 조합 계산
    const oldModels = getModelCombinationForSet(currentSet, fromType, currentNeck);
    const newModels = getModelCombinationForSet(currentSet, toType, currentNeck);

    console.log('이전 모델:', oldModels);
    console.log('새 모델:', newModels);

    // 2단계: 모델 가시성 업데이트 (리로딩 없이)
    sceneManager.setModelSetVisibility(currentSet, toType, currentNeck);

    // 3단계: 패턴 관리자에 변경사항 알림
    patternManager.onDesignTypeChange(toType);

    // 4단계: 텍스처 강제 업데이트
    layerManager.forceTextureUpdate('design-type-change');
}

// 사용 예시
await changeDesignType('regulan', 'setin', 'short-shirt-set', 'std_a');
```

## 성능 최적화 기법

### 1. 모델 사전 로딩
```javascript
// 모든 GLB 파일을 앱 시작시 미리 로딩
async loadAllModels() {
    const allModels = [
        // Regulan 시리즈
        'reg_u_body.glb', 'reg_back_body.glb', 'reg_short_arms.glb',
        'reg_long_arms.glb', 'reg_std_a.glb', 'reg_std_b.glb',
        'reg_cft_b.glb', 'reg_cft_c.glb', 'reg_cft_d.glb',
        'reg_u_v_body.glb', 'reg_v_body.glb',

        // Set-in 시리즈
        'setin_u_body.glb', 'setin_back_body.glb', 'setin_short_arms.glb',
        'setin_long_arms.glb', 'setin_std_a.glb', 'setin_std_b.glb',
        'setin_cft_b.glb', 'setin_cft_c.glb', 'setin_cft_d.glb',
        'setin_u_v_body.glb', 'setin_v_body.glb',

        // 공통 부품
        'pants.glb'
    ];

    for (const modelFile of allModels) {
        await this.loadModel(`./assets/glbs/${modelFile}`);
    }

    console.log(`✅ ${allModels.length}개 모델 사전 로딩 완료`);
}
```

### 2. 메모리 효율적 가시성 관리
```javascript
// 필요한 모델만 표시하고 나머지는 숨김
setModelSetVisibility(setOption, designType, neckType) {
    const activeModels = this.getModelCombinationForSet(setOption, designType, neckType);

    // 모든 모델을 순회하며 가시성 설정
    for (const [filename, modelData] of this.cache) {
        const shouldBeVisible = activeModels.some(activeModel =>
            filename.includes(activeModel.replace('.glb', ''))
        );

        modelData.scene.visible = shouldBeVisible;

        if (shouldBeVisible) {
            console.log(`👁️ 모델 표시: ${filename}`);
        }
    }
}
```

### 3. 텍스처 업데이트 최적화
```javascript
// 텍스처 업데이트 배칭 및 쓰로틀링
scheduleTextureUpdate() {
    if (this.textureUpdateTimeout) {
        return; // 이미 예약된 업데이트가 있음
    }

    this.textureUpdateTimeout = requestAnimationFrame(() => {
        this.updateTexture();
        this.textureUpdateTimeout = null;
    });
}
```

## 디버깅 및 문제 해결

### 일반적인 문제들

**1. 모델이 표시되지 않는 경우**
```javascript
// 디버깅 코드 예시
console.log('현재 활성 모델 조합:', activeModels);
console.log('캐시된 모델 목록:', Array.from(this.cache.keys()));
console.log('각 모델의 가시성 상태:');
for (const [filename, modelData] of this.cache) {
    console.log(`${filename}: ${modelData.scene.visible ? '표시' : '숨김'}`);
}
```

**2. 텍스처가 적용되지 않는 경우**
```javascript
// 텍스처 상태 확인
if (this.sharedTextureCanvas) {
    console.log(`공유 텍스처 캔버스: ${this.sharedTextureCanvas.width}x${this.sharedTextureCanvas.height}`);
} else {
    console.error('공유 텍스처 캔버스가 설정되지 않음');
}
```

**3. 성능 모니터링**
```javascript
// 렌더링 성능 추적
const renderStart = performance.now();
renderer.render(scene, camera);
const renderTime = performance.now() - renderStart;

if (renderTime > 16.67) { // 60fps 기준
    console.warn(`느린 렌더링: ${renderTime.toFixed(2)}ms`);
}
```

## 확장 가능성

### 새로운 모델 추가
```javascript
// 새로운 유니폼 스타일 추가 예시
const newUniformStyle = {
    name: 'casual-set',
    models: {
        'regulan': [
            'reg_casual_body.glb',
            'reg_casual_arms.glb',
            'casual_pants.glb'
        ],
        'setin': [
            'setin_casual_body.glb',
            'setin_casual_arms.glb',
            'casual_pants.glb'
        ]
    }
};
```

### 동적 텍스처 시스템 확장
```javascript
// 부위별 개별 텍스처 지원
const advancedTextureSystem = {
    body: bodyTexture,      // 몸체 전용 텍스처
    arms: armsTexture,      // 팔 전용 텍스처
    pants: pantsTexture,    // 하의 전용 텍스처
    neck: neckTexture       // 넥 전용 텍스처
};
```

## 결론

GLB 결합 시스템은 모듈화된 3D 모델 관리, 효율적인 메모리 사용, 실시간 텍스처 공유를 통해 고성능 유니폼 커스터마이제이션을 구현합니다. 이 시스템의 핵심은 **사전 로딩**, **가시성 기반 관리**, **공유 텍스처**의 3대 원칙을 기반으로 하여 사용자에게 원활하고 반응적인 3D 커스터마이제이션 경험을 제공하는 것입니다.