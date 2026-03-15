// Добавляем стили для дашборда
const styles = `
    .dashboard-container {
        max-width: 1400px;
        margin: 2rem auto;
        padding: 0 2rem;
    }

    .stat-card {
        background: #1e293b;
        border-radius: 1.5rem;
        padding: 1.5rem;
        border: 1px solid #334155;
        position: relative;
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
    }

    .positive {
        color: #4ade80;
    }

    /* Улучшенная таблица с прокруткой */
.portfolio-table {
    background: #1e293b;
    border-radius: 1.5rem;
    padding: 2rem;
    border: 1px solid #334155;
    margin-bottom: 2rem;
    position: relative;
}

.table-wrapper {
    position: relative;
    overflow-x: auto;
    border-radius: 1rem;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
}

.table-wrapper::-webkit-scrollbar {
    height: 8px;
    background: #0f172a;
    border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb {
    background: #3b82f6;
    border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
    background: #2563eb;
}

.scroll-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
}

.scroll-btn {
    background: #334155;
    border: 1px solid #475569;
    color: #e2e8f0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    transition: all 0.2s;
}

.scroll-btn:hover {
    background: #3b82f6;
    transform: scale(1.1);
}

.scroll-btn:active {
    transform: scale(0.95);
}

/* Скрываем кнопки на десктопе */
@media (min-width: 1024px) {
    .scroll-buttons {
        display: none;
    }
}

/* Адаптация для мобильных */
@media (max-width: 768px) {
    .portfolio-table {
        padding: 1rem;
    }

    table {
        min-width: 1000px;
        font-size: 0.9rem;
    }

    th, td {
        padding: 0.75rem;
        white-space: nowrap;
    }

    /* Индикатор прокрутки */
    .table-wrapper::after {
        content: '👉';
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: #3b82f6;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        opacity: 0.7;
        pointer-events: none;
        animation: bounce 2s infinite;
    }

    @keyframes bounce {
        0%, 100% { transform: translateY(-50%) translateX(0); }
        50% { transform: translateY(-50%) translateX(5px); }
    }
}

/* Убираем индикатор после прокрутки */
.table-wrapper.scrolled::after {
    display: none;
}

    .negative {
        color: #f87171;
    }

    .free-usdt-card {
        grid-column: span 4;
        margin-bottom: 2rem;
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

    .add-section {
        background: #1e293b;
        border-radius: 1.5rem;
        padding: 2rem;
        margin-bottom: 2rem;
        border: 1px solid #334155;
    }

    .add-form {
        display: flex;
        gap: 1rem;
        align-items: flex-end;
        margin-top: 1.5rem;
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

    /* Мобильная адаптация */
    @media (max-width: 1024px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.75rem;
        }

        .free-usdt-card {
            grid-column: span 2 !important;
        }

        .free-usdt-container {
            flex-direction: column;
            align-items: flex-start;
        }

        .free-usdt-controls {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
        }

        .free-usdt-input {
            width: 100%;
        }

        .add-form {
            flex-direction: column;
            align-items: stretch;
        }

        .add-btn {
            width: 100%;
        }
    }

    // В разделе стилей замени медиа-запрос для таблицы:

@media (max-width: 768px) {
    .portfolio-table {
        padding: 1rem;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        border-radius: 1rem;
    }

    table {
        min-width: 1000px; /* Увеличил ширину для всех колонок */
        font-size: 0.85rem;
        border-collapse: separate;
        border-spacing: 0;
    }

    th, td {
        padding: 0.75rem 0.5rem;
        white-space: nowrap;
        min-width: 100px;
    }

    th:first-child, td:first-child {
        min-width: 80px;
    }

    th:last-child, td:last-child {
        min-width: 60px;
    }

    /* Добавил тень для индикации скролла */
    .portfolio-table::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 40px;
        background: linear-gradient(to right, transparent, #1e293b);
        pointer-events: none;
        opacity: 0.5;
        border-radius: 0 1rem 1rem 0;
    }
        .nav-links.active {
            display: flex;
        }

        .nav-links a {
            padding: 1rem;
            width: 100%;
            text-align: center;
            border-bottom: 1px solid #334155;
        }

        .mobile-menu-btn {
            display: block;
        }

        .stats-grid {
            grid-template-columns: 1fr !important;
        }

        .free-usdt-card {
            grid-column: span 1 !important;
        }

        .free-usdt-controls {
            grid-template-columns: 1fr;
        }

        .portfolio-table {
            padding: 1rem 0.5rem;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        table {
            min-width: 900px;
            font-size: 0.85rem;
        }

        th, td {
            padding: 0.75rem 0.5rem;
            white-space: nowrap;
        }

        .add-section {
            padding: 1rem;
        }
    }
`;

// Добавляем стили
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// ===== Класс портфеля =====
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

    render() {
        const stats = this.getStats();
        
        document.getElementById('totalPortfolioValue').textContent = `$${stats.totalPortfolioValue.toFixed(2)}`;
        document.getElementById('totalBuyValue').textContent = `$${stats.totalBuyValue.toFixed(2)}`;
        document.getElementById('totalCurrentValue').textContent = `$${stats.totalCurrentValue.toFixed(2)}`;
        document.getElementById('freeUsdtValue').textContent = `${this.freeUSDT.toFixed(2)} USDT`;
        
        const profitEl = document.getElementById('profit');
        profitEl.textContent = `$${stats.profit.toFixed(2)} (${stats.profitPercent.toFixed(2)}%)`;
        profitEl.className = stats.profit >= 0 ? 'positive' : 'negative';
        
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
        this.renderAI();
        document.getElementById('aiSection').style.display = 'block';
    }

    renderAI() {
        const aiDiv = document.getElementById('aiRecommendations');
        if (!aiDiv) return;
        
        const stats = this.getStats();
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

// Прокрутка таблицы
function scrollTable(direction) {
    const wrapper = document.getElementById('tableWrapper');
    const scrollAmount = 300;
    
    if (direction === 'left') {
        wrapper.scrollLeft -= scrollAmount;
    } else {
        wrapper.scrollLeft += scrollAmount;
    }
    
    // Добавляем класс для скрытия индикатора
    wrapper.classList.add('scrolled');
}

// Скрываем индикатор после ручной прокрутки
document.getElementById('tableWrapper')?.addEventListener('scroll', function() {
    this.classList.add('scrolled');
});

// Добавляем в window
window.scrollTable = scrollTable;

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
});