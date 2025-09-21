/**
 * Korean Language Pack (한국어)
 *
 * Comprehensive Korean translations for the st_configurator application
 * with proper Korean typography, cultural considerations, and professional terminology.
 */

export default {
    // ========================================
    // 메인 네비게이션 및 액션
    // ========================================
    nav: {
        textureEditor: "텍스처 에디터",
        layers: "레이어",
        properties: "속성",
        createOrder: "주문서 작성",
        export: "내보내기",
        import: "가져오기"
    },

    // ========================================
    // 레이어 컨트롤 레이블
    // ========================================
    controls: {
        size: "크기",
        scale: "크기",
        rotation: "회전",
        flipHorizontal: "좌우반전",
        color: "색상",
        opacity: "투명도",
        position: "위치",
        xPosition: "X 위치",
        yPosition: "Y 위치"
    },

    // ========================================
    // 폼 레이블 및 컨트롤
    // ========================================
    form: {
        colorPicker: "색상 선택기",
        textInput: "텍스트 입력",
        imageUpload: "이미지 업로드",
        saveSession: "세션 저장",
        loadSession: "세션 불러오기",
        deleteAll: "모두 삭제",
        reset: "초기화",
        cancel: "취소",
        confirm: "확인",
        save: "저장",
        load: "불러오기",
        delete: "삭제",
        edit: "편집",
        close: "닫기"
    },

    // ========================================
    // 기본 텍스처 섹션
    // ========================================
    baseTexture: {
        title: "기본 텍스처",
        primaryColor: "기본 색상",
        secondaryColor: "보조 색상",
        pattern: "패턴",
        material: "소재"
    },

    // ========================================
    // 레이어 관리
    // ========================================
    layers: {
        title: "레이어",
        addText: "텍스트 추가",
        addLogo: "로고 추가",
        addImage: "이미지 추가",
        moveUp: "위로 이동",
        moveDown: "아래로 이동",
        duplicate: "복제",
        visible: "표시",
        hidden: "숨김",
        locked: "잠금",
        unlocked: "잠금 해제",
        textLayer: "텍스트 레이어",
        logoLayer: "로고 레이어",
        imageLayer: "이미지 레이어"
    },

    // ========================================
    // 주문서 - 섹션 헤더
    // ========================================
    order: {
        title: "주문서",
        orderForm: "주문서 양식",
        selectedOptions: "선택된 옵션",
        customerInfo: "주문자 정보",
        playerInfo: "선수 정보",
        orderSummary: "주문 요약",
        specialRequests: "특별 요청 사항",
        orderDetails: "주문 상세 정보"
    },

    // ========================================
    // 주문서 - 필드 레이블
    // ========================================
    orderFields: {
        orderNumber: "주문번호",
        customerName: "주문자 성명",
        contactInfo: "연락처",
        teamName: "팀명",
        orderDate: "주문일자",
        deliveryDate: "배송 예정일",
        notes: "비고"
    },

    // ========================================
    // 제품 옵션
    // ========================================
    product: {
        uniform: "유니폼",
        neckType: "넥 타입",
        fabric: "원단",
        color: "색상",
        size: "사이즈",
        style: "스타일"
    },

    // ========================================
    // 선수 정보
    // ========================================
    player: {
        number: "번호",
        name: "선수명",
        position: "포지션",
        configuration: "구성",
        sleeveType: "소매 타입",
        topSize: "상의 사이즈",
        bottomSize: "하의 사이즈",
        price: "가격"
    },

    // ========================================
    // 구성 옵션
    // ========================================
    configuration: {
        setTopBottom: "상하의 세트",
        topOnly: "상의만",
        bottomOnly: "하의만",
        shortSleeve: "반소매",
        longSleeve: "긴소매",
        sleeveless: "민소매"
    },

    // ========================================
    // 요약 레이블
    // ========================================
    summary: {
        totalPlayers: "총 선수 수",
        totalSets: "상하의 세트",
        topsOnly: "상의만",
        bottomsOnly: "하의만",
        shortSleeveCount: "반소매",
        longSleeveCount: "긴소매",
        totalPrice: "총 금액",
        subtotal: "소계",
        tax: "세금",
        shipping: "배송비",
        discount: "할인"
    },

    // ========================================
    // 액션 버튼
    // ========================================
    actions: {
        addPlayer: "선수 추가",
        deletePlayer: "선수 삭제",
        editPlayer: "선수 정보 수정",
        saveOrder: "주문서 저장",
        submitOrder: "주문 제출",
        printOrder: "주문서 인쇄",
        exportOrder: "주문서 내보내기"
    },

    // ========================================
    // 플레이스홀더
    // ========================================
    placeholders: {
        enterCustomerName: "주문자 성명을 입력해주세요",
        enterContactInfo: "연락처를 입력해주세요",
        enterTeamName: "팀명을 입력해주세요",
        enterPlayerNumber: "선수 번호",
        enterPlayerName: "선수명",
        selectSize: "사이즈 선택",
        enterSpecialRequests: "특별 요청사항이 있으시면 입력해주세요",
        enterText: "텍스트를 입력하세요",
        searchPlayers: "선수 검색"
    },

    // ========================================
    // 검증 메시지
    // ========================================
    validation: {
        requiredField: "필수 입력 항목",
        missingCustomerName: "주문자 성명",
        missingContactInfo: "연락처",
        missingPlayerInfo: "최소 한 명의 선수 정보 (선수명, 번호)",
        missingPlayerNumber: "선수 번호",
        missingTopSize: "상의 사이즈",
        missingBottomSize: "하의 사이즈",
        missingPlayerName: "선수명",
        invalidEmail: "올바른 이메일 주소를 입력해주세요",
        invalidPhoneNumber: "올바른 전화번호를 입력해주세요",
        duplicatePlayerNumber: "중복된 선수 번호입니다"
    },

    // ========================================
    // 검증 대화상자
    // ========================================
    validationDialog: {
        title: "⚠️ 필수 정보 확인",
        message: "주문서를 저장하기 위해 다음 정보를 입력해주세요:",
        requiredInfo: "📝 필수 정보",
        playerInfoSection: "👥 선수 정보",
        pleaseCompleteInfo: "위 정보를 입력하신 후 다시 저장 버튼을 눌러주세요."
    },

    // ========================================
    // 성공 메시지
    // ========================================
    success: {
        orderSaved: "주문서가 저장되었습니다.",
        sessionRestored: "세션이 복원되었습니다!",
        layerAdded: "레이어가 추가되었습니다.",
        layerDeleted: "레이어가 삭제되었습니다.",
        textureApplied: "텍스처가 적용되었습니다.",
        configurationSaved: "구성이 저장되었습니다.",
        imageUploaded: "이미지가 업로드되었습니다.",
        orderSubmitted: "주문이 제출되었습니다."
    },

    // ========================================
    // 오류 메시지
    // ========================================
    errors: {
        // 기존 오류 메시지
        fileSizeExceeded: "파일 크기 초과",
        fileSizeMessage: "파일 크기가 최대 허용 크기를 초과하여 사용할 수 없습니다.",
        unsupportedFileType: "지원하지 않는 파일 형식입니다.",
        uploadFailed: "업로드에 실패했습니다.",
        networkError: "네트워크 오류가 발생했습니다.",
        serverError: "서버 오류가 발생했습니다.",
        orderSaveFailed: "❌ 주문서 저장 실패: {error}",
        sessionIdMissing: "세션 ID가 없습니다.",
        serverUnavailable: "서버에 연결할 수 없습니다.",
        submissionFailed: "제출에 실패했습니다: {error}",
        loadingFailed: "불러오기에 실패했습니다.",
        processingError: "처리 중 오류가 발생했습니다.",
        appInitializationFailed: "애플리케이션 초기화에 실패했습니다.",
        recoveryFailed: "오류 복구에 실패했습니다.",

        // 표준화된 오류 메시지
        genericError: "예상치 못한 오류가 발생했습니다: {error}",
        runtimeError: "스크립트 실행 중 오류가 발생했습니다",
        unhandledRejection: "처리되지 않은 오류가 발생했습니다",

        // 보안 오류
        security: {
            cspViolation: "콘텐츠 보안 정책 위반이 감지되었습니다",
            unauthorizedAccess: "권한이 없는 접근이 시도되었습니다",
            invalidToken: "인증 토큰이 유효하지 않습니다",
            sessionExpired: "세션이 만료되었습니다"
        },

        // 네트워크 오류
        network: {
            connectionFailed: "서버 연결에 실패했습니다",
            requestTimeout: "요청 시간이 초과되었습니다",
            serverUnavailable: "서버를 사용할 수 없습니다",
            badRequest: "잘못된 요청입니다",
            forbidden: "접근이 거부되었습니다",
            notFound: "요청한 리소스를 찾을 수 없습니다",
            serverError: "서버 내부 오류가 발생했습니다",
            networkTimeout: "네트워크 연결이 시간 초과되었습니다"
        },

        // 파일 처리 오류
        file: {
            fileTooLarge: "파일 크기가 너무 큽니다 ({fileName})",
            unsupportedFormat: "지원하지 않는 파일 형식입니다 ({fileName})",
            uploadFailed: "파일 업로드에 실패했습니다 ({fileName})",
            processingFailed: "파일 처리에 실패했습니다 ({fileName})",
            corruptedFile: "파일이 손상되었거나 읽을 수 없습니다 ({fileName})",
            readError: "파일을 읽는 중 오류가 발생했습니다 ({fileName})",
            conversionFailed: "파일 변환에 실패했습니다 ({fileName})",
            configLoadFailed: "구성 파일 로드에 실패했습니다. 파일 형식을 확인해주세요.",
            batchProcessingFailed: "배치 처리 중 오류가 발생했습니다 ({fileName})"
        },

        // 레이어 관리 오류
        layer: {
            createFailed: "레이어 생성에 실패했습니다 ({layerId})",
            updateFailed: "레이어 업데이트에 실패했습니다 ({layerId})",
            deleteFailed: "레이어 삭제에 실패했습니다 ({layerId})",
            loadFailed: "레이어 로드에 실패했습니다 ({layerId})",
            renderFailed: "레이어 렌더링에 실패했습니다 ({layerId})",
            lockFailed: "레이어 잠금 설정에 실패했습니다 ({layerId})",
            duplicateFailed: "레이어 복제에 실패했습니다 ({layerId})",
            layerNotFound: "레이어를 찾을 수 없습니다 ({layerId})"
        },

        // 세션 관리 오류
        session: {
            createFailed: "세션 생성에 실패했습니다",
            saveFailed: "세션 저장에 실패했습니다",
            loadFailed: "세션 로드에 실패했습니다",
            deleteFailed: "세션 삭제에 실패했습니다",
            expiredSession: "세션이 만료되었습니다",
            invalidSession: "유효하지 않은 세션입니다",
            sessionNotFound: "세션을 찾을 수 없습니다",
            sessionRestoreFailed: "세션 복원에 실패했습니다"
        },

        // 텍스처 처리 오류
        texture: {
            createFailed: "텍스처 생성에 실패했습니다",
            updateFailed: "텍스처 업데이트에 실패했습니다",
            loadFailed: "텍스처 로드에 실패했습니다",
            renderFailed: "텍스처 렌더링에 실패했습니다",
            exportFailed: "텍스처 내보내기에 실패했습니다",
            memoryError: "텍스처 메모리 부족 오류입니다"
        },

        // 3D 모델 오류
        model: {
            loadFailed: "3D 모델 로드에 실패했습니다",
            renderFailed: "3D 모델 렌더링에 실패했습니다",
            invalidFormat: "지원하지 않는 3D 모델 형식입니다",
            missingFile: "3D 모델 파일을 찾을 수 없습니다"
        },

        // 주문 처리 오류
        order: {
            validationFailed: "주문 정보 검증에 실패했습니다",
            saveFailed: "주문 저장에 실패했습니다",
            submitFailed: "주문 제출에 실패했습니다",
            loadFailed: "주문 정보 로드에 실패했습니다",
            emailFailed: "주문 이메일 전송에 실패했습니다"
        },

        // UI 오류
        ui: {
            colorPickerFailed: "색상 선택기 초기화에 실패했습니다",
            clipboardFailed: "클립보드 접근에 실패했습니다",
            clipboardCopyFailed: "클립보드 복사에 실패했습니다",
            renderFailed: "화면 렌더링에 실패했습니다",
            layoutFailed: "레이아웃 처리에 실패했습니다"
        },

        // 오류 복구 액션
        actions: {
            retryUpload: "다시 업로드",
            retryConnection: "재연결",
            recoverSession: "세션 복구",
            recreateLayer: "레이어 재생성",
            reloadPage: "페이지 새로고침",
            contactSupport: "고객 지원 문의",
            reportBug: "버그 신고",
            clearCache: "캐시 지우기"
        }
    },

    // ========================================
    // 상태 메시지
    // ========================================
    status: {
        loading: "로딩 중...",
        saving: "저장 중...",
        processing: "처리 중...",
        uploading: "업로드 중...",
        downloading: "다운로드 중...",
        ready: "준비 완료",
        complete: "완료",
        failed: "실패",
        updatingSessionInfo: "세션 정보를 업데이트하는 중...",
        processingSubmission: "제출 완료 처리 중..."
    },

    // ========================================
    // 변환/처리 메시지
    // ========================================
    conversion: {
        resolutionConverted: "해상도를 {originalWidth}×{originalHeight} 에서 {newWidth}×{newHeight}으로 {fileSize}KB 용량으로 변환하였습니다.",
        imageOptimized: "이미지가 최적화되었습니다.",
        formatConverted: "파일 형식이 변환되었습니다."
    },

    // ========================================
    // 제출 메시지
    // ========================================
    submission: {
        success: "작업물이 성공적으로 제출되었습니다!\n\n공유 URL: {url}\n\nURL을 클릭하면 클립보드에 복사됩니다.",
        urlCopied: "URL이 클립보드에 복사되었습니다.",
        shareTitle: "공유하기"
    },

    // ========================================
    // 파일명
    // ========================================
    fileNames: {
        orderPrefix: "주문서_",
        orderInfoPrefix: "주문정보_",
        sessionPrefix: "세션_",
        exportPrefix: "내보내기_"
    },

    // ========================================
    // 단위
    // ========================================
    units: {
        currency: "원",
        people: "명",
        items: "개",
        pieces: "장",
        sets: "세트",
        cm: "cm",
        mm: "mm",
        inch: "인치",
        degrees: "도"
    },

    // ========================================
    // 기본 제품 옵션
    // ========================================
    defaultProduct: {
        uniform: "ST 커스텀_1",
        neckType: "스탠다드 넥",
        fabric: "프로엑티브"
    },

    // ========================================
    // 접근성 레이블
    // ========================================
    accessibility: {
        skipToMain: "메인 콘텐츠로 건너뛰기",
        appContainer: "3D 유니폼 구성기 응용프로그램",
        mainContent: "3D 유니폼 미리보기 및 컨트롤",
        previewViewport: "3D 미리보기 뷰포트",
        threeDPreview: "3D 유니폼 미리보기 - 화살표 키로 회전, +/- 키로 확대/축소",
        colorWheel: "색상 휠 - 클릭하거나 화살표 키로 색조와 채도 선택",
        brightnessSlider: "밝기 슬라이더",
        resetView: "3D 뷰를 기본 상태로 재설정",
        layerControls: "레이어 속성 컨트롤",
        textureEditorControls: "텍스처 에디터 컨트롤",
        closeDialog: "대화상자 닫기",
        openColorPicker: "색상 선택기 열기",
        fieldOfView: "시야각 (도 단위)",
        layerScale: "레이어 크기 0.1에서 3.0까지",
        layerRotation: "레이어 회전 각도 (도 단위)",
        addNewLayers: "새 레이어 추가",
        exportAndOrderActions: "내보내기 및 주문 작업",
        textureLayersList: "텍스처 레이어 목록",
        addNewTextLayer: "새 텍스트 레이어 추가",
        addNewLogoLayer: "새 로고 레이어 추가",
        createOrderForm: "현재 구성으로 주문서 작성",
        submitConfiguration: "현재 구성 제출"
    },

    // ========================================
    // 키보드 도움말
    // ========================================
    keyboard: {
        title: "키보드 단축키",
        navigation: "네비게이션",
        tabNavigate: "Tab - 컨트롤 간 이동",
        arrowKeys: "화살표 키 - 3D 뷰/메뉴 탐색",
        enterSpace: "Enter/Space - 버튼 활성화",
        deleteKey: "Delete - 선택된 레이어 제거",
        reorderLayers: "Ctrl+↑/↓ - 레이어 순서 변경",
        selectLayer: "Ctrl+1-9 - 번호로 레이어 선택",
        zoom: "+/- - 3D 뷰 확대/축소",
        escape: "Esc - 대화상자 닫기/선택 해제"
    },

    // ========================================
    // 대화상자 제목
    // ========================================
    dialogs: {
        colorPicker: "색상 선택기",
        layerColorPicker: "레이어 색상 선택기",
        fieldOfViewControls: "시야각 컨트롤",
        layerPropertyControls: "레이어 속성 컨트롤",
        orderFormDialog: "주문서 양식 대화상자",
        sessionManager: "세션 관리자",
        confirmDelete: "삭제 확인",
        confirmReset: "초기화 확인"
    },

    // ========================================
    // 확인 메시지
    // ========================================
    confirmations: {
        deleteLayer: "이 레이어를 삭제하시겠습니까?",
        deleteAllLayers: "모든 레이어를 삭제하시겠습니까?",
        resetConfiguration: "모든 설정을 초기화하시겠습니까?",
        discardChanges: "변경 사항을 취소하시겠습니까?",
        overwriteSession: "기존 세션을 덮어쓰시겠습니까?",
        exitWithoutSaving: "저장하지 않고 종료하시겠습니까?"
    },

    // ========================================
    // 툴팁
    // ========================================
    tooltips: {
        addTextLayer: "텍스트 레이어 추가",
        addLogoLayer: "로고 레이어 추가",
        deleteLayer: "레이어 삭제",
        moveLayerUp: "레이어를 위로 이동",
        moveLayerDown: "레이어를 아래로 이동",
        toggleVisibility: "표시/숨김 전환",
        lockLayer: "레이어 잠금/해제",
        resetView: "뷰를 기본 상태로 재설정",
        saveSession: "현재 작업 상태를 세션으로 저장",
        loadSession: "저장된 세션 불러오기"
    },

    // ========================================
    // 언어 설정
    // ========================================
    language: {
        name: "한국어",
        code: "ko",
        direction: "ltr",
        fontFamily: "Noto Sans KR"
    }
};