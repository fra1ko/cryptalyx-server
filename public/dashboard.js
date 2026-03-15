// Добавляем стили
const styles = `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
    }

    .dashboard-container {
        max-width: 1400px;
        margin: 2rem auto;
        padding: 0 2rem;
    }

    /* Статистика */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: #1e293b;
    border-radius: 1.5rem;
    padding: 1.5rem;
    border: 1px solid #334155;
    transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    border-color: #3b82f6;
}

.main-card {
    background: linear-gradient(135deg, #1e293b, #2d3a4f);
    border-left: 4px solid #3b82f6;
}

.profit-card {
    background: linear-gradient(135deg, #1e293b, #2d3a4f);
}

.stat-label {
    color: #94a3b8;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
}

.stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.2;
}

.stat-trend {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #4ade80;
}

/* Карточка свободных USDT */
.free-usdt-card {
    grid-column: span 4;
    background: #1e293b;
    border: 1px solid #3b82f6;
}

.free-usdt-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.free-usdt-info {
    display: flex;
    align-items: baseline;
    gap: 2rem;
}

.free-usdt-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.free-usdt-input {
    background: #0f172a;
    border: 2px solid #334155;
    color: #f1f5f9;
    padding: 0.75rem 1rem;
    border-radius: 1rem;
    font-size: 1rem;
    width: 150px;
}

.free-usdt-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: #1e293b;
}

.action-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 1rem;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
}

.action-btn:hover {
    background: #2563eb;
    transform: translateY(-2px);
}

.refresh-btn {
    background: #334155;
    color: #e2e8f0;
    border: 1px solid #475569;
    border-radius: 1rem;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.refresh-btn:hover {
    background: #475569;
}

.refresh-icon {
    font-size: 1rem;
}

/* Адаптивность */
@media (max-width: 1024px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .free-usdt-card {
        grid-column: span 2;
    }
    
    .free-usdt-container {
        flex-direction: column;
        align-items: flex-start;
    }
}

@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .free-usdt-card {
        grid-column: span 1;
    }
    
    .free-usdt-info {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .free-usdt-controls {
        flex-wrap: wrap;
    }
}

    /* Форма добавления */
    .add-section {
        background: #1e293b;
        border-radius: 1.5rem;
        padding: 2rem;
        margin-bottom: 2rem;
        border: 1px solid #334155;
    }

    .add-section h2 {
        color: #f1f5f9;
        margin-bottom: 1.5rem;
    }

    .add-form {
        display: flex;
        gap: 1rem;
        align-items: flex-end;
    }

    .form-group {
        flex: 1;
    }

    .form-group label {
        display: block;
        font-size: 0.85rem;
        color: #94a3b8;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    .form-group input {
        width: 100%;
        padding: 0.875rem 1rem;
        border: 2px solid #334155;
        border-radius: 1rem;
        font-size: 1rem;
        transition: all 0.2s;
        background: #0f172a;
        color: #f1f5f9;
    }

    .form-group input:focus {
        outline: none;
        border-color: #3b82f6;
        background: #1e293b;
    }

    .add-btn {
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 1rem;
        padding: 0.875rem 2rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 1rem;
        height: 3.5rem;
        white-space: nowrap;
    }

    .add-btn:hover {
        background: #2563eb;
        transform: translateY(-2px);
    }

    /* Таблица */
    .portfolio-table {
        background: #1e293b;
        border-radius: 1.5rem;
        padding: 2rem;
        border: 1px solid #334155;
        overflow-x: auto;
        margin-bottom: 2rem;
    }

    .portfolio-table h2 {
        color: #f1f5f9;
        margin-bottom: 1.5rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        text-align: left;
        padding: 1rem;
        background: #0f172a;
        color: #94a3b8;
        font-weight: 600;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 2px solid #334155;
    }

    td {
        padding: 1rem;
        border-bottom: 1px solid #334155;
        color: #e2e8f0;
    }

    .delete-btn {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0.5rem;
        border-radius: 0.5rem;
        transition: all 0.2s;
    }
        

    .delete-btn:hover {
        color: #f87171;
        background: #334155;
    }

    .empty-state {
        text-align: center;
        padding: 4rem;
        color: #64748b;
        font-size: 1.1rem;
    }

    /* Рекомендации ИИ */
    .ai-section {
        background: #1e293b;
        border-radius: 1.5rem;
        padding: 2rem;
        border: 1px solid #334155;
    }

    .ai-section h2 {
        color: #f1f5f9;
        margin-bottom: 1.5rem;
    }

    .ai-card {
        background: #0f172a;
        padding: 1.5rem;
        border-radius: 1rem;
        margin-bottom: 1rem;
        border-left: 4px solid #3b82f6;
    }

    .ai-card p {
        margin-bottom: 0.5rem;
        color: #e2e8f0;
        line-height: 1.5;
    }

    .ai-card small {
        color: #64748b;
        font-size: 0.85rem;
    }

    /* Навигация */
    .navbar {
        background: #1e293b;
        border-bottom: 1px solid #334155;
        position: sticky;
        top: 0;
        z-index: 100;
    }

    .nav-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .logo {
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .nav-links {
        display: flex;
        gap: 2rem;
        align-items: center;
    }

    .nav-links a {
        text-decoration: none;
        color: #94a3b8;
        font-weight: 500;
        transition: color 0.2s;
    }

    .nav-links a:hover {
        color: #3b82f6;
    }

    .nav-links a.active {
        color: #3b82f6;
        font-weight: 600;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-left: 2rem;
    }

    .plan-badge {
        background: #3b82f6;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        font-size: 0.8rem;
        font-weight: 600;
    }

    .logout-btn {
        background: none;
        border: 1px solid #475569;
        padding: 0.5rem 1.25rem;
        border-radius: 2rem;
        cursor: pointer;
        transition: all 0.2s;
        color: #94a3b8;
        font-size: 0.9rem;
    }

    .logout-btn:hover {
        background: #334155;
        color: #f1f5f9;
    }

    @media (max-width: 1024px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .add-form {
            flex-direction: column;
            align-items: stretch;
        }
        
        .add-btn {
            width: 100%;
        }
    }

    @media (max-width: 768px) {
        .stats-grid {
            grid-template-columns: 1fr;
        }
        
        .nav-links {
            display: none;
        }
    }
`;

// Добавляем стили
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// ===== Функция для получения цены с разных API =====
async function getCoinPrice(coin) {
    coin = coin.toUpperCase().trim();
    
    // Пробуем Binance
    try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${coin}USDT`);
        if (res.ok) {
            const data = await res.json();
            return parseFloat(data.price);
        }
    } catch (e) {}

    // Пробуем KuCoin
    try {
        const res = await fetch(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${coin}-USDT`);
        if (res.ok) {
            const data = await res.json();
            if (data.data?.price) return parseFloat(data.data.price);
        }
    } catch (e) {}

    // Пробуем Bybit
    try {
        const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${coin}USDT`);
        if (res.ok) {
            const data = await res.json();
            if (data.result?.list?.[0]?.lastPrice) return parseFloat(data.result.list[0].lastPrice);
        }
    } catch (e) {}

    // Пробуем CoinGecko
    try {
        const coinLower = coin.toLowerCase();
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinLower}&vs_currencies=usd`);
        if (res.ok) {
            const data = await res.json();
            if (data[coinLower]?.usd) return data[coinLower].usd;
        }
    } catch (e) {}

    return 0;
}

// ===== Класс для работы с портфелем =====
class Portfolio {
    constructor() {
        this.assets = [];
        this.prices = {};
        this.freeUSDT = parseFloat(localStorage.getItem('freeUSDT')) || 0;
        this.load();
        this.startPriceUpdate();
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
        this.render();
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
        } else {
            this.assets.push({
                coin,
                amount,
                price,
                id: Date.now()
            });
        }
        
        this.save();
    }

    removeAsset(id) {
        this.assets = this.assets.filter(a => a.id !== id);
        this.save();
    }

    setFreeUSDT(value) {
        this.freeUSDT = value;
        localStorage.setItem('freeUSDT', value);
        this.render();
    }

    async updatePrices() {
        if (this.assets.length === 0) return;
        
        for (const asset of this.assets) {
            const price = await getCoinPrice(asset.coin);
            if (price > 0) {
                this.prices[asset.coin] = price;
            }
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
        totalPortfolioValue: totalCurrentValue + this.freeUSDT,  // ← добавили
        profit,
        profitPercent,
        freeUSDT: this.freeUSDT
    };
}

render() {
    const stats = this.getStats();
    
    // Обновляем статистику
    const totalPortfolioEl = document.getElementById('totalPortfolioValue');
    const totalBuyEl = document.getElementById('totalBuyValue');
    const totalCurrentEl = document.getElementById('totalCurrentValue');
    const profitEl = document.getElementById('profit');
    const freeUsdtEl = document.getElementById('freeUsdtValue');
    const freeUsdtInput = document.getElementById('freeUsdtInput');
    
    if (totalPortfolioEl) totalPortfolioEl.textContent = `$${stats.totalPortfolioValue.toFixed(2)}`;
    if (totalBuyEl) totalBuyEl.textContent = `$${stats.totalBuyValue.toFixed(2)}`;
    if (totalCurrentEl) totalCurrentEl.textContent = `$${stats.totalCurrentValue.toFixed(2)}`;
    if (freeUsdtEl) freeUsdtEl.textContent = `${this.freeUSDT.toFixed(2)} USDT`;
    if (freeUsdtInput) freeUsdtInput.value = this.freeUSDT;
    
    if (profitEl) {
        profitEl.textContent = `$${stats.profit.toFixed(2)} (${stats.profitPercent.toFixed(2)}%)`;
        profitEl.className = stats.profit >= 0 ? 'positive' : 'negative';
    }
        
        // Обновляем таблицу
        const tbody = document.getElementById('portfolioBody');
        if (!tbody) return;
        
        if (this.assets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        📭 Портфель пуст. Добавьте первую монету!
                    </td>
                </tr>
            `;
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

            // Определяем количество знаков после запятой в зависимости от цены
            const priceDecimals = currentPrice < 0.001 ? 8 : (currentPrice < 1 ? 6 : 2);
            const amountDecimals = asset.amount < 0.001 ? 8 : (asset.amount < 1 ? 6 : 4);

            rows += `
                <tr>
                    <td><strong>${asset.coin}</strong></td>
                    <td>${asset.amount.toFixed(amountDecimals)}</td>
                    <td>$${asset.price.toFixed(priceDecimals)}</td>
                    <td>$${currentPrice.toFixed(priceDecimals)}</td>
                    <td>$${buyValue.toFixed(2)}</td>
                    <td>$${currentValue.toFixed(2)}</td>
                    <td class="${profit >= 0 ? 'positive' : 'negative'}">
                        ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)
                    </td>
                    <td>${share.toFixed(1)}%</td>
                    <td>
                        <button class="delete-btn" onclick="portfolio.removeAsset(${asset.id})">🗑️</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = rows;
        this.renderAI();
        document.getElementById('aiSection').style.display = 'block';
    }

    renderAI() {
        const aiDiv = document.getElementById('aiRecommendations');
        if (!aiDiv) return;
        
        const stats = this.getStats();
        const recommendations = [];
        
        // Анализ концентрации
        let maxShare = 0;
        let maxCoin = '';
        this.assets.forEach(asset => {
            const currentPrice = this.prices[asset.coin] || 0;
            const share = stats.totalCurrentValue > 0 ? 
                ((asset.amount * currentPrice) / stats.totalCurrentValue * 100) : 0;
            if (share > maxShare) {
                maxShare = share;
                maxCoin = asset.coin;
            }
        });
        
        if (maxShare > 50) {
            recommendations.push(`⚠️ **Критическая концентрация**: ${maxShare.toFixed(1)}% в ${maxCoin}. Это очень рискованно. Рекомендуем распределить капитал.`);
        } else if (maxShare > 30) {
            recommendations.push(`📊 **Высокая концентрация**: ${maxShare.toFixed(1)}% в ${maxCoin}. Рассмотрите диверсификацию.`);
        }
        
        // Анализ убыточных позиций
        this.assets.forEach(asset => {
            const currentPrice = this.prices[asset.coin] || 0;
            const profit = ((currentPrice - asset.price) / asset.price * 100);
            
            if (profit < -40) {
                recommendations.push(`🔴 **Критический убыток**: ${asset.coin} упал на ${Math.abs(profit).toFixed(1)}%. Рекомендуем пересмотреть инвестицию.`);
            } else if (profit < -20) {
                recommendations.push(`📉 **Убыток**: ${asset.coin} упал на ${Math.abs(profit).toFixed(1)}%. ${profit < -30 ? 'Возможно, стоит зафиксировать.' : 'Можно держать, но следите.'}`);
            } else if (profit > 50) {
                recommendations.push(`💰 **Прибыль**: ${asset.coin} вырос на ${profit.toFixed(1)}%. Рекомендуем частично зафиксировать.`);
            }
        });
        
        // Анализ свободных средств
        if (this.freeUSDT > 0) {
            const freePercent = (this.freeUSDT / stats.totalWithFree * 100);
            if (freePercent > 30) {
                recommendations.push(`💵 **Много свободных средств**: ${freePercent.toFixed(1)}% в USDT. Можно докупить активы на просадке.`);
            } else if (freePercent < 5) {
                recommendations.push(`⚠️ **Мало свободных средств**: только ${freePercent.toFixed(1)}% в USDT. Нет подушки для докупки.`);
            }
        }
        
        // Общая оценка
        if (stats.profitPercent < -30) {
            recommendations.push(`📊 **Кризис портфеля**: Общий убыток ${Math.abs(stats.profitPercent).toFixed(1)}%. Рекомендуем пересмотреть стратегию.`);
        } else if (stats.profitPercent > 30) {
            recommendations.push(`📊 **Отличный результат**: Прибыль ${stats.profitPercent.toFixed(1)}%. Зафиксируйте часть в USDT.`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push(`✅ **Сбалансированный портфель**: Хорошее распределение. Продолжайте в том же духе.`);
        }
        
        aiDiv.innerHTML = recommendations.slice(0, 4).map(r => `
            <div class="ai-card">
                <p>${r}</p>
                <small>⚡ ИИ-анализ • ${new Date().toLocaleTimeString()}</small>
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
    const input = document.getElementById('freeUsdtInput');
    const value = parseFloat(input.value);
    if (!isNaN(value) && value >= 0) {
        portfolio.setFreeUSDT(value);
        // Показываем сообщение об успехе
        input.style.borderColor = '#4ade80';
        setTimeout(() => {
            input.style.borderColor = '#334155';
        }, 1000);
    } else {
        alert('Введите корректную сумму');
        input.value = portfolio.freeUSDT;
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

// ===== Инициализация =====
document.addEventListener('DOMContentLoaded', () => {
    const key = checkAuth();
    if (!key) return;

    const plan = localStorage.getItem('plan') || 'basic';
    const planBadge = document.getElementById('planBadge');
    if (planBadge) {
        planBadge.textContent = plan === 'premium' ? 'PREMIUM' : 'BASIC';
    }

    portfolio = new Portfolio();
    window.portfolio = portfolio;
    window.addAsset = addAsset;
    window.updateFreeUSDT = updateFreeUSDT;
    window.logout = logout;
    window.refreshPrices = refreshPrices;
});