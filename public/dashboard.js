// ===== Класс портфеля =====
class Portfolio {
    constructor() {
        this.assets = [];
        this.prices = {};
        this.freeUSDT = parseFloat(localStorage.getItem('freeUSDT')) || 0;
        this.activityLog = JSON.parse(localStorage.getItem('activityLog')) || [];
        this.chartPeriod = localStorage.getItem('chartPeriod') || '1m';
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
        for (const asset of this.assets) {
            // Пробуем Binance
            try {
                const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${asset.coin}USDT`);
                if (response.ok) {
                    const data = await response.json();
                    this.prices[asset.coin] = parseFloat(data.price);
                    continue;
                }
            } catch (e) {}

            // Пробуем CoinGecko
            try {
                const coinLower = asset.coin.toLowerCase();
                const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinLower}&vs_currencies=usd`);
                if (response.ok) {
                    const data = await response.json();
                    if (data[coinLower]?.usd) {
                        this.prices[asset.coin] = data[coinLower].usd;
                        continue;
                    }
                }
            } catch (e) {}

            // Если не нашли, ставим 0
            this.prices[asset.coin] = 0;
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
            // Очищаем предыдущий график
            if (window.portfolioChart) window.portfolioChart.destroy();
            
            const dates = [];
            const values = [];
            
            let days = 30;
            if (this.chartPeriod === '1d') days = 1;
            if (this.chartPeriod === '1w') days = 7;
            if (this.chartPeriod === '1m') days = 30;
            if (this.chartPeriod === '1y') days = 365;
            
            for (let i = days; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                
                // Генерируем историю на основе текущего портфеля
                const randomFactor = 0.95 + Math.random() * 0.1;
                values.push(stats.totalPortfolioValue * randomFactor);
            }
            
            window.portfolioChart = new Chart(portfolioCtx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Стоимость портфеля (USDT)',
                        data: values,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
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
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });
        }

        // График распределения по категориям
        const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
        if (categoryCtx) {
            // Очищаем предыдущий график
            if (window.categoryChart) window.categoryChart.destroy();
            
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
            
            let totalValue = 0;
            
            this.assets.forEach(asset => {
                const value = asset.amount * (this.prices[asset.coin] || 0);
                totalValue += value;
                
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
            
            window.categoryChart = new Chart(categoryCtx, {
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
        document.getElementById('totalPortfolioValue').textContent = `$${stats.totalPortfolioValue.toFixed(2)}`;
        document.getElementById('totalBuyValue').textContent = `$${stats.totalBuyValue.toFixed(2)}`;
        document.getElementById('totalCurrentValue').textContent = `$${stats.totalCurrentValue.toFixed(2)}`;
        document.getElementById('freeUsdtValue').textContent = `${this.freeUSDT.toFixed(2)} USDT`;
        
        const profitEl = document.getElementById('profit');
        profitEl.textContent = `$${stats.profit.toFixed(2)} (${stats.profitPercent.toFixed(2)}%)`;
        profitEl.className = stats.profit >= 0 ? 'positive' : 'negative';
        
        // Лучший/худший актив
        if (bestWorst.bestAsset) {
            document.getElementById('bestAsset').textContent = bestWorst.bestAsset.coin;
            document.getElementById('bestAssetProfit').textContent = `+${bestWorst.bestProfit.toFixed(1)}%`;
            document.getElementById('bestAssetProfit').className = 'positive';
        } else {
            document.getElementById('bestAsset').textContent = '—';
            document.getElementById('bestAssetProfit').textContent = '';
        }
        
        if (bestWorst.worstAsset) {
            document.getElementById('worstAsset').textContent = bestWorst.worstAsset.coin;
            document.getElementById('worstAssetProfit').textContent = `${bestWorst.worstProfit.toFixed(1)}%`;
            document.getElementById('worstAssetProfit').className = 'negative';
        } else {
            document.getElementById('worstAsset').textContent = '—';
            document.getElementById('worstAssetProfit').textContent = '';
        }
        
        // Диверсификация
        document.getElementById('diversificationScore').textContent = `${diversificationScore.toFixed(0)}%`;
        document.getElementById('diversificationLevel').textContent = this.getDiversificationLevel(diversificationScore);
        
        // Риск
        document.getElementById('riskScore').textContent = `${riskScore}/10`;
        document.getElementById('riskLevel').textContent = this.getRiskLevel(riskScore);
        
        // Дата
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Таблица портфеля
        const tbody = document.getElementById('portfolioBody');
        if (!tbody) return;
        
        if (this.assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">📭 Портфель пуст. Добавьте первую монету!</td></tr>';
            document.getElementById('aiSection').style.display = 'none';
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
            document.getElementById('aiSection').style.display = 'block';
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
            document.getElementById('aiSection').style.display = 'none';
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
    if (!isNaN(value)) {
        portfolio.setFreeUSDT(value);
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
    
    portfolio.updatePrices().finally(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="refresh-icon">🔄</span> Обновить цены';
        }
    });
}

function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

function scrollTable(direction) {
    const wrapper = document.getElementById('tableWrapper');
    const scrollAmount = 300;
    
    if (direction === 'left') {
        wrapper.scrollLeft -= scrollAmount;
    } else {
        wrapper.scrollLeft += scrollAmount;
    }
    
    wrapper.classList.add('scrolled');
}

function changeChartPeriod(period) {
    localStorage.setItem('chartPeriod', period);
    
    // Подсветка активной кнопки
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    portfolio.chartPeriod = period;
    portfolio.updateCharts();
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
document.addEventListener('DOMContentLoaded', () => {
    const key = checkAuth();
    if (!key) return;

    const plan = localStorage.getItem('plan') || 'basic';
    document.getElementById('planBadge').textContent = plan === 'premium' ? 'PREMIUM' : 'BASIC';

    portfolio = new Portfolio();
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
document.getElementById('tableWrapper')?.addEventListener('scroll', function() {
    this.classList.add('scrolled');
});