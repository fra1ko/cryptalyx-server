// ===== Класс портфеля =====
class Portfolio {
    constructor() {
        this.assets = [];
        this.prices = {};
        this.priceCache = {};
        this.freeUSDT = parseFloat(localStorage.getItem('freeUSDT')) || 0;
        this.activityLog = JSON.parse(localStorage.getItem('activityLog')) || [];
        this.chartPeriod = localStorage.getItem('chartPeriod') || '1m';
        this.portfolioChart = null;
        this.categoryChart = null;
        this.load();
        this.startPriceUpdate();
        setTimeout(() => this.initCharts(), 500);
    }

    load() {
        const saved = localStorage.getItem('portfolio');
        if (saved) {
            try {
                this.assets = JSON.parse(saved);
                // FIX: Фильтруем только положительные балансы
                this.assets = this.assets.filter(a => a.amount > 0.000001);
            } catch (e) {
                this.assets = [];
            }
        }
        this.render();
    }

    save() {
        localStorage.setItem('portfolio', JSON.stringify(this.assets));
        localStorage.setItem('freeUSDT', this.freeUSDT);
        localStorage.setItem('activityLog', JSON.stringify(this.activityLog));
        this.render();
    }

    addActivity(action, details) {
        this.activityLog.unshift({
            action,
            details,
            time: new Date().toLocaleTimeString()
        });
        if (this.activityLog.length > 10) this.activityLog.pop();
    }

    addAsset(coin, amount, price) {
        coin = coin.toUpperCase().trim();
        
        if (!coin || amount <= 0 || price <= 0) {
            alert('Заполните все поля корректно');
            return;
        }
        
        const existing = this.assets.find(a => a.coin === coin);
        
        if (existing) {
            const totalAmount = existing.amount + amount;
            const totalValue = (existing.amount * existing.price) + (amount * price);
            existing.amount = totalAmount;
            existing.price = totalValue / totalAmount;
            this.addActivity('➕ Добавлено', `${amount} ${coin} по $${price.toFixed(2)}`);
        } else {
            this.assets.push({
                coin,
                amount,
                price,
                id: Date.now()
            });
            this.addActivity('➕ Новый актив', `${coin} ${amount} шт. по $${price.toFixed(2)}`);
        }
        
        this.save();
    }

    removeAsset(id) {
        const asset = this.assets.find(a => a.id === id);
        if (asset) {
            this.addActivity('🗑️ Удалено', `${asset.coin} ${asset.amount} шт.`);
        }
        this.assets = this.assets.filter(a => a.id !== id);
        this.save();
    }

    setFreeUSDT(value) {
        const oldValue = this.freeUSDT;
        this.freeUSDT = value;
        this.addActivity('💵 USDT обновлено', `${oldValue} → ${value} USDT`);
        this.save();
    }

    async updatePrices() {
        console.log('🔄 Обновление цен...');
        const now = Date.now();
        
        for (const asset of this.assets) {
            const coin = asset.coin;
            
            if (this.priceCache && this.priceCache[coin] && (now - this.priceCache[coin].timestamp < 60000)) {
                this.prices[coin] = this.priceCache[coin].price;
                continue;
            }
            
            let price = 0;
            
            // FIX: Используем наш прокси на сервере вместо прямых API
            try {
                const response = await fetch(`/api/price/${coin}`);
                if (response.ok) {
                    const data = await response.json();
                    price = data.price;
                    console.log(`💰 ${coin}: $${price}`);
                }
            } catch (e) {
                console.log(`❌ Ошибка получения цены для ${coin}`);
            }
            
            this.priceCache[coin] = {
                price: price,
                timestamp: now
            };
            
            this.prices[coin] = price;
        }
        this.render();
    }

    startPriceUpdate() {
        this.updatePrices();
        setInterval(() => this.updatePrices(), 30000);
    }

    getStats() {
        let totalBuyValue = 0;
        let totalCurrentValue = 0;
        let validAssets = 0;
        
        this.assets.forEach(asset => {
            const currentPrice = this.prices[asset.coin] || 0;
            const buyValue = asset.amount * asset.price;
            const currentValue = asset.amount * currentPrice;
            
            // FIX: Пропускаем монеты с нулевой стоимостью и отрицательные балансы
            if (asset.amount <= 0) return;
            if (currentValue < 1 && buyValue < 1) return;
            
            totalBuyValue += buyValue;
            totalCurrentValue += currentValue;
            validAssets++;
        });
        
        const profit = totalCurrentValue - totalBuyValue;
        const profitPercent = totalBuyValue > 0 ? (profit / totalBuyValue * 100) : 0;
        
        return {
            totalBuyValue,
            totalCurrentValue,
            totalPortfolioValue: totalCurrentValue + this.freeUSDT,
            profit,
            profitPercent,
            validAssets
        };
    }

    getBestAndWorstAssets() {
        if (this.assets.length === 0) return { best: null, worst: null, bestProfit: 0, worstProfit: 0 };
        
        let bestAsset = null;
        let worstAsset = null;
        let bestProfit = -Infinity;
        let worstProfit = Infinity;
        
        this.assets.forEach(asset => {
            // FIX: Пропускаем монеты с нулевым балансом
            if (asset.amount <= 0) return;
            
            const currentPrice = this.prices[asset.coin] || 0;
            const buyValue = asset.amount * asset.price;
            const currentValue = asset.amount * currentPrice;
            
            // Пропускаем мелочь
            if (currentValue < 1 && buyValue < 1) return;
            
            const profit = ((currentPrice - asset.price) / asset.price * 100);
            
            if (profit > bestProfit) {
                bestProfit = profit;
                bestAsset = asset;
            }
            if (profit < worstProfit) {
                worstProfit = profit;
                worstAsset = asset;
            }
        });
        
        return { bestAsset, bestProfit, worstAsset, worstProfit };
    }

    getDiversificationScore() {
        if (this.assets.length === 0) return 0;
        
        let totalValue = 0;
        this.assets.forEach(asset => {
            if (asset.amount <= 0) return;
            totalValue += asset.amount * (this.prices[asset.coin] || 0);
        });
        
        if (totalValue === 0) return 0;
        
        let sumSquares = 0;
        this.assets.forEach(asset => {
            if (asset.amount <= 0) return;
            const share = (asset.amount * (this.prices[asset.coin] || 0)) / totalValue;
            sumSquares += share * share;
        });
        
        const diversification = 1 - sumSquares;
        return Math.min(100, Math.max(0, diversification * 100));
    }

    getRiskScore() {
        if (this.assets.length === 0) return 0;
        
        let score = 5;
        
        score -= (this.assets.length - 1) * 0.5;
        
        const diversification = this.getDiversificationScore();
        if (diversification < 30) score += 2;
        if (diversification > 70) score -= 1;
        
        this.assets.forEach(asset => {
            if (asset.amount <= 0) return;
            const currentPrice = this.prices[asset.coin] || 0;
            if (currentPrice > asset.price) score -= 0.3;
            if (currentPrice < asset.price * 0.7) score += 0.5;
        });
        
        return Math.min(10, Math.max(1, Math.round(score)));
    }

    getRiskLevel(score) {
        if (score <= 3) return 'Низкий';
        if (score <= 6) return 'Средний';
        return 'Высокий';
    }

    getDiversificationLevel(score) {
        if (score <= 30) return 'Низкая';
        if (score <= 60) return 'Средняя';
        return 'Высокая';
    }

    initCharts() {
        this.updateCharts();
    }

    updateCharts() {
        const stats = this.getStats();
        
        const portfolioCtx = document.getElementById('portfolioChart')?.getContext('2d');
        if (portfolioCtx) {
            if (this.portfolioChart) {
                this.portfolioChart.destroy();
            }
            
            const dates = [];
            const values = [];
            
            let days = 30;
            
            if (this.chartPeriod === '1d') {
                days = 1;
                for (let i = 24; i >= 0; i--) {
                    const date = new Date();
                    date.setHours(date.getHours() - i);
                    dates.push(date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
                    values.push(stats.totalPortfolioValue * (0.99 + Math.random() * 0.02));
                }
            } else if (this.chartPeriod === '1w') {
                days = 7;
                for (let i = days; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    dates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                    values.push(stats.totalPortfolioValue * (0.97 + Math.random() * 0.06));
                }
            } else if (this.chartPeriod === '1m') {
                days = 30;
                for (let i = days; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    dates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                    values.push(stats.totalPortfolioValue * (0.95 + Math.random() * 0.1));
                }
            } else if (this.chartPeriod === '1y') {
                days = 365;
                for (let i = days; i >= 0; i -= 7) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    dates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                    values.push(stats.totalPortfolioValue * (0.85 + Math.random() * 0.3));
                }
            }
            
            this.portfolioChart = new Chart(portfolioCtx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Стоимость портфеля (USDT)',
                        data: values,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            grid: { color: '#334155' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8', maxTicksLimit: 8 }
                        }
                    }
                }
            });
        }

        const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
        if (categoryCtx) {
            if (this.categoryChart) {
                this.categoryChart.destroy();
            }
            
            const categories = {
                'L1': ['BTC', 'ETH', 'SOL', 'BNB'],
                'L2': ['MATIC', 'ARB', 'OP'],
                'DeFi': ['UNI', 'AAVE', 'LINK'],
                'Meme': ['DOGE', 'SHIB', 'PEPE']
            };
            
            const categoryData = {};
            const categoryColors = {
                'L1': '#3b82f6',
                'L2': '#8b5cf6',
                'DeFi': '#ec4899',
                'Meme': '#f59e0b',
                'Other': '#64748b'
            };
            
            this.assets.forEach(asset => {
                if (asset.amount <= 0) return;
                const value = asset.amount * (this.prices[asset.coin] || 0);
                if (value < 1) return;
                
                let category = 'Other';
                for (const [cat, coins] of Object.entries(categories)) {
                    if (coins.includes(asset.coin)) {
                        category = cat;
                        break;
                    }
                }
                
                categoryData[category] = (categoryData[category] || 0) + value;
            });
            
            if (Object.keys(categoryData).length === 0) {
                categoryData['Нет данных'] = 1;
            }
            
            this.categoryChart = new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categoryData),
                    datasets: [{
                        data: Object.values(categoryData),
                        backgroundColor: Object.keys(categoryData).map(cat => categoryColors[cat] || '#64748b'),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });

            const legend = document.getElementById('categoryLegend');
            if (legend) {
                legend.innerHTML = Object.keys(categoryData).map(cat => `
                    <div class="legend-item">
                        <span class="legend-color" style="background: ${categoryColors[cat] || '#64748b'};"></span>
                        <span>${cat}</span>
                    </div>
                `).join('');
            }
        }
    }

    render() {
    const stats = this.getStats();
    const bestWorst = this.getBestAndWorstAssets();
    const diversificationScore = this.getDiversificationScore();
    const riskScore = this.getRiskScore();
    
    // Основные метрики (без изменений)
    const totalPortfolioEl = document.getElementById('totalPortfolioValue');
    const totalBuyEl = document.getElementById('totalBuyValue');
    const totalCurrentEl = document.getElementById('totalCurrentValue');
    const freeUsdtEl = document.getElementById('freeUsdtValue');
    const profitEl = document.getElementById('profit');
    const bestAssetEl = document.getElementById('bestAsset');
    const bestAssetProfitEl = document.getElementById('bestAssetProfit');
    const worstAssetEl = document.getElementById('worstAsset');
    const worstAssetProfitEl = document.getElementById('worstAssetProfit');
    const diversificationScoreEl = document.getElementById('diversificationScore');
    const diversificationLevelEl = document.getElementById('diversificationLevel');
    const riskScoreEl = document.getElementById('riskScore');
    const riskLevelEl = document.getElementById('riskLevel');
    const currentDateEl = document.getElementById('currentDate');
    
    if (totalPortfolioEl) totalPortfolioEl.textContent = `$${stats.totalPortfolioValue.toFixed(2)}`;
    if (totalBuyEl) totalBuyEl.textContent = `$${stats.totalBuyValue.toFixed(2)}`;
    if (totalCurrentEl) totalCurrentEl.textContent = `$${stats.totalCurrentValue.toFixed(2)}`;
    if (freeUsdtEl) freeUsdtEl.textContent = `${this.freeUSDT.toFixed(2)} USDT`;
    
    if (profitEl) {
        profitEl.textContent = `$${stats.profit.toFixed(2)} (${stats.profitPercent.toFixed(2)}%)`;
        profitEl.className = stats.profit >= 0 ? 'positive' : 'negative';
    }
    
    // Лучший/худший актив (без изменений)
    if (bestWorst.bestAsset && bestAssetEl && bestAssetProfitEl) {
        bestAssetEl.textContent = bestWorst.bestAsset.coin;
        bestAssetProfitEl.textContent = `${bestWorst.bestProfit >= 0 ? '+' : ''}${bestWorst.bestProfit.toFixed(1)}%`;
        bestAssetProfitEl.className = bestWorst.bestProfit >= 0 ? 'positive' : 'negative';
    } else {
        if (bestAssetEl) bestAssetEl.textContent = '—';
        if (bestAssetProfitEl) bestAssetProfitEl.textContent = '';
    }
    
    if (bestWorst.worstAsset && worstAssetEl && worstAssetProfitEl) {
        worstAssetEl.textContent = bestWorst.worstAsset.coin;
        worstAssetProfitEl.textContent = `${bestWorst.worstProfit >= 0 ? '+' : ''}${bestWorst.worstProfit.toFixed(1)}%`;
        worstAssetProfitEl.className = bestWorst.worstProfit >= 0 ? 'positive' : 'negative';
    } else {
        if (worstAssetEl) worstAssetEl.textContent = '—';
        if (worstAssetProfitEl) worstAssetProfitEl.textContent = '';
    }
    
    // Диверсификация
    if (diversificationScoreEl) diversificationScoreEl.textContent = `${diversificationScore.toFixed(0)}%`;
    if (diversificationLevelEl) diversificationLevelEl.textContent = this.getDiversificationLevel(diversificationScore);
    
    // Риск
    if (riskScoreEl) riskScoreEl.textContent = `${riskScore}/10`;
    if (riskLevelEl) riskLevelEl.textContent = this.getRiskLevel(riskScore);
    
    // Дата
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    // ===== ТАБЛИЦА ПОРТФЕЛЯ С СОРТИРОВКОЙ =====
    const tbody = document.getElementById('portfolioBody');
    if (!tbody) return;
    
    // Фильтруем активы: только положительные балансы и стоимость > $1
    let validAssets = this.assets.filter(asset => {
        if (asset.amount <= 0) return false;
        const currentPrice = this.prices[asset.coin] || 0;
        const currentValue = asset.amount * currentPrice;
        const buyValue = asset.amount * asset.price;
        return currentValue >= 1 || buyValue >= 1;
    });
    
    // FIX: Сортируем от большей доли к меньшей
    validAssets.sort((a, b) => {
        const currentPriceA = this.prices[a.coin] || 0;
        const currentPriceB = this.prices[b.coin] || 0;
        const shareA = stats.totalCurrentValue > 0 ? ((a.amount * currentPriceA) / stats.totalCurrentValue) : 0;
        const shareB = stats.totalCurrentValue > 0 ? ((b.amount * currentPriceB) / stats.totalCurrentValue) : 0;
        return shareB - shareA; // По убыванию доли
    });
    
    if (validAssets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">📭 Нет активов стоимостью больше $1</td></tr>';
        const aiSection = document.getElementById('aiSection');
        if (aiSection) aiSection.style.display = 'none';
    } else {
        let rows = '';

        validAssets.forEach((asset, index) => {
            const currentPrice = this.prices[asset.coin] || 0;
            const currentValue = asset.amount * currentPrice;
            const buyValue = asset.amount * asset.price;
            const profit = currentValue - buyValue;
            const profitPercent = buyValue > 0 ? (profit / buyValue * 100) : 0;
            const share = stats.totalCurrentValue > 0 ? (currentValue / stats.totalCurrentValue * 100) : 0;

            rows += `
                <tr>
                    <td>${index + 1}</td> <!-- FIX: Порядковый номер -->
                    <td><strong>${asset.coin}</strong></td>
                    <td>${asset.amount.toFixed(6)}</td>
                    <td>$${asset.price.toFixed(2)}</td>
                    <td>$${currentPrice.toFixed(2)}</td>
                    <td>$${buyValue.toFixed(2)}</td>
                    <td>$${currentValue.toFixed(2)}</td>
                    <td class="${profit >= 0 ? 'positive' : 'negative'}">
                        ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)
                    </td>
                    <td>${share.toFixed(1)}%</td>
                    <td><button class="delete-btn" onclick="portfolio.removeAsset(${asset.id})" title="Удалить">🗑️</button></td>
                </tr>
            `;
        });

        tbody.innerHTML = rows;
        const aiSection = document.getElementById('aiSection');
        if (aiSection) aiSection.style.display = 'block';
    }
    
    // Последние действия
    const activityList = document.getElementById('activityList');
    if (activityList) {
        if (this.activityLog.length > 0) {
            activityList.innerHTML = this.activityLog.map(a => `
                <div class="activity-item">
                    <span>${a.action} ${a.details}</span>
                    <span class="activity-time">${a.time}</span>
                </div>
            `).join('');
        } else {
            activityList.innerHTML = '<div class="activity-item"><span>Пока нет действий</span></div>';
        }
    }
    
    // Уведомления
    const alertsList = document.getElementById('alertsList');
    if (alertsList) {
        const alerts = [];
        
        if (validAssets.length === 0) {
            alerts.push({ type: 'info', text: 'Нет активов стоимостью больше $1' });
        } else {
            if (bestWorst.bestProfit > 50) {
                alerts.push({ type: 'success', text: `${bestWorst.bestAsset?.coin} вырос на ${bestWorst.bestProfit.toFixed(1)}%!` });
            }
            
            if (bestWorst.worstProfit < -30) {
                alerts.push({ type: 'danger', text: `${bestWorst.worstAsset?.coin} упал на ${Math.abs(bestWorst.worstProfit).toFixed(1)}%` });
            }
            
            if (diversificationScore < 30) {
                alerts.push({ type: 'warning', text: 'Низкая диверсификация. Добавьте другие монеты' });
            }
        }
        
        if (alerts.length === 0 && validAssets.length > 0) {
            alerts.push({ type: 'info', text: 'Все хорошо. Продолжайте в том же духе' });
        }
        
        alertsList.innerHTML = alerts.map(a => `
            <div class="alert-item ${a.type}">
                <span class="alert-icon">${a.type === 'success' ? '✅' : a.type === 'warning' ? '⚠️' : a.type === 'danger' ? '🔴' : 'ℹ️'}</span>
                <span class="alert-text">${a.text}</span>
            </div>
        `).join('');
    }
    
    this.renderAI();
    this.updateCharts();
}

    renderAI() {
        const aiDiv = document.getElementById('aiRecommendations');
        if (!aiDiv) return;
        
        const validAssets = this.assets.filter(a => a.amount > 0);
        
        if (validAssets.length === 0) {
            const aiSection = document.getElementById('aiSection');
            if (aiSection) aiSection.style.display = 'none';
            return;
        }
        
        const stats = this.getStats();
        const recommendations = [];
        
        let maxShare = 0;
        let maxCoin = '';
        validAssets.forEach(asset => {
            const currentPrice = this.prices[asset.coin] || 0;
            const share = stats.totalCurrentValue > 0 ? ((asset.amount * currentPrice) / stats.totalCurrentValue * 100) : 0;
            if (share > maxShare) {
                maxShare = share;
                maxCoin = asset.coin;
            }
        });
        
        if (maxShare > 50) {
            recommendations.push(`⚠️ **Критическая концентрация**: ${maxShare.toFixed(1)}% в ${maxCoin}. Рекомендуем диверсификацию.`);
        }
        
        validAssets.forEach(asset => {
            const currentPrice = this.prices[asset.coin] || 0;
            const profit = ((currentPrice - asset.price) / asset.price * 100);
            
            if (profit < -20 && profit > -50) {
                recommendations.push(`📉 **Убыток**: ${asset.coin} упал на ${Math.abs(profit).toFixed(1)}%`);
            } else if (profit < -50) {
                recommendations.push(`🔴 **Критический убыток**: ${asset.coin} упал на ${Math.abs(profit).toFixed(1)}%. Пересмотрите инвестицию.`);
            } else if (profit > 50) {
                recommendations.push(`💰 **Прибыль**: ${asset.coin} вырос на ${profit.toFixed(1)}%`);
            }
        });
        
        if (validAssets.length < 3) {
            recommendations.push(`📊 **Мало активов**: Добавьте еще ${3 - validAssets.length} монеты для диверсификации`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push(`✅ **Сбалансированный портфель**: хорошее распределение`);
        }
        
        aiDiv.innerHTML = recommendations.slice(0, 3).map(r => `
            <div class="ai-card">
                <p>${r}</p>
                <small>⚡ ${new Date().toLocaleTimeString()}</small>
            </div>
        `).join('');
        
        document.getElementById('aiSection').style.display = 'block';
    }
}

// ===== Глобальные функции =====
let portfolio;

function checkAuth() {
    const licenseKey = localStorage.getItem('licenseKey');
    if (!licenseKey) {
        window.location.href = '/login.html';
        return false;
    }
    return licenseKey;
}

function addAsset() {
    const coin = document.getElementById('coinInput')?.value;
    const amount = parseFloat(document.getElementById('amountInput')?.value);
    const price = parseFloat(document.getElementById('priceInput')?.value);

    if (!coin || !amount || !price) {
        alert('Заполните все поля');
        return;
    }

    portfolio.addAsset(coin, amount, price);
    
    document.getElementById('coinInput').value = '';
    document.getElementById('amountInput').value = '';
    document.getElementById('priceInput').value = '';
}

function updateFreeUSDT() {
    const value = parseFloat(document.getElementById('freeUsdtInput')?.value);
    if (!isNaN(value) && value >= 0) {
        portfolio.setFreeUSDT(value);
    } else {
        alert('Введите корректную сумму');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/login.html';
}

function refreshPrices() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="refresh-icon">⏳</span> Обновление...';
    }
    
    if (portfolio) {
        portfolio.updatePrices().finally(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="refresh-icon">🔄</span> Обновить цены';
            }
        });
    }
}

function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

function scrollTable(direction) {
    const wrapper = document.getElementById('tableWrapper');
    if (!wrapper) return;
    
    const scrollAmount = 300;
    
    if (direction === 'left') {
        wrapper.scrollLeft -= scrollAmount;
    } else {
        wrapper.scrollLeft += scrollAmount;
    }
    
    wrapper.classList.add('scrolled');
}

function changeChartPeriod(period) {
    if (!portfolio) return;
    
    localStorage.setItem('chartPeriod', period);
    
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    portfolio.chartPeriod = period;
    portfolio.updateCharts();
}

// ===== ФУНКЦИИ ДЛЯ ИМПОРТА =====

// Загрузка портфеля с сервера
async function loadPortfolioFromServer() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const response = await fetch('/api/portfolio', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        if (data.portfolio && Object.keys(data.portfolio).length > 0) {
            // Очищаем текущий портфель
            portfolio.assets = [];
            
            // Добавляем монеты из сервера с ценами
            for (const [coin, amount] of Object.entries(data.portfolio)) {
                if (amount > 0) {
                    const avgPrice = data.prices?.[coin] || 0;
                    portfolio.assets.push({
                        coin,
                        amount,
                        price: avgPrice, // Сохраняем среднюю цену
                        id: Date.now() + Math.random()
                    });
                }
            }
            
            portfolio.save();
            console.log('📦 Портфель загружен с сервера:', portfolio.assets);
            return true;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки портфеля:', error);
    }
    return false;
}

// Импорт нового CSV
async function importCSV() {
    const fileInput = document.getElementById('csvFile');
    const exchangeSelect = document.getElementById('exchangeSelect');
    
    if (!fileInput || !exchangeSelect) {
        showMessage('Ошибка интерфейса', 'error');
        return;
    }
    
    if (!fileInput.files[0]) {
        showMessage('Выберите CSV файл', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Требуется авторизация', 'error');
        return;
    }
    
    const fileSize = fileInput.files[0].size / (1024 * 1024);
    if (fileSize > 10 && !confirm(`Файл большой (${fileSize.toFixed(1)} МБ). Обработка может занять время. Продолжить?`)) {
        return;
    }
    
    const importBtn = event.target;
    const originalText = importBtn.textContent;
    importBtn.textContent = '⏳ Загрузка...';
    importBtn.disabled = true;
    
    showMessage('⏳ Импорт данных... Это может занять до минуты', 'info');
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('exchange', exchangeSelect.value);
    
    try {
        const response = await fetch('/api/import/csv', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        console.log('📦 Ответ сервера:', data);
        
        if (data.success) {
            if (data.already_imported) {
                showMessage(`ℹ️ Файл уже был импортирован ранее`, 'info');
            } else {
                showMessage(`✅ Импортировано ${data.transactions_count} транзакций`, 'success');
            }
            
            // Перезагружаем портфель с сервера
            await loadPortfolioFromServer();
            
            // Обновляем дашборд
            portfolio.load();
            
            // FIX: Сбрасываем input файла
            fileInput.value = '';
            
        } else {
            showMessage('❌ Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка импорта:', error);
        showMessage('❌ Ошибка соединения: ' + error.message, 'error');
    } finally {
        importBtn.textContent = originalText;
        importBtn.disabled = false;
    }
}

// Добавление новых транзакций
async function appendCSV() {
    const fileInput = document.getElementById('csvFile');
    const exchangeSelect = document.getElementById('exchangeSelect');
    
    if (!fileInput || !exchangeSelect) {
        showMessage('Ошибка интерфейса', 'error');
        return;
    }
    
    if (!fileInput.files[0]) {
        showMessage('Выберите CSV файл', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Требуется авторизация', 'error');
        return;
    }
    
    const importBtn = event.target;
    const originalText = importBtn.textContent;
    importBtn.textContent = '⏳ Добавление...';
    importBtn.disabled = true;
    
    showMessage('⏳ Добавление новых транзакций...', 'info');
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('exchange', exchangeSelect.value);
    
    try {
        const response = await fetch('/api/import/csv/append', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.new_count > 0) {
                showMessage(`✅ Добавлено ${data.new_count} новых транзакций`, 'success');
                await loadPortfolioFromServer();
                portfolio.load();
            } else {
                showMessage('ℹ️ Новых транзакций не найдено', 'info');
            }
            // FIX: Сбрасываем input файла
            fileInput.value = '';
            
        } else {
            showMessage('❌ Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка добавления:', error);
        showMessage('❌ Ошибка соединения: ' + error.message, 'error');
    } finally {
        importBtn.textContent = originalText;
        importBtn.disabled = false;
    }
}

// Проверка истории импортов
async function checkImportHistory() {
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Требуется авторизация', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/import/history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            showMessage('Ошибка получения истории', 'error');
            return;
        }
        
        const data = await response.json();
        
        if (data.history && data.history.length > 0) {
            let historyText = '📋 История импортов:\n';
            data.history.forEach(h => {
                const date = new Date(h.imported_at).toLocaleDateString('ru-RU');
                historyText += `• ${date}: ${h.transactions_count} транзакций (${h.filename})\n`;
            });
            showMessage(historyText, 'info');
        } else {
            showMessage('История импортов пуста', 'info');
        }
    } catch (error) {
        console.error('❌ Ошибка получения истории:', error);
        showMessage('❌ Ошибка соединения', 'error');
    }
}

function showMessage(text, type) {
    const oldMsg = document.querySelector('.import-message');
    if (oldMsg) oldMsg.remove();
    
    const msg = document.createElement('div');
    msg.className = 'import-message';
    msg.style.marginTop = '1rem';
    msg.style.padding = '0.75rem 1rem';
    msg.style.borderRadius = '0.5rem';
    msg.style.whiteSpace = 'pre-line';
    
    if (type === 'success') {
        msg.style.backgroundColor = '#0a2f1f';
        msg.style.color = '#4ade80';
        msg.style.border = '1px solid #15803d';
    } else if (type === 'info') {
        msg.style.backgroundColor = '#1e293b';
        msg.style.color = '#94a3b8';
        msg.style.border = '1px solid #3b82f6';
    } else {
        msg.style.backgroundColor = '#450a0a';
        msg.style.color = '#f87171';
        msg.style.border = '1px solid #991b1b';
    }
    
    msg.innerHTML = `
        <span style="margin-right: 0.5rem;">${type === 'success' ? '✅' : type === 'info' ? 'ℹ️' : '❌'}</span>
        <span>${text}</span>
    `;
    
    const importSection = document.querySelector('.import-section');
    if (importSection) {
        importSection.appendChild(msg);
    }
    
    setTimeout(() => msg.remove(), 10000);
}

// Добавляем функции в глобальную область
window.importCSV = importCSV;
window.appendCSV = appendCSV;
window.checkImportHistory = checkImportHistory;

function confirmImport() {
    if (!window.importedTransactions || window.importedTransactions.length === 0) {
        showMessage('Нет транзакций для импорта', 'error');
        return;
    }
    
    let added = 0;
    window.importedTransactions.forEach(t => {
        portfolio.addAsset(t.coin, t.amount, t.price);
        added++;
    });
    
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('csvFile').value = '';
    showMessage(`✅ Добавлено ${added} позиций в портфель`, 'success');
    window.importedTransactions = null;
}

function cancelImport() {
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('csvFile').value = '';
    window.importedTransactions = null;
    showMessage('Импорт отменен', 'info');
}

// Удалить все активы
function deleteAllAssets() {
    if (!confirm('⚠️ Вы уверены, что хотите удалить ВСЕ активы? Это действие нельзя отменить.')) {
        return;
    }
    
    portfolio.assets = [];
    portfolio.activityLog = [];
    portfolio.save();
    
    showMessage('✅ Все активы удалены', 'success');
}

// Закрываем меню при клике вне
document.addEventListener('click', function(event) {
    const navLinks = document.querySelector('.nav-links');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (navLinks && menuBtn && !navLinks.contains(event.target) && !menuBtn.contains(event.target)) {
        navLinks.classList.remove('active');
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    const key = checkAuth();
    if (!key) return;

    const plan = localStorage.getItem('plan') || 'basic';
    const planBadge = document.getElementById('planBadge');
    if (planBadge) {
        planBadge.textContent = plan === 'premium' ? 'PREMIUM' : 'BASIC';
    }

    portfolio = new Portfolio();
    
    // FIX: Загружаем портфель с сервера если есть токен
    if (localStorage.getItem('token')) {
        await loadPortfolioFromServer();
    }
    
    // Делаем функции глобальными
    window.portfolio = portfolio;
    window.addAsset = addAsset;
    window.updateFreeUSDT = updateFreeUSDT;
    window.logout = logout;
    window.refreshPrices = refreshPrices;
    window.toggleMobileMenu = toggleMobileMenu;
    window.scrollTable = scrollTable;
    window.changeChartPeriod = changeChartPeriod;
    window.deleteAllAssets = deleteAllAssets;
});

// Скрываем индикатор после прокрутки
const tableWrapper = document.getElementById('tableWrapper');
if (tableWrapper) {
    tableWrapper.addEventListener('scroll', function() {
        this.classList.add('scrolled');
    });
}