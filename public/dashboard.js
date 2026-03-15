// ===== Класс портфеля =====
class Portfolio {
    constructor() {
        this.assets = [];
        this.prices = {};
        this.freeUSDT = parseFloat(localStorage.getItem('freeUSDT')) || 0;
        this.activityLog = JSON.parse(localStorage.getItem('activityLog')) || [];
        this.load();
        this.startPriceUpdate();
        this.initCharts();
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
            this.addActivity('➕ Добавлено', `${amount} ${coin} по $${price}`);
        } else {
            this.assets.push({
                coin,
                amount,
                price,
                id: Date.now()
            });
            this.addActivity('➕ Новый актив', `${coin} ${amount} шт. по $${price}`);
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
            try {
                const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${asset.coin}USDT`);
                if (response.ok) {
                    const data = await response.json();
                    this.prices[asset.coin] = parseFloat(data.price);
                }
            } catch (e) {}
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
        // Инициализация графиков после загрузки страницы
        setTimeout(() => {
            this.updateCharts();
        }, 500);
    }

    updateCharts() {
        const stats = this.getStats();
        
        // График истории портфеля
        const portfolioCtx = document.getElementById('portfolioChart')?.getContext('2d');
        if (portfolioCtx) {
            const dates = [];
            const values = [];
            
            for (let i = 30; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                
                const randomFactor = 0.95 + Math.random() * 0.1;
                values.push(stats.totalPortfolioValue * randomFactor);
            }
            
            new Chart(portfolioCtx, {
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
        if (categoryCtx && this.assets.length > 0) {
            const categories = {
                'L1': ['BTC', 'ETH', 'SOL', 'BNB'],
                'L2': ['MATIC', 'ARB', 'OP'],
                'DeFi': ['UNI', 'AAVE', 'LINK'],
                'Meme': ['DOGE', 'SHIB', 'PEPE']
            };
            
            const categoryData = {};
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
            
            new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categoryData),
                    datasets: [{
                        data: Object.values(categoryData),
                        backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
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
        }
        if (bestWorst.worstAsset) {
            document.getElementById('worstAsset').textContent = bestWorst.worstAsset.coin;
            document.getElementById('worstAssetProfit').textContent = `${bestWorst.worstProfit.toFixed(1)}%`;
        }
        
        // Диверсификация
        document.getElementById('diversificationScore').textContent = `${diversificationScore.toFixed(0)}%`;
        document.getElementById('diversificationLevel').textContent = this.getDiversificationLevel(diversificationScore);
        
        // Риск
        document.getElementById('riskScore').textContent = `${riskScore}/10`;
        document.getElementById('riskLevel').textContent = this.getRiskLevel(riskScore);
        
        // Сравнение с рынком
        const btcPrice = this.prices['BTC'] || 0;
        const ethPrice = this.prices['ETH'] || 0;
        document.getElementById('portfolioVsMarket').textContent = `${stats.profitPercent.toFixed(1)}%`;
        document.getElementById('portfolioVsMarket').className = stats.profitPercent >= 0 ? 'positive' : 'negative';
        document.getElementById('btcChange').textContent = btcPrice ? `${((btcPrice - 35000) / 35000 * 100).toFixed(1)}%` : '0%';
        document.getElementById('ethChange').textContent = ethPrice ? `${((ethPrice - 2000) / 2000 * 100).toFixed(1)}%` : '0%';
        
        // Цели
        const btcAmount = this.assets.find(a => a.coin === 'BTC')?.amount || 0;
        document.getElementById('btcGoal').textContent = `${btcAmount.toFixed(4)} / 1 BTC`;
        document.getElementById('btcProgress').style.width = `${Math.min(100, btcAmount * 100)}%`;
        
        document.getElementById('profitGoal').textContent = `${stats.profitPercent.toFixed(1)}% / 50%`;
        document.getElementById('profitProgress').style.width = `${Math.min(100, stats.profitPercent * 2)}%`;
        
        document.getElementById('diversityGoal').textContent = `${this.assets.length} / 3`;
        document.getElementById('diversityProgress').style.width = `${Math.min(100, (this.assets.length / 3) * 100)}%`;
        
        // Таблица портфеля
        const tbody = document.getElementById('portfolioBody');
        if (!tbody) return;
        
        if (this.assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">📭 Портфель пуст. Добавьте первую монету!</td></tr>';
            document.getElementById('aiSection').style.display = 'none';
            return;
        }

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
        
        // Последние действия
        const activityList = document.getElementById('activityList');
        if (activityList && this.activityLog.length > 0) {
            activityList.innerHTML = this.activityLog.map(a => `
                <div class="activity-item">
                    <span>${a.action} ${a.details}</span>
                    <span class="activity-time">${a.time}</span>
                </div>
            `).join('');
        }
        
        // Уведомления
        const alertsList = document.getElementById('alertsList');
        if (alertsList) {
            const alerts = [];
            
            if (this.assets.length === 0) {
                alerts.push({ type: 'info', text: 'Добавьте первый актив' });
            }
            
            if (bestWorst.bestProfit > 50) {
                alerts.push({ type: 'success', text: `${bestWorst.bestAsset?.coin} вырос на ${bestWorst.bestProfit.toFixed(1)}%!` });
            }
            
            if (bestWorst.worstProfit < -30) {
                alerts.push({ type: 'danger', text: `${bestWorst.worstAsset?.coin} упал на ${Math.abs(bestWorst.worstProfit).toFixed(1)}%` });
            }
            
            if (diversificationScore < 30) {
                alerts.push({ type: 'warning', text: 'Низкая диверсификация. Добавьте другие монеты' });
            }
            
            if (alerts.length === 0) {
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
        document.getElementById('aiSection').style.display = 'block';
        this.updateCharts();
    }

    renderAI() {
        const aiDiv = document.getElementById('aiRecommendations');
        if (!aiDiv) return;
        
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
            
            if (profit < -20) {
                recommendations.push(`📉 **Убыток**: ${asset.coin} упал на ${Math.abs(profit).toFixed(1)}%`);
            } else if (profit > 50) {
                recommendations.push(`💰 **Прибыль**: ${asset.coin} вырос на ${profit.toFixed(1)}%`);
            }
        });
        
        if (this.assets.length < 3) {
            recommendations.push(`📊 **Мало активов**: Добавьте еще ${3 - this.assets.length} монеты для диверсификации`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push(`✅ **Сбалансированный портфель**`);
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
        btn.textContent = '⏳ Обновление...';
    }
    
    portfolio.updatePrices().finally(() => {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔄 Обновить цены';
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
});

// Скрываем индикатор после прокрутки
document.getElementById('tableWrapper')?.addEventListener('scroll', function() {
    this.classList.add('scrolled');
});