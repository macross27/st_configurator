// Global registry for managing multiple instances
window.orderFormManagerInstances = window.orderFormManagerInstances || [];

// Cleanup all previous instances
window.orderFormManagerInstances.forEach(instance => {
    if (instance.cleanup) {
        console.log('🧹 Cleaning up old OrderFormManager instance');
        instance.cleanup();
    }
});
window.orderFormManagerInstances = [];

export class OrderFormManager {
    constructor(options = {}) {
        console.log('🟡 OrderFormManager constructor called', new Error().stack);
        
        // Generate unique instance ID
        this.instanceId = `ofm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('🆔 Instance ID:', this.instanceId);
        this.isOpen = false;
        this.customerName = '';
        this.customerPhone = '';
        this.teamName = '';
        this.orderNumber = '';
        this.specialRequests = '';
        this.sessionManager = options.sessionManager;
        this.serverApiClient = options.serverApiClient;
        this.showNotification = options.showNotification;
        this.eventsBound = false; // Flag to prevent duplicate event binding
        this.lastClickTime = 0; // Timestamp-based debounce for clicks
        this.clickDebounceMs = 100; // Minimum time between clicks
        this.players = [
            {
                id: '1',
                name: '',
                number: '',
                type: 'set',
                sleeveType: 'short',
                topSize: '',
                bottomSize: ''
            }
        ];
        
        this.selectedOptions = {
            uniform: 'ST커스텀_1',
            neck: '스탠다드 넥',
            fabric: '프로엑티브'
        };
        
        this.init();
        
        // Add this instance to the global registry
        window.orderFormManagerInstances.push(this);
    }
    
    init() {
        this.bindEvents();
        this.bindFormEvents(); // Bind form events once during initialization
        this.preloadOrderData();
    }

    async preloadOrderData() {
        if (!this.serverApiClient || !this.sessionManager) {
            return;
        }

        try {
            const currentSessionId = this.sessionManager.getCurrentSessionId();
            if (!currentSessionId) {
                return;
            }

            const serverUrl = this.serverApiClient.serverUrl;
            const response = await fetch(`${serverUrl}/api/sessions/${currentSessionId}/orders`);
            
            if (response.ok) {
                const result = await response.json();
                const orders = result.orders || [];
                
                if (orders.length > 0) {
                    // Load the most recent order data
                    const latestOrder = orders[orders.length - 1];
                    this.loadOrderData(latestOrder);
                }
            }
        } catch (error) {
            console.log('No existing order data to preload or error loading:', error);
        }
    }

    loadOrderData(orderData) {
        this.customerName = orderData.customerName || '';
        this.customerPhone = orderData.customerPhone || '';
        this.teamName = orderData.teamName || '';
        this.specialRequests = orderData.specialRequests || '';
        
        if (orderData.players && orderData.players.length > 0) {
            this.players = orderData.players.map((player, index) => ({
                id: player.id || `player-${Date.now()}-${index}`,
                name: player.name || '',
                number: player.number || '',
                type: player.type || 'set',
                sleeveType: player.sleeveType || 'short',
                topSize: player.topSize || '',
                bottomSize: player.bottomSize || ''
            }));
        }

        if (orderData.selectedOptions) {
            this.selectedOptions = { ...this.selectedOptions, ...orderData.selectedOptions };
        }

        console.log('Preloaded order data:', orderData);
    }
    
    bindEvents() {
        const orderBtn = document.getElementById('order-btn');
        const closeBtn = document.getElementById('order-modal-close');
        const modalOverlay = document.getElementById('order-modal');
        
        if (orderBtn) {
            orderBtn.addEventListener('click', async () => await this.openModal());
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }
    }
    
    async openModal() {
        this.isOpen = true;
        this.loadPlayerData(); // Restore player data from localStorage
        await this.updateOrderNumber(); // Generate initial order number
        this.renderForm();
        const modal = document.getElementById('order-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal() {
        this.isOpen = false;
        this.savePlayerData(); // Save player data to localStorage
        const modal = document.getElementById('order-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    savePlayerData() {
        try {
            localStorage.setItem('orderFormPlayers', JSON.stringify(this.players));
        } catch (e) {
            console.warn('Failed to save player data to localStorage:', e);
        }
    }
    
    loadPlayerData() {
        try {
            const savedPlayers = localStorage.getItem('orderFormPlayers');
            if (savedPlayers) {
                this.players = JSON.parse(savedPlayers);
            }
        } catch (e) {
            console.warn('Failed to load player data from localStorage:', e);
        }
    }
    
    async generateOrderNumber() {
        if (!this.customerName || !this.customerPhone || !this.sessionManager) {
            return '';
        }
        
        // Get or create session ID
        let sessionId = this.sessionManager.getCurrentSessionId();
        if (!sessionId) {
            try {
                sessionId = await this.sessionManager.createNewSession();
                console.log(`✅ Created new session for order: ${sessionId}`);
            } catch (error) {
                console.error('Failed to create session for order:', error);
                sessionId = 'NOSESSION';
            }
        }
        
        // Clean customer name (remove spaces and special characters)
        const cleanName = this.customerName.replace(/[^가-힣a-zA-Z0-9]/g, '');
        
        // Extract only numbers from phone
        const phoneNumbers = this.customerPhone.replace(/[^0-9]/g, '');
        
        return `${sessionId}_${cleanName}_${phoneNumbers}`;
    }
    
    async updateOrderNumber() {
        this.orderNumber = await this.generateOrderNumber();
        
        const orderNumberInput = document.getElementById('order-number');
        if (orderNumberInput) {
            orderNumberInput.value = this.orderNumber;
        }
    }
    
    addPlayer() {
        const newPlayer = {
            id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: '',
            number: '',
            type: 'set',
            sleeveType: 'short',
            topSize: '',
            bottomSize: ''
        };
        this.players.push(newPlayer);
        
        this.updatePlayerListDOM();
        this.updateOrderSummary();
        this.savePlayerData(); // Save data after adding player
    }
    
    removePlayer(id) {
        if (this.players.length > 1) {
            this.players = this.players.filter(player => player.id !== id);
            this.updatePlayerListDOM();
            this.updateOrderSummary();
            this.savePlayerData(); // Save data after removing player
        }
    }
    
    updatePlayer(id, field, value) {
        const player = this.players.find(p => p.id === id);
        if (player) {
            player[field] = value;
            this.updateOrderSummary();
        }
    }
    
    renderForm() {
        const modalBody = document.querySelector('.modal-body');
        if (!modalBody) return;
        
        modalBody.innerHTML = `
            <div class="order-form">
                ${this.renderOrderFormHeader()}
                ${this.renderCustomerInfo()}
                ${this.renderPlayerSection()}
                ${this.renderSpecialRequests()}
                ${this.renderOrderSummary()}
                ${this.renderFormActions()}
            </div>
        `;
    }
    
    renderOrderFormHeader() {
        return `
            <div class="form-section">
                <h3 class="section-title">선택된 옵션</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">유니폼</label>
                        <input type="text" class="form-input" value="${this.selectedOptions.uniform}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">넥 타입</label>
                        <input type="text" class="form-input" value="${this.selectedOptions.neck}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">원단</label>
                        <input type="text" class="form-input" value="${this.selectedOptions.fabric}" readonly>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCustomerInfo() {
        return `
            <div class="form-section">
                <h3 class="section-title">주문자 정보</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">주문자 성함 *</label>
                        <input type="text" id="customer-name" class="form-input" value="${this.customerName}" placeholder="주문자 성함을 입력해주세요">
                    </div>
                    <div class="form-group">
                        <label class="form-label">연락처 *</label>
                        <input type="text" id="customer-phone" class="form-input" value="${this.customerPhone}" placeholder="연락처를 입력해주세요">
                    </div>
                    <div class="form-group">
                        <label class="form-label">팀명</label>
                        <input type="text" id="team-name" class="form-input" value="${this.teamName}" placeholder="팀명을 입력해주세요">
                    </div>
                    <div class="form-group">
                        <label class="form-label">주문번호</label>
                        <input type="text" id="order-number" class="form-input" value="${this.orderNumber}" readonly>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPlayerSection() {
        return `
            <div class="form-section">
                <h3 class="section-title">선수 정보</h3>
                <button type="button" class="add-player-btn" id="add-player-btn">선수 추가</button>
                <div class="players-section" id="players-list">
                    ${this.getPlayerListHTML()}
                </div>
            </div>
        `;
    }
    
    getPlayerListHTML() {
        return this.players.map(player => `
            <div class="player-entry" data-player-id="${player.id}">
                <div class="form-group">
                    <label class="form-label">번호</label>
                    <input type="text" class="form-input player-number" value="${player.number}" placeholder="번호">
                </div>
                <div class="form-group">
                    <label class="form-label">선수명</label>
                    <input type="text" class="form-input player-name" value="${player.name}" placeholder="선수명">
                </div>
                <div class="form-group">
                    <label class="form-label">구성</label>
                    <select class="form-select player-type">
                        <option value="set" ${player.type === 'set' ? 'selected' : ''}>상하의 세트</option>
                        <option value="top" ${player.type === 'top' ? 'selected' : ''}>상의만</option>
                        <option value="bottom" ${player.type === 'bottom' ? 'selected' : ''}>하의만</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">소매타입</label>
                    <select class="form-select player-sleeve">
                        <option value="short" ${player.sleeveType === 'short' ? 'selected' : ''}>반소매</option>
                        <option value="long" ${player.sleeveType === 'long' ? 'selected' : ''}>긴소매</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">상의사이즈</label>
                    <select class="form-select player-top-size">
                        <option value="">사이즈 선택</option>
                        <option value="XS" ${player.topSize === 'XS' ? 'selected' : ''}>XS</option>
                        <option value="S" ${player.topSize === 'S' ? 'selected' : ''}>S</option>
                        <option value="M" ${player.topSize === 'M' ? 'selected' : ''}>M</option>
                        <option value="L" ${player.topSize === 'L' ? 'selected' : ''}>L</option>
                        <option value="XL" ${player.topSize === 'XL' ? 'selected' : ''}>XL</option>
                        <option value="XXL" ${player.topSize === 'XXL' ? 'selected' : ''}>XXL</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">하의사이즈</label>
                    <select class="form-select player-bottom-size">
                        <option value="">사이즈 선택</option>
                        <option value="XS" ${player.bottomSize === 'XS' ? 'selected' : ''}>XS</option>
                        <option value="S" ${player.bottomSize === 'S' ? 'selected' : ''}>S</option>
                        <option value="M" ${player.bottomSize === 'M' ? 'selected' : ''}>M</option>
                        <option value="L" ${player.bottomSize === 'L' ? 'selected' : ''}>L</option>
                        <option value="XL" ${player.bottomSize === 'XL' ? 'selected' : ''}>XL</option>
                        <option value="XXL" ${player.bottomSize === 'XXL' ? 'selected' : ''}>XXL</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">가격</label>
                    <input type="text" class="form-input" value="${this.getPlayerPrice(player.type).toLocaleString()}원" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">삭제</label>
                    <button type="button" class="remove-player-btn" data-player-id="${player.id}">삭제</button>
                </div>
            </div>
        `).join('');
    }
    
    updatePlayerListDOM() {
        const playersListElement = document.getElementById('players-list');
        if (playersListElement) {
            playersListElement.innerHTML = this.getPlayerListHTML();
        }
    }
    
    getPlayerPrice(type) {
        const prices = { set: 45000, top: 25000, bottom: 20000 };
        return prices[type] || 0;
    }
    
    renderSpecialRequests() {
        return `
            <div class="form-section">
                <h3 class="section-title">특이사항</h3>
                <textarea id="special-requests" class="form-textarea" placeholder="추가 요청사항이 있으시면 입력해주세요">${this.specialRequests}</textarea>
            </div>
        `;
    }
    
    renderOrderSummary() {
        const validPlayers = this.players.filter(p => p.name || p.number);
        const totalPrice = validPlayers.reduce((sum, player) => sum + this.getPlayerPrice(player.type), 0);
        
        return `
            <div class="form-section">
                <h3 class="section-title">주문 요약</h3>
                <div class="order-summary">
                    <div class="summary-row">
                        <span>총 선수 수:</span>
                        <span>${validPlayers.length}명</span>
                    </div>
                    <div class="summary-row">
                        <span>상하의 세트:</span>
                        <span>${validPlayers.filter(p => p.type === 'set').length}개</span>
                    </div>
                    <div class="summary-row">
                        <span>상의만:</span>
                        <span>${validPlayers.filter(p => p.type === 'top').length}개</span>
                    </div>
                    <div class="summary-row">
                        <span>하의만:</span>
                        <span>${validPlayers.filter(p => p.type === 'bottom').length}개</span>
                    </div>
                    <div class="summary-row summary-total">
                        <span>총 가격:</span>
                        <span>${totalPrice.toLocaleString()}원</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderFormActions() {
        const isValid = this.customerName && this.customerPhone && this.players.some(p => p.name && p.number);
        
        return `
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="form-cancel-btn">취소</button>
                <button type="button" class="btn-primary ${isValid ? '' : 'disabled'}" id="form-submit-btn">주문서 저장</button>
            </div>
        `;
    }
    
    updateOrderSummary() {
        const summarySection = document.querySelector('.order-summary');
        if (summarySection) {
            const validPlayers = this.players.filter(p => p.name || p.number);
            const totalPrice = validPlayers.reduce((sum, player) => sum + this.getPlayerPrice(player.type), 0);
            
            summarySection.innerHTML = `
                <div class="summary-row">
                    <span>총 선수 수:</span>
                    <span>${validPlayers.length}명</span>
                </div>
                <div class="summary-row">
                    <span>상하의 세트:</span>
                    <span>${validPlayers.filter(p => p.type === 'set').length}개</span>
                </div>
                <div class="summary-row">
                    <span>상의만:</span>
                    <span>${validPlayers.filter(p => p.type === 'top').length}개</span>
                </div>
                <div class="summary-row">
                    <span>하의만:</span>
                    <span>${validPlayers.filter(p => p.type === 'bottom').length}개</span>
                </div>
                <div class="summary-row summary-total">
                    <span>총 가격:</span>
                    <span>${totalPrice.toLocaleString()}원</span>
                </div>
            `;
        }
        
        this.updateSubmitButton();
    }
    
    updateSubmitButton() {
        const submitBtn = document.getElementById('form-submit-btn');
        const isValid = this.customerName && this.customerPhone && this.players.some(p => p.name && p.number);
        
        if (submitBtn) {
            // Always keep the button enabled so users can click it and get validation feedback
            submitBtn.disabled = false;
            if (isValid) {
                submitBtn.classList.remove('disabled');
                submitBtn.textContent = '주문서 저장';
            } else {
                submitBtn.classList.add('disabled');
                submitBtn.textContent = '주문서 저장';
            }
        }
    }
    
    bindFormEvents() {
        // Only bind events once per instance
        if (this.eventsBound) {
            return;
        }
        
        // Store bound handlers for cleanup
        this.boundHandlers = {
            click: this.handleClick.bind(this),
            input: this.handleInput.bind(this),
            change: this.handleChange.bind(this)
        };
        
        // Use event delegation on document to handle all form events
        document.addEventListener('click', this.boundHandlers.click);
        document.addEventListener('input', this.boundHandlers.input);
        document.addEventListener('change', this.boundHandlers.change);
        
        console.log('🔗 Events bound for instance:', this.instanceId);
        
        // Create cleanup method for this instance
        this.cleanup = () => {
            console.log('🧹 Cleaning up instance:', this.instanceId);
            if (this.boundHandlers) {
                document.removeEventListener('click', this.boundHandlers.click);
                document.removeEventListener('input', this.boundHandlers.input);
                document.removeEventListener('change', this.boundHandlers.change);
                this.boundHandlers = null;
            }
            this.eventsBound = false;
        };
        
        this.eventsBound = true;
    }
    
    handleClick(e) {
        // Only handle clicks if the modal is open and the click is inside the modal
        if (!this.isOpen || !e.target.closest('#order-modal')) {
            return;
        }
        
        if (e.target.id === 'add-player-btn') {
            // Timestamp-based debounce to prevent duplicate clicks
            const currentTime = Date.now();
            if (currentTime - this.lastClickTime < this.clickDebounceMs) {
                return;
            }
            this.lastClickTime = currentTime;
            
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.addPlayer();
        } else if (e.target.classList.contains('remove-player-btn')) {
            e.preventDefault();
            const playerId = e.target.dataset.playerId;
            this.removePlayer(playerId);
        } else if (e.target.id === 'form-cancel-btn') {
            e.preventDefault();
            this.closeModal();
        } else if (e.target.id === 'form-submit-btn') {
            e.preventDefault();
            this.submitOrder();
        }
    }
    
    handleInput(e) {
        // Only handle inputs if the modal is open and the input is inside the modal
        if (!this.isOpen || !e.target.closest('#order-modal')) {
            return;
        }
        
        if (e.target.id === 'customer-name') {
            this.customerName = e.target.value;
            this.updateOrderNumber();
            this.updateSubmitButton();
        } else if (e.target.id === 'customer-phone') {
            this.customerPhone = e.target.value;
            this.updateOrderNumber();
            this.updateSubmitButton();
        } else if (e.target.id === 'team-name') {
            this.teamName = e.target.value;
        } else if (e.target.id === 'special-requests') {
            this.specialRequests = e.target.value;
        } else if (e.target.classList.contains('player-number')) {
            const playerId = e.target.closest('.player-entry').dataset.playerId;
            this.updatePlayer(playerId, 'number', e.target.value);
        } else if (e.target.classList.contains('player-name')) {
            const playerId = e.target.closest('.player-entry').dataset.playerId;
            this.updatePlayer(playerId, 'name', e.target.value);
        }
    }
    
    handleChange(e) {
        // Only handle changes if the modal is open and the element is inside the modal
        if (!this.isOpen || !e.target.closest('#order-modal')) {
            return;
        }
        
        if (e.target.classList.contains('player-type')) {
            const playerId = e.target.closest('.player-entry').dataset.playerId;
            this.updatePlayer(playerId, 'type', e.target.value);
            this.renderPlayerList();
        } else if (e.target.classList.contains('player-sleeve')) {
            const playerId = e.target.closest('.player-entry').dataset.playerId;
            this.updatePlayer(playerId, 'sleeveType', e.target.value);
        } else if (e.target.classList.contains('player-top-size')) {
            const playerId = e.target.closest('.player-entry').dataset.playerId;
            this.updatePlayer(playerId, 'topSize', e.target.value);
        } else if (e.target.classList.contains('player-bottom-size')) {
            const playerId = e.target.closest('.player-entry').dataset.playerId;
            this.updatePlayer(playerId, 'bottomSize', e.target.value);
        }
    }

    
    validateOrderForm() {
        const missingFields = [];
        
        // Check customer information
        if (!this.customerName || this.customerName.trim() === '') {
            missingFields.push('주문자 성함');
        }
        
        if (!this.customerPhone || this.customerPhone.trim() === '') {
            missingFields.push('연락처');
        }
        
        // Check if there's at least one valid player
        const validPlayers = this.players.filter(p => p.name && p.name.trim() !== '' && p.number && p.number.trim() !== '');
        if (validPlayers.length === 0) {
            missingFields.push('최소 한 명의 선수 정보 (선수명, 번호)');
        }
        
        // Check individual player validation
        const playerIssues = [];
        this.players.forEach((player, index) => {
            const issues = [];
            
            if (player.name && player.name.trim() !== '') {
                // If player has a name, check for other required fields
                if (!player.number || player.number.trim() === '') {
                    issues.push('번호');
                }
                
                // Check sizes based on player type
                if (player.type === 'set' || player.type === 'top') {
                    if (!player.topSize || player.topSize === '') {
                        issues.push('상의 사이즈');
                    }
                }
                
                if (player.type === 'set' || player.type === 'bottom') {
                    if (!player.bottomSize || player.bottomSize === '') {
                        issues.push('하의 사이즈');
                    }
                }
                
                if (issues.length > 0) {
                    playerIssues.push(`선수 ${index + 1}: ${issues.join(', ')}`);
                }
            } else if (player.number && player.number.trim() !== '') {
                // If player has a number but no name
                playerIssues.push(`선수 ${index + 1}: 선수명`);
            }
        });
        
        return {
            isValid: missingFields.length === 0 && playerIssues.length === 0,
            missingFields,
            playerIssues
        };
    }

    showValidationDialog(validation) {
        // Create validation dialog overlay
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'validation-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        // Create dialog content
        const dialog = document.createElement('div');
        dialog.className = 'validation-dialog';
        dialog.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        
        let dialogContent = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="color: #e74c3c; margin: 0 0 10px 0; font-size: 1.4em;">⚠️ 필수 정보 확인</h3>
                <p style="color: #666; margin: 0; font-size: 1em;">주문서를 저장하기 위해 다음 정보를 입력해주세요:</p>
            </div>
            <div style="text-align: left; margin-bottom: 25px;">
        `;
        
        if (validation.missingFields.length > 0) {
            dialogContent += `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #c0392b; margin: 0 0 10px 0; font-size: 1.1em;">📝 필수 정보</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #333;">
            `;
            validation.missingFields.forEach(field => {
                dialogContent += `<li style="margin: 5px 0;">${field}</li>`;
            });
            dialogContent += `</ul></div>`;
        }
        
        if (validation.playerIssues.length > 0) {
            dialogContent += `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #c0392b; margin: 0 0 10px 0; font-size: 1.1em;">👥 선수 정보</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #333;">
            `;
            validation.playerIssues.forEach(issue => {
                dialogContent += `<li style="margin: 5px 0;">${issue}</li>`;
            });
            dialogContent += `</ul></div>`;
        }
        
        dialogContent += `
            </div>
            <div style="text-align: center;">
                <p style="color: #666; margin: 0 0 20px 0; font-size: 0.9em;">
                    위 정보를 입력하신 후 다시 저장 버튼을 눌러주세요.
                </p>
                <button id="validation-dialog-ok" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 5px;
                    font-size: 1em;
                    cursor: pointer;
                    transition: background 0.3s;
                " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
                    확인
                </button>
            </div>
        `;
        
        dialog.innerHTML = dialogContent;
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // Handle OK button click
        const okButton = document.getElementById('validation-dialog-ok');
        const closeDialog = () => {
            document.body.removeChild(dialogOverlay);
        };
        
        okButton.addEventListener('click', closeDialog);
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) {
                closeDialog();
            }
        });
        
        // Focus on OK button for keyboard navigation
        okButton.focus();
        
        // Handle Escape key
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    }

    async submitOrder() {
        const validation = this.validateOrderForm();
        
        if (!validation.isValid) {
            // Use the enhanced validation dialog instead of basic alert
            this.showValidationDialog(validation);
            return;
        }
        
        const validPlayers = this.players.filter(p => p.name && p.name.trim() !== '' && p.number && p.number.trim() !== '');
        
        const orderData = {
            orderNumber: this.orderNumber,
            customerName: this.customerName,
            customerPhone: this.customerPhone,
            teamName: this.teamName,
            selectedOptions: this.selectedOptions,
            players: validPlayers,
            specialRequests: this.specialRequests,
            timestamp: new Date().toISOString()
        };
        
        console.log('주문서 저장:', orderData);
        
        try {
            // Save to server session
            if (this.serverApiClient && this.sessionManager) {
                const currentSessionId = this.sessionManager.getCurrentSessionId();
                if (currentSessionId) {
                    const serverUrl = this.serverApiClient.serverUrl;
                    const response = await fetch(`${serverUrl}/api/sessions/${currentSessionId}/orders`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(orderData)
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('Order saved to session:', result);
                        
                        // Show success message
                        if (this.showNotification) {
                            this.showNotification('주문서가 저장되었습니다.', 5000);
                        } else {
                            alert('주문서가 저장되었습니다.');
                        }
                        
                        this.closeModal();
                        return;
                    } else {
                        const errorData = await response.json();
                        throw new Error(errorData.error || '서버 저장 실패');
                    }
                } else {
                    throw new Error('세션 ID가 없습니다.');
                }
            } else {
                throw new Error('서버 연결을 사용할 수 없습니다.');
            }
            
        } catch (error) {
            console.error('Order submission error:', error);
            if (this.showNotification) {
                this.showNotification(`❌ 주문서 저장 실패: ${error.message}`, 5000);
            } else {
                alert(`주문서 저장 실패: ${error.message}`);
            }
        }
    }

}