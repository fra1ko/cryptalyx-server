// ===== Класс портфеля =====
class Portfolio {
constructor() {
    this.assets = [];
    this.prices = {};
    this.priceCache = {}; // Добавить эту строку
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
    const now = Date.now();
    
    for (const asset of this.assets) {
        const coin = asset.coin;
        
        // Если цена обновлялась меньше минуты назад, пропускаем
        if (this.priceCache && this.priceCache[coin] && (now - this.priceCache[coin].timestamp < 60000)) {
            this.prices[coin] = this.priceCache[coin].price;
            continue;
        }
        
        let price = 0;
        
        // Массив API для последовательного опроса
        const apis = [
            {
                url: `https://api.binance.com/api/v3/ticker/price?symbol=${coin}USDT`,
                parser: (data) => parseFloat(data.price)
            },
            {
                url: `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${coin}USDT`,
                parser: (data) => data.result?.list?.[0]?.lastPrice ? parseFloat(data.result.list[0].lastPrice) : 0
            },
            {
                url: `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${coin}-USDT`,
                parser: (data) => data.data?.price ? parseFloat(data.data.price) : 0
            }
        ];
        
        // Пробуем все API по очереди
        for (const api of apis) {
            try {
                const response = await fetch(api.url);
                if (response.ok) {
                    const data = await response.json();
                    price = api.parser(data);
                    if (price > 0) {
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        // Если не нашли через стандартные API, пробуем CoinGecko
        if (price === 0) {
            const specialCoins = {
                'HYPE': 'hyperliquid',
                'SPX': 'spx6900',
                'PEPE': 'pepe',
                'WIF': 'dogwifcoin',
                'JUP': 'jupiter',
                'RNDR': 'render',
                'ONDO': 'ondo-finance',
                'STRK': 'starknet',
                'ARB': 'arbitrum',
                'OP': 'optimism'
            };

            const geckoId = specialCoins[coin] || coin.toLowerCase();
            
            try {
                const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`);
                if (response.ok) {
                    const data = await response.json();
                    price = data[geckoId]?.usd || 0;
                }
            } catch (e) {}
        }
        
        // Сохраняем в кэш
        if (!this.priceCache) this.priceCache = {};
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
        
        this.assets.forEach(asset => {
            const currentPrice = this.prices[asset.coin] || 0;
            totalBuyValue += asset.amount * asset.price;
            totalCurrentValue += asset.amount * currentPrice;
        });
        
        const profit = totalCurrentValue - totalBuyValue;
        const profitPercent = totalBuyValue > 0 ? (profit / totalBuyValue * 100) : 0;
        
        return {
            totalBuyValue,
            totalCurrentValue,
            totalPortfolioValue: totalCurrentValue + this.freeUSDT,
            profit,
            profitPercent
        };
    }

    getBestAndWorstAssets() {
        if (this.assets.length === 0) return { best: null, worst: null, bestProfit: 0, worstProfit: 0 };
        
        let bestAsset = null;
        let worstAsset = null;
        let bestProfit = -Infinity;
        let worstProfit = Infinity;
        
        this.assets.forEach(asset => {
            const currentPrice = this.prices[asset.coin] || 0;
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
            totalValue += asset.amount * (this.prices[asset.coin] || 0);
        });
        
        if (totalValue === 0) return 0;
        
        let sumSquares = 0;
        this.assets.forEach(asset => {
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
    
    // График истории портфеля
    const portfolioCtx = document.getElementById('portfolioChart')?.getContext('2d');
    if (portfolioCtx) {
        // Уничтожаем предыдущий график если есть
        if (this.portfolioChart) {
            this.portfolioChart.destroy();
        }
        
        const dates = [];
        const values = [];
        
        let days = 30;
        let interval = 1;
        let format = 'short';
        
        if (this.chartPeriod === '1d') {
            days = 1;
            interval = 1;
            format = 'hour';
            // Для 1 дня показываем часы
            for (let i = 24; i >= 0; i--) {
                const date = new Date();
                date.setHours(date.getHours() - i);
                dates.push(date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
                values.push(stats.totalPortfolioValue * (0.99 + Math.random() * 0.02));
            }
        } else if (this.chartPeriod === '1w') {
            days = 7;
            interval = 1;
            for (let i = days; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                values.push(stats.totalPortfolioValue * (0.97 + Math.random() * 0.06));
            }
        } else if (this.chartPeriod === '1m') {
            days = 30;
            interval = 1;
            for (let i = days; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                values.push(stats.totalPortfolioValue * (0.95 + Math.random() * 0.1));
            }
        } else if (this.chartPeriod === '1y') {
            days = 365;
            interval = 7; // Показываем каждую неделю
            for (let i = days; i >= 0; i -= interval) {
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
                    fill: true,
                    pointRadius: this.chartPeriod === '1d' ? 2 : 1,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                scales: {
                    y: {
                        grid: { color: '#334155' },
                        ticks: { 
                            color: '#94a3b8',
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { 
                            color: '#94a3b8',
                            maxTicksLimit: this.chartPeriod === '1y' ? 12 : 8
                        }
                    }
                }
            }
        });
    }

    // График распределения по категориям
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
            const value = asset.amount * (this.prices[asset.coin] || 0);
            
            let category = 'Other';
            for (const [cat, coins] of Object.entries(categories)) {
                if (coins.includes(asset.coin)) {
                    category = cat;
                    break;
                }
            }
            
            categoryData[category] = (categoryData[category] || 0) + value;
        });
        
        // Если нет данных, показываем заглушку
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
                plugins: { 
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });

        // Легенда
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
        
        // Основные метрики
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
        
        // Лучший/худший актив
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
        
        // Таблица портфеля
        const tbody = document.getElementById('portfolioBody');
        if (!tbody) return;
        
        if (this.assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">📭 Портфель пуст. Добавьте первую монету!</td></tr>';
            const aiSection = document.getElementById('aiSection');
            if (aiSection) aiSection.style.display = 'none';
        } else {
            let rows = '';

            this.assets.forEach(asset => {
                const currentPrice = this.prices[asset.coin] || 0;
                const currentValue = asset.amount * currentPrice;
                const buyValue = asset.amount * asset.price;
                const profit = currentValue - buyValue;
                const profitPercent = buyValue > 0 ? (profit / buyValue * 100) : 0;
                const share = stats.totalCurrentValue > 0 ? (currentValue / stats.totalCurrentValue * 100) : 0;

                rows += `
                    <tr>
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
                        <td><button class="delete-btn" onclick="portfolio.removeAsset(${asset.id})">🗑️</button></td>
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
            
            if (this.assets.length === 0) {
                alerts.push({ type: 'info', text: 'Добавьте первый актив' });
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
            
            if (alerts.length === 0 && this.assets.length > 0) {
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
        
        if (this.assets.length === 0) {
            const aiSection = document.getElementById('aiSection');
            if (aiSection) aiSection.style.display = 'none';
            return;
        }
        
        const stats = this.getStats();
        const bestWorst = this.getBestAndWorstAssets();
        const recommendations = [];
        
        let maxShare = 0;
        let maxCoin = '';
        this.assets.forEach(asset => {
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
        
        this.assets.forEach(asset => {
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
        
        if (this.assets.length < 3) {
            recommendations.push(`📊 **Мало активов**: Добавьте еще ${3 - this.assets.length} монеты для диверсификации`);
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
    
    // Очистка полей
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
    
    // Подсветка активной кнопки
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    portfolio.chartPeriod = period;
    portfolio.updateCharts();
}

async function importCSV() {
    const fileInput = document.getElementById('csvFile');
    const exchange = document.getElementById('exchangeSelect').value;
    
    if (!fileInput.files[0]) {
        showMessage('Выберите CSV файл', 'error');
        return;
    }
    
    const importBtn = document.querySelector('.import-section .action-btn');
    const originalText = importBtn.textContent;
    importBtn.textContent = '⏳ Загрузка...';
    importBtn.disabled = true;
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('exchange', exchange);
    
    try {
        const response = await fetch('/api/import/csv', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('📦 Ответ сервера:', data);
        
        if (data.success) {
            window.importedTransactions = data.transactions;
            document.getElementById('importCount').textContent = data.count;
            
            if (data.count > 0) {
                document.getElementById('importPreview').style.display = 'block';
                
                // Показываем детали в консоли
                console.log('📊 Найденные монеты:', data.coins);
                console.log('📈 Итоговые позиции:', data.transactions);
                
                let details = `Найдено ${data.count} монет:\n`;
                data.transactions.slice(0, 3).forEach(t => {
                    details += `${t.coin}: ${t.amount.toFixed(4)} по средней $${t.price.toFixed(2)}\n`;
                });
                
                showMessage(`✅ Найдено ${data.count} монет`, 'success');
            } else {
                showMessage('❌ Не найдено спот-покупок в CSV', 'error');
            }
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

function showMessage(text, type) {
    // Убираем старые сообщения
    const oldMsg = document.querySelector('.import-message');
    if (oldMsg) oldMsg.remove();
    
    const msg = document.createElement('div');
    msg.className = type === 'success' ? 'import-success' : 'import-error';
    msg.style.marginTop = '1rem';
    msg.style.padding = '0.75rem 1rem';
    msg.style.borderRadius = '0.5rem';
    msg.style.backgroundColor = type === 'success' ? '#0a2f1f' : '#450a0a';
    msg.style.color = type === 'success' ? '#4ade80' : '#f87171';
    msg.style.border = type === 'success' ? '1px solid #15803d' : '1px solid #991b1b';
    msg.innerHTML = `
        <span style="margin-right: 0.5rem;">${type === 'success' ? '✅' : '❌'}</span>
        <span>${text}</span>
    `;
    
    const importSection = document.querySelector('.import-section');
    importSection.appendChild(msg);
    
    setTimeout(() => msg.remove(), 5000);
}

function confirmImport() {
    if (!window.importedTransactions || window.importedTransactions.length === 0) {
        showMessage('Нет транзакций для импорта', 'error');
        return;
    }
    
    let added = 0;
    window.importedTransactions.forEach(t => {
        // Добавляем как одну позицию с средней ценой
        portfolio.addAsset(t.coin, t.amount, t.price);
        added++;
    });
    
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('csvFile').value = '';
    showMessage(`✅ Добавлено ${added} позиций в портфель (средние цены рассчитаны)`, 'success');
    window.importedTransactions = null;
}

function cancelImport() {
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('csvFile').value = '';
    window.importedTransactions = null;
    showMessage('Импорт отменен', 'info');
}

window.importCSV = importCSV;
window.confirmImport = confirmImport;

// Закрываем меню при клике вне
document.addEventListener('click', function(event) {
    const navLinks = document.querySelector('.nav-links');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (navLinks && menuBtn && !navLinks.contains(event.target) && !menuBtn.contains(event.target)) {
        navLinks.classList.remove('active');
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    const key = checkAuth();
    if (!key) return;

    const plan = localStorage.getItem('plan') || 'basic';
    const planBadge = document.getElementById('planBadge');
    if (planBadge) {
        planBadge.textContent = plan === 'premium' ? 'PREMIUM' : 'BASIC';
    }

    portfolio = new Portfolio();
    
    // Делаем функции глобальными
    window.portfolio = portfolio;
    window.addAsset = addAsset;
    window.updateFreeUSDT = updateFreeUSDT;
    window.logout = logout;
    window.refreshPrices = refreshPrices;
    window.toggleMobileMenu = toggleMobileMenu;
    window.scrollTable = scrollTable;
    window.changeChartPeriod = changeChartPeriod;
});

// Скрываем индикатор после прокрутки
const tableWrapper = document.getElementById('tableWrapper');
if (tableWrapper) {
    tableWrapper.addEventListener('scroll', function() {
        this.classList.add('scrolled');
    });
}