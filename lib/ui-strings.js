/**
 * Centralized UI Strings for Internationalization
 *
 * This module provides a centralized location for all user-facing text strings,
 * replacing mixed Korean/English interface text with consistent English.
 *
 * Future enhancement: Can be extended to support multiple languages.
 */

export const UI_STRINGS = {
    // Layer Control Labels
    size: "Size",                           // was "크기"
    rotation: "Rotation",                   // was "회전"
    flipHorizontal: "Flip Horizontal",      // was "좌우반전"

    // Main Navigation & Actions
    layers: "Layers",                       // was "레이어"
    properties: "Properties",               // was "속성"
    createOrder: "Create Order",            // was "주문서 작성"

    // Form Labels & Controls
    colorPicker: "Color Picker",
    textInput: "Text Input",
    imageUpload: "Upload Image",
    saveSession: "Save Session",
    loadSession: "Load Session",
    deleteAll: "Delete All",

    // Order Form - Section Headers
    orderForm: "Order Form",                // was "주문서"
    selectedOptions: "Selected Options",    // was "선택된 옵션"
    customerInfo: "Customer Information",   // was "주문자 정보"
    playerInfo: "Player Information",       // was "선수 정보"
    orderSummary: "Order Summary",          // was "주문 요약"
    specialRequests: "Special Requests",    // was "특이사항"

    // Order Form - Field Labels
    orderNumber: "Order Number",            // was "주문번호"
    customerName: "Customer Name",          // was "주문자"
    contactInfo: "Contact Information",     // was "연락처"
    teamName: "Team Name",                  // was "팀명"
    orderDate: "Order Date",                // was "주문일시"

    // Product Options
    uniform: "Uniform",                     // was "유니폼"
    neckType: "Neck Type",                  // was "넥 타입"
    fabric: "Fabric",                       // was "원단"

    // Player Information
    playerNumber: "Number",                 // was "번호"
    playerName: "Player Name",              // was "선수명"
    configuration: "Configuration",         // was "구성"
    sleeveType: "Sleeve Type",             // was "소매타입"
    topSize: "Top Size",                   // was "상의사이즈"
    bottomSize: "Bottom Size",             // was "하의사이즈"
    price: "Price",                        // was "가격"

    // Configuration Options
    setTopBottom: "Top & Bottom Set",       // was "상하의 세트"
    topOnly: "Top Only",                   // was "상의만"
    bottomOnly: "Bottom Only",             // was "하의만"
    shortSleeve: "Short Sleeve",           // was "반소매"
    longSleeve: "Long Sleeve",             // was "긴소매"

    // Summary Labels
    totalPlayers: "Total Players",          // was "총 선수 수"
    totalSets: "Top & Bottom Sets",         // was "상하의 세트"
    topsOnly: "Tops Only",                 // was "상의만"
    bottomsOnly: "Bottoms Only",           // was "하의만"
    shortSleeveCount: "Short Sleeve",      // was "반소매"
    longSleeveCount: "Long Sleeve",        // was "긴소매"
    totalPrice: "Total Price",             // was "총 금액"

    // Action Buttons
    addPlayer: "Add Player",               // was "선수 추가"
    deletePlayer: "Delete",                // was "삭제"
    cancel: "Cancel",                      // was "취소"
    saveOrder: "Save Order",               // was "주문서 저장"

    // Placeholders
    enterCustomerName: "Enter customer name",           // was "주문자 성함을 입력해주세요"
    enterContactInfo: "Enter contact information",      // was "연락처를 입력해주세요"
    enterTeamName: "Enter team name",                   // was "팀명을 입력해주세요"
    enterPlayerNumber: "Number",                        // was "번호"
    enterPlayerName: "Player name",                     // was "선수명"
    selectSize: "Select size",                          // was "사이즈 선택"
    enterSpecialRequests: "Enter any special requests", // was "추가 요청사항이 있으시면 입력해주세요"

    // Validation Messages
    requiredField: "Required field",
    missingCustomerName: "Customer name",              // was "주문자 성함"
    missingContactInfo: "Contact information",         // was "연락처"
    missingPlayerInfo: "At least one player information (name, number)", // was "최소 한 명의 선수 정보 (선수명, 번호)"
    missingPlayerNumber: "Number",                     // was "번호"
    missingTopSize: "Top size",                        // was "상의 사이즈"
    missingBottomSize: "Bottom size",                  // was "하의 사이즈"
    missingPlayerName: "Player name",                  // was "선수명"

    // Validation Dialog
    validationTitle: "⚠️ Required Information",        // was "⚠️ 필수 정보 확인"
    validationMessage: "Please enter the following information to save the order:", // was "주문서를 저장하기 위해 다음 정보를 입력해주세요:"
    requiredInfo: "📝 Required Information",           // was "📝 필수 정보"
    playerInfoSection: "👥 Player Information",       // was "👥 선수 정보"
    pleaseCompleteInfo: "Please complete the above information and try saving again.", // was "위 정보를 입력하신 후 다시 저장 버튼을 눌러주세요."
    confirm: "Confirm",                                // was "확인"

    // Success Messages
    orderSaved: "Order has been saved.",               // was "주문서가 저장되었습니다."
    sessionRestored: "Session has been restored!",    // was "세션이 복원되었습니다!"

    // Error Messages
    fileSizeExceeded: "File size exceeded",           // was "파일 용량 초과"
    fileSizeMessage: "The file size exceeds the maximum allowed limit and cannot be used.", // was "용량이 최대 허용치를 초과하여 사용하실수 없습니다."
    resolutionConverted: "Resolution has been converted from {originalWidth}×{originalHeight} to {newWidth}×{newHeight} with file size of {fileSize}KB.", // was "해상도를 {originalWidth}×{originalHeight} 에서 {newWidth}×{newHeight}으로 {fileSize}KB 용량으로 변환하였습니다."
    updatingSessionInfo: "Updating session information...", // was "세션 정보를 업데이트하는 중..."
    processingSubmission: "Processing submission...",        // was "제출 완료 처리 중..."
    submissionSuccess: "Work has been successfully submitted!\n\nShare URL: {url}\n\nClick the URL to copy to clipboard.", // was "작업물이 성공적으로 제출되었습니다!\n\n공유 URL: {url}\n\nURL을 클릭하면 클립보드에 복사됩니다."
    submissionFailed: "Submission failed: {error}",          // was "제출에 실패했습니다: {error}"
    serverSaveFailed: "Server save failed",                  // was "서버 저장 실패"
    sessionIdMissing: "Session ID is missing.",              // was "세션 ID가 없습니다."
    serverUnavailable: "Server connection is not available.", // was "서버 연결을 사용할 수 없습니다."
    orderSaveFailed: "❌ Order save failed: {error}",        // was "❌ 주문서 저장 실패: {error}"

    // File Names
    orderFilePrefix: "Order_",                         // was "주문서_"
    orderInfoPrefix: "OrderInfo_",                     // was "주문정보_"

    // Units
    currency: "USD",                                   // was "원"
    peopleUnit: " people",                            // was "명"
    itemUnit: " items",                               // was "개"

    // Default Product Options
    defaultUniform: "ST Custom_1",                     // was "ST커스텀_1"
    standardNeck: "Standard Neck",                     // was "스탠다드 넥"
    proActiveFabric: "Pro Active"                     // was "프로엑티브"
};

/**
 * Helper function to get localized string with parameter substitution
 * @param {string} key - The key from UI_STRINGS
 * @param {Object} params - Parameters to substitute in the string
 * @returns {string} - The localized string with parameters substituted
 */
export function getLocalizedString(key, params = {}) {
    let text = UI_STRINGS[key] || key;

    // Simple parameter substitution
    Object.keys(params).forEach(param => {
        const placeholder = `{${param}}`;
        text = text.replace(new RegExp(placeholder, 'g'), params[param]);
    });

    return text;
}

/**
 * Helper function to format currency values
 * @param {number} amount - The numeric amount
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount) {
    return `$${amount.toLocaleString()}`;
}

/**
 * Helper function to format count with units
 * @param {number} count - The numeric count
 * @param {string} unitType - Type of unit ('people' or 'items')
 * @returns {string} - Formatted count string
 */
export function formatCount(count, unitType = 'items') {
    const unit = unitType === 'people' ? UI_STRINGS.peopleUnit : UI_STRINGS.itemUnit;
    return `${count}${unit}`;
}

export default UI_STRINGS;