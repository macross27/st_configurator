const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;

class OrderParser {
    constructor(options = {}) {
        this.sessionsDir = options.sessionsDir || './sessions';
        this.orderPrices = {
            set: 45000,
            top: 25000,
            bottom: 20000
        };
    }

    /**
     * Parse order data into structured format
     */
    parseOrderData(rawOrderData) {
        return {
            orderNumber: rawOrderData.orderNumber,
            customerName: rawOrderData.customerName,
            customerPhone: rawOrderData.customerPhone,
            teamName: rawOrderData.teamName || '',
            selectedOptions: rawOrderData.selectedOptions || {},
            players: rawOrderData.players || [],
            specialRequests: rawOrderData.specialRequests || '',
            timestamp: rawOrderData.timestamp || new Date().toISOString(),
            totalPrice: this.calculateTotalPrice(rawOrderData.players || []),
            summary: this.generateOrderSummary(rawOrderData.players || [])
        };
    }

    /**
     * Calculate total price for all players
     */
    calculateTotalPrice(players) {
        return players.reduce((total, player) => {
            return total + (this.orderPrices[player.type] || 0);
        }, 0);
    }

    /**
     * Generate order summary statistics
     */
    generateOrderSummary(players) {
        const validPlayers = players.filter(p => p.name && p.number);
        return {
            totalPlayers: validPlayers.length,
            sets: validPlayers.filter(p => p.type === 'set').length,
            topsOnly: validPlayers.filter(p => p.type === 'top').length,
            bottomsOnly: validPlayers.filter(p => p.type === 'bottom').length,
            shortSleeveCount: validPlayers.filter(p => p.sleeveType === 'short').length,
            longSleeveCount: validPlayers.filter(p => p.sleeveType === 'long').length
        };
    }

    /**
     * Generate XLSX file from order data
     */
    async generateXLSX(orderData, filename) {
        const parsedData = this.parseOrderData(orderData);
        
        // Order info sheet data
        const orderInfoData = [
            ['주문서'],
            [''],
            ['주문번호', parsedData.orderNumber],
            ['주문자', parsedData.customerName],
            ['연락처', parsedData.customerPhone],
            ['팀명', parsedData.teamName],
            ['주문일시', new Date(parsedData.timestamp).toLocaleString('ko-KR')],
            [''],
            ['선택 옵션'],
            ['유니폼', parsedData.selectedOptions.uniform || ''],
            ['넥 타입', parsedData.selectedOptions.neck || ''],
            ['원단', parsedData.selectedOptions.fabric || ''],
            [''],
            ['특이사항', parsedData.specialRequests]
        ];

        // Player data sheet
        const playerData = [
            ['선수 정보'],
            [''],
            ['번호', '선수명', '구성', '소매타입', '상의사이즈', '하의사이즈', '가격']
        ];

        parsedData.players.forEach((player) => {
            const price = this.orderPrices[player.type] || 0;
            playerData.push([
                player.number,
                player.name,
                player.type === 'set' ? '상하의 세트' : 
                player.type === 'top' ? '상의만' : '하의만',
                player.sleeveType === 'short' ? '반소매' : '긴소매',
                player.topSize || '',
                player.bottomSize || '',
                price.toLocaleString() + '원'
            ]);
        });

        // Add totals
        playerData.push(['', '', '', '', '', '총 가격', parsedData.totalPrice.toLocaleString() + '원']);

        // Order summary sheet
        const summaryData = [
            ['주문 요약'],
            [''],
            ['항목', '수량'],
            ['총 선수 수', parsedData.summary.totalPlayers + '명'],
            ['상하의 세트', parsedData.summary.sets + '개'],
            ['상의만', parsedData.summary.topsOnly + '개'],
            ['하의만', parsedData.summary.bottomsOnly + '개'],
            ['반소매', parsedData.summary.shortSleeveCount + '개'],
            ['긴소매', parsedData.summary.longSleeveCount + '개'],
            [''],
            ['총 금액', parsedData.totalPrice.toLocaleString() + '원']
        ];

        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Add sheets
        const ws1 = XLSX.utils.aoa_to_sheet(orderInfoData);
        XLSX.utils.book_append_sheet(wb, ws1, '주문정보');
        
        const ws2 = XLSX.utils.aoa_to_sheet(playerData);
        XLSX.utils.book_append_sheet(wb, ws2, '선수정보');

        const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws3, '주문요약');

        // Set column widths for better formatting
        ws1['!cols'] = [{ width: 15 }, { width: 30 }];
        ws2['!cols'] = [
            { width: 8 },  // 번호
            { width: 15 }, // 선수명
            { width: 12 }, // 구성
            { width: 10 }, // 소매타입
            { width: 10 }, // 상의사이즈
            { width: 10 }, // 하의사이즈
            { width: 12 }  // 가격
        ];
        ws3['!cols'] = [{ width: 15 }, { width: 15 }];

        // Generate buffer
        const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        return {
            buffer: xlsxBuffer,
            filename: filename || `주문서_${parsedData.orderNumber}.xlsx`,
            parsedData: parsedData
        };
    }

    /**
     * Save XLSX file to sessions directory
     */
    async saveToSession(orderData, sessionId) {
        try {
            const sessionDir = path.join(this.sessionsDir, sessionId);
            
            // Ensure session directory exists
            try {
                await fs.access(sessionDir);
            } catch {
                await fs.mkdir(sessionDir, { recursive: true });
            }

            const filename = `주문서_${orderData.orderNumber || Date.now()}.xlsx`;
            const { buffer, parsedData } = await this.generateXLSX(orderData, filename);
            
            // Save XLSX file
            const filePath = path.join(sessionDir, filename);
            await fs.writeFile(filePath, buffer);

            // Save order data as JSON for reference
            const jsonFilePath = path.join(sessionDir, `주문정보_${orderData.orderNumber || Date.now()}.json`);
            await fs.writeFile(jsonFilePath, JSON.stringify(parsedData, null, 2));

            return {
                xlsxPath: filePath,
                jsonPath: jsonFilePath,
                filename: filename,
                sessionId: sessionId,
                parsedData: parsedData
            };
        } catch (error) {
            console.error('Error saving order to session:', error);
            throw new Error('Failed to save order data to session');
        }
    }

    /**
     * List all order files in a session
     */
    async listSessionOrders(sessionId) {
        try {
            const sessionDir = path.join(this.sessionsDir, sessionId);
            const files = await fs.readdir(sessionDir);
            
            const orders = [];
            for (const file of files) {
                if (file.startsWith('주문정보_') && file.endsWith('.json')) {
                    const filePath = path.join(sessionDir, file);
                    const jsonData = await fs.readFile(filePath, 'utf8');
                    const orderData = JSON.parse(jsonData);
                    
                    const xlsxFilename = file.replace('주문정보_', '주문서_').replace('.json', '.xlsx');
                    const xlsxPath = path.join(sessionDir, xlsxFilename);
                    
                    const xlsxExists = await fs.access(xlsxPath).then(() => true).catch(() => false);
                    
                    orders.push({
                        orderNumber: orderData.orderNumber,
                        customerName: orderData.customerName,
                        timestamp: orderData.timestamp,
                        totalPrice: orderData.totalPrice,
                        jsonFile: file,
                        xlsxFile: xlsxExists ? xlsxFilename : null,
                        summary: orderData.summary
                    });
                }
            }
            
            return orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('Error listing session orders:', error);
            return [];
        }
    }

    /**
     * Get order file path for download
     */
    async getOrderFilePath(sessionId, filename) {
        const sessionDir = path.join(this.sessionsDir, sessionId);
        const filePath = path.join(sessionDir, filename);
        
        try {
            await fs.access(filePath);
            return filePath;
        } catch {
            throw new Error('Order file not found');
        }
    }

    /**
     * Delete order from session
     */
    async deleteOrder(sessionId, orderNumber) {
        try {
            const sessionDir = path.join(this.sessionsDir, sessionId);
            
            const jsonFile = `주문정보_${orderNumber}.json`;
            const xlsxFile = `주문서_${orderNumber}.xlsx`;
            
            const jsonPath = path.join(sessionDir, jsonFile);
            const xlsxPath = path.join(sessionDir, xlsxFile);
            
            // Delete both files
            await Promise.allSettled([
                fs.unlink(jsonPath),
                fs.unlink(xlsxPath)
            ]);
            
            return true;
        } catch (error) {
            console.error('Error deleting order:', error);
            throw new Error('Failed to delete order');
        }
    }
}

module.exports = OrderParser;