// Telegram WebApp инициализация
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand(); // растягиваем на весь экран
    
    // Предзаполняем логин из Telegram если есть
    const usernameInput = document.getElementById('username');
    if (usernameInput && tg.initDataUnsafe?.user?.username) {
        usernameInput.value = tg.initDataUnsafe.user.username;
    }
}

// ===== ОБЩИЕ ФУНКЦИИ =====

// Плавный скролл к секциям
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Анимация появления при скролле
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
});

document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// ===== ФУНКЦИЯ ОБНОВЛЕНИЯ КНОПКИ АВТОРИЗАЦИИ =====
function updateAuthButton() {
    const licenseKey = localStorage.getItem('licenseKey');
    const loginBtn = document.querySelector('.nav-links .btn-primary');
    
    if (loginBtn) {
        if (licenseKey) {
            // Если авторизован - меняем на "Личный кабинет"
            loginBtn.textContent = 'Личный кабинет';
            loginBtn.href = '/dashboard.html';  // ← ВАЖНО: с .html
        } else {
            // Если не авторизован - оставляем "Войти"
            loginBtn.textContent = 'Войти';
            loginBtn.href = '/login.html';
        }
    }
}

// Вызываем при загрузке страницы
document.addEventListener('DOMContentLoaded', updateAuthButton);

// Также вызываем когда localStorage меняется (например после входа)
window.addEventListener('storage', function(e) {
    if (e.key === 'licenseKey') {
        updateAuthButton();
    }
});

// ===== ФУНКЦИИ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ =====

// Кнопка Оплатить (из Telegram WebApp)
const payButton = document.getElementById('payButton');
if (payButton) {
    payButton.addEventListener('click', async () => {
        const data = {
            email: document.getElementById('email')?.value.trim() || '',
            username: document.getElementById('username')?.value.trim() || '',
            telegramId: tg?.initDataUnsafe?.user?.id || null,
            plan: document.querySelector('input[name="plan"]:checked')?.value || 'basic',
            period: document.querySelector('input[name="period"]:checked')?.value || '1 месяц',
            payment_method: document.getElementById('payment_method')?.value || 'card'
        };

        if (!data.email || !data.username) {
            if (tg) {
                tg.showAlert('Заполните email и логин');
            } else {
                alert('Заполните email и логин');
            }
            return;
        }

        try {
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success && result.paymentUrl) {
                if (tg) {
                    tg.openLink(result.paymentUrl); // открываем оплату
                    tg.close(); // закрываем Web App после перехода
                } else {
                    window.location.href = result.paymentUrl;
                }
            } else {
                const msg = 'Ошибка: ' + (result.message || 'неизвестно');
                if (tg) {
                    tg.showAlert(msg);
                } else {
                    alert(msg);
                }
            }
        } catch (err) {
            const msg = 'Ошибка связи: ' + err.message;
            if (tg) {
                tg.showAlert(msg);
            } else {
                alert(msg);
            }
        }
    });
}

// ===== ФУНКЦИИ ДЛЯ СТРАНИЦЫ ВХОДА (login.html) =====

async function loginWithKey() {
    const licenseKey = document.getElementById('licenseKey')?.value.trim();
    const errorEl = document.getElementById('errorMessage');

    if (!licenseKey) {
        if (errorEl) {
            errorEl.textContent = 'Введите лицензионный ключ';
            errorEl.style.display = 'block';
        }
        return;
    }

    try {
        const response = await fetch(`/check_license?license_key=${encodeURIComponent(licenseKey)}`);
        const data = await response.json();

        if (data.status === 'active') {
            // Сохраняем ключ в localStorage
            localStorage.setItem('licenseKey', licenseKey);
            localStorage.setItem('plan', data.plan);
            localStorage.setItem('expireDate', data.expire_date);
            
            // Перенаправляем в дашборд
            window.location.href = '/dashboard.html';
        } else if (data.status === 'expired') {
            if (errorEl) {
                errorEl.textContent = 'Срок действия ключа истек';
                errorEl.style.display = 'block';
            }
        } else {
            if (errorEl) {
                errorEl.textContent = 'Ключ не найден или не активирован';
                errorEl.style.display = 'block';
            }
        }
    } catch (error) {
        if (errorEl) {
            errorEl.textContent = 'Ошибка подключения к серверу';
            errorEl.style.display = 'block';
        }
        console.error(error);
    }
}

// Проверка на странице входа
if (window.location.pathname.includes('login')) {
    // Проверяем, может пользователь уже залогинен
    if (localStorage.getItem('licenseKey')) {
        // Показываем сообщение что уже авторизован
        const container = document.querySelector('.login-container');
        if (container) {
            container.innerHTML = `
                <div class="logo">Cryptalyx</div>
                <div class="subtitle">Вы уже авторизованы</div>
                <div style="background: #0f172a; padding: 2rem; border-radius: 1.5rem; margin: 2rem 0;">
                    <div style="color: #4ade80; font-family: monospace;">${localStorage.getItem('licenseKey').substring(0, 14)}...</div>
                </div>
                <a href="/dashboard.html" class="login-btn" style="text-align: center; text-decoration: none; display: block;">
                    Перейти в портфель →
                </a>
                <button onclick="logout()" class="telegram-btn" style="margin-top: 1rem; background: #334155;">
                    Выйти
                </button>
            `;
        }
    }
    
    // Добавляем обработчик на Enter
    const licenseInput = document.getElementById('licenseKey');
    if (licenseInput) {
        licenseInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginWithKey();
            }
        });
    }
}

// ===== ФУНКЦИИ ДЛЯ ДАШБОРДА (dashboard.html) =====

// Текущие цены (в реальности должны приходить с API)
const currentPrices = {
    'BTC': 43200,
    'ETH': 2250,
    'SOL': 94,
    'BNB': 320,
    'XRP': 0.55,
    'ADA': 0.45,
    'DOT': 7.5,
    'DOGE': 0.08,
    'MATIC': 0.85,
    'LINK': 15.2
};

let portfolio = [];

// Проверка авторизации для дашборда
function checkAuth() {
    const licenseKey = localStorage.getItem('licenseKey');
    if (!licenseKey && window.location.pathname.includes('dashboard')) {
        window.location.href = '/login.html';
        return false;
    }
    return licenseKey;
}

// Загрузка портфеля
function loadPortfolio() {
    const saved = localStorage.getItem('portfolio');
    if (saved) {
        portfolio = JSON.parse(saved);
    }
    renderPortfolio();
}

// Сохранение портфеля
function savePortfolio() {
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
}

// Добавление актива
function addAsset() {
    const coin = document.getElementById('coinSelect')?.value;
    const amount = parseFloat(document.getElementById('amount')?.value);
    const buyPrice = parseFloat(document.getElementById('buyPrice')?.value);
    const buyDate = document.getElementById('buyDate')?.value;

    if (!amount || !buyPrice || !buyDate) {
        alert('Заполните все поля');
        return;
    }

    portfolio.push({
        coin,
        amount,
        buyPrice,
        buyDate,
        id: Date.now()
    });

    savePortfolio();
    renderPortfolio();
    updateAI();

    // Очищаем форму
    if (document.getElementById('amount')) document.getElementById('amount').value = '';
    if (document.getElementById('buyPrice')) document.getElementById('buyPrice').value = '';
    if (document.getElementById('buyDate')) document.getElementById('buyDate').value = '';
}

// Удаление актива
function deleteAsset(id) {
    portfolio = portfolio.filter(a => a.id !== id);
    savePortfolio();
    renderPortfolio();
    updateAI();
}

// Рендер портфеля
function renderPortfolio() {
    const tbody = document.getElementById('portfolioBody');
    if (!tbody) return;
    
    if (portfolio.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    Пока нет активов. Добавьте первый актив выше или посмотрите на образец 👆
                </td>
            </tr>
        `;
        const aiSection = document.getElementById('aiSection');
        if (aiSection) aiSection.style.display = 'none';
        return;
    }

    let totalValue = 0;
    let rows = '';

    portfolio.forEach(asset => {
        const currentPrice = currentPrices[asset.coin] || 0;
        const currentValue = asset.amount * currentPrice;
        const buyValue = asset.amount * asset.buyPrice;
        const profit = currentValue - buyValue;
        const profitPercent = (profit / buyValue * 100).toFixed(2);
        totalValue += currentValue;

        rows += `
            <tr>
                <td><strong>${asset.coin}</strong></td>
                <td>${asset.amount}</td>
                <td>$${asset.buyPrice.toLocaleString()}</td>
                <td>$${currentPrice.toLocaleString()}</td>
                <td>$${currentValue.toLocaleString()}</td>
                <td class="${profit >= 0 ? 'asset-profit' : 'asset-loss'}">
                    ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} (${profitPercent}%)
                </td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${totalValue > 0 ? (currentValue/totalValue*100).toFixed(1) : 0}%"></div>
                    </div>
                    ${totalValue > 0 ? (currentValue/totalValue*100).toFixed(1) : 0}%
                </td>
                <td>
                    <button class="delete-btn" onclick="deleteAsset(${asset.id})">🗑️</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;
}

// Обновление рекомендаций ИИ
function updateAI() {
    const aiSection = document.getElementById('aiSection');
    const aiDiv = document.getElementById('aiRecommendations');
    
    if (!aiSection || !aiDiv) return;
    
    if (portfolio.length === 0) {
        aiSection.style.display = 'none';
        return;
    }

    aiSection.style.display = 'block';
    
    // Простые рекомендации на основе портфеля
    let recommendations = [];
    
    const btcCount = portfolio.filter(a => a.coin === 'BTC').length;
    if (btcCount === 0) {
        recommendations.push('🤔 В вашем портфеле нет Bitcoin. Рекомендуем добавить BTC для стабильности');
    }

    const totalValue = portfolio.reduce((sum, a) => sum + (a.amount * currentPrices[a.coin]), 0);
    const btcValue = portfolio.filter(a => a.coin === 'BTC').reduce((sum, a) => sum + (a.amount * currentPrices[a.coin]), 0);
    const btcPercent = totalValue > 0 ? (btcValue / totalValue * 100).toFixed(1) : 0;

    if (btcPercent > 70) {
        recommendations.push(`⚠️ У вас ${btcPercent}% в BTC — это высокий риск. Рекомендуем диверсифицировать`);
    }

    if (portfolio.length < 3) {
        recommendations.push('📊 Для хорошей диверсификации добавьте еще 2-3 актива');
    }

    // Анализ отдельных активов
    portfolio.forEach(asset => {
        const currentPrice = currentPrices[asset.coin];
        const profit = (currentPrice - asset.buyPrice) / asset.buyPrice * 100;
        
        if (profit > 50) {
            recommendations.push(`💰 ${asset.coin} вырос на ${profit.toFixed(1)}% — возможно, стоит зафиксировать часть прибыли`);
        }
        if (profit < -30) {
            recommendations.push(`📉 ${asset.coin} упал на ${Math.abs(profit).toFixed(1)}% — проанализируйте, стоит ли держать`);
        }
    });

    if (recommendations.length === 0) {
        recommendations.push('✅ Хороший баланс! Продолжайте в том же духе');
    }

    // Берем только первые 3 рекомендации
    aiDiv.innerHTML = recommendations.slice(0, 3).map(r => `
        <div class="ai-card">
            <p>${r}</p>
            <small>Обновлено только что</small>
        </div>
    `).join('');
}

// Выход из аккаунта
function logout() {
    localStorage.removeItem('licenseKey');
    localStorage.removeItem('plan');
    localStorage.removeItem('expireDate');
    localStorage.removeItem('portfolio');
    window.location.href = '/login.html';
}

// Инициализация дашборда
if (window.location.pathname.includes('dashboard')) {
    // Проверяем авторизацию
    const key = checkAuth();
    if (key) {
        const plan = localStorage.getItem('plan') || 'basic';
        const expireDate = localStorage.getItem('expireDate');
        
        const planBadge = document.getElementById('planBadge');
        if (planBadge) {
            planBadge.textContent = plan === 'premium' ? 'PREMIUM' : 'BASIC';
        }
        
        const licenseDisplay = document.getElementById('licenseDisplay');
        if (licenseDisplay) {
            licenseDisplay.textContent = `🔑 ${key.substring(0, 14)}...`;
        }

        // Ссылка на сообщество
        const communityLink = document.getElementById('communityLink');
        if (communityLink) {
            communityLink.href = plan === 'premium' ? 'https://t.me/cryptalyx_premium' : 'https://t.me/cryptalyx_community';
        }

        // Загружаем портфель
        loadPortfolio();
    }
}

// ===== ФУНКЦИИ ДЛЯ СТРАНИЦЫ СКАЧИВАНИЯ (download.html) =====

let currentFile = '';

// Обработчики для кнопок скачивания
document.querySelectorAll('.download-btn')?.forEach(btn => {
    btn.addEventListener('click', function() {
        const file = this.dataset.file;
        
        if (file === 'instruction.pdf') {
            // Инструкцию можно скачать без ключа
            window.location.href = `/public/${file}`;
        } else {
            // Для Excel нужен ключ
            currentFile = file;
            const licenseSection = document.getElementById('licenseSection');
            if (licenseSection) {
                licenseSection.style.display = 'block';
            }
            const licenseInput = document.getElementById('licenseKey');
            if (licenseInput) {
                licenseInput.focus();
            }
        }
    });
});

// Проверка ключа и скачивание
async function verifyAndDownload() {
    const licenseKey = document.getElementById('licenseKey')?.value.trim();
    const errorEl = document.getElementById('licenseError');

    if (!licenseKey) {
        if (errorEl) {
            errorEl.textContent = 'Введите лицензионный ключ';
        }
        return;
    }

    try {
        const response = await fetch(`/check_license?license_key=${encodeURIComponent(licenseKey)}`);
        const data = await response.json();

        if (data.status === 'active') {
            // Ключ действителен - скачиваем файл
            window.location.href = `/public/${currentFile}?key=${licenseKey}`;
            const licenseSection = document.getElementById('licenseSection');
            if (licenseSection) {
                licenseSection.style.display = 'none';
            }
            const licenseInput = document.getElementById('licenseKey');
            if (licenseInput) {
                licenseInput.value = '';
            }
        } else if (data.status === 'expired') {
            if (errorEl) {
                errorEl.textContent = 'Срок действия ключа истек';
            }
        } else if (data.status === 'not_found') {
            if (errorEl) {
                errorEl.textContent = 'Ключ не найден';
            }
        } else {
            if (errorEl) {
                errorEl.textContent = 'Ключ не активирован';
            }
        }
    } catch (error) {
        if (errorEl) {
            errorEl.textContent = 'Ошибка проверки ключа';
        }
        console.error(error);
    }
}

// Проверяем ключ из URL (если перешли по ссылке из Telegram)
if (window.location.pathname.includes('download')) {
    const urlParams = new URLSearchParams(window.location.search);
    const keyFromUrl = urlParams.get('key');
    if (keyFromUrl) {
        const licenseInput = document.getElementById('licenseKey');
        if (licenseInput) {
            licenseInput.value = keyFromUrl;
        }
        const licenseSection = document.getElementById('licenseSection');
        if (licenseSection) {
            licenseSection.style.display = 'block';
        }
        verifyAndDownload();
    }
}

// ===== ФУНКЦИИ ДЛЯ СТРАНИЦЫ ПРОВЕРКИ (check.html) =====

async function checkLicense() {
    const licenseKey = document.getElementById('licenseKey')?.value.trim();
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultDetails = document.getElementById('resultDetails');

    if (!licenseKey) {
        alert('Введите лицензионный ключ');
        return;
    }

    // Показываем загрузку
    if (resultDiv) resultDiv.style.display = 'none';
    if (loadingDiv) loadingDiv.style.display = 'block';

    try {
        const response = await fetch(`/check_license?license_key=${encodeURIComponent(licenseKey)}`);
        const data = await response.json();

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (resultDiv) resultDiv.style.display = 'block';

        if (data.status === 'active') {
            const expireDate = new Date(data.expire_date).toLocaleDateString('ru-RU');
            if (resultIcon) resultIcon.textContent = '✅';
            if (resultTitle) resultTitle.textContent = 'Ключ действителен';
            if (resultDetails) {
                resultDetails.innerHTML = `
                    <p>Тариф: <strong>${data.plan === 'premium' ? 'Премиум' : 'Базовый'}</strong></p>
                    <p>Действует до: <strong>${expireDate}</strong></p>
                    <p>Вы можете войти в <a href="/login.html">личный кабинет</a></p>
                `;
            }
        } else if (data.status === 'expired') {
            if (resultIcon) resultIcon.textContent = '⚠️';
            if (resultTitle) resultTitle.textContent = 'Срок действия истек';
            if (resultDetails) {
                resultDetails.innerHTML = `
                    <p>Ключ истек ${new Date(data.expire_date).toLocaleDateString('ru-RU')}</p>
                    <p>Продлите подписку в <a href="https://t.me/cryptalyx_official_bot" target="_blank">Telegram боте</a></p>
                `;
            }
        } else if (data.status === 'not_found') {
            if (resultIcon) resultIcon.textContent = '❌';
            if (resultTitle) resultTitle.textContent = 'Ключ не найден';
            if (resultDetails) {
                resultDetails.innerHTML = `
                    <p>Проверьте правильность ввода ключа</p>
                    <p>Формат: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX</p>
                `;
            }
        } else {
            if (resultIcon) resultIcon.textContent = '❌';
            if (resultTitle) resultTitle.textContent = 'Ключ не активирован';
            if (resultDetails) {
                resultDetails.innerHTML = `
                    <p>Статус: ${data.status}</p>
                    <p>Оплатите подписку в <a href="https://t.me/cryptalyx_official_bot" target="_blank">Telegram боте</a></p>
                `;
            }
        }
    } catch (error) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (resultDiv) resultDiv.style.display = 'block';
        if (resultIcon) resultIcon.textContent = '❌';
        if (resultTitle) resultTitle.textContent = 'Ошибка';
        if (resultDetails) {
            resultDetails.textContent = 'Не удалось проверить ключ. Попробуйте позже.';
        }
        console.error(error);
    }
}

// Проверяем ключ из URL на странице проверки
if (window.location.pathname.includes('check')) {
    const urlParams = new URLSearchParams(window.location.search);
    const keyFromUrl = urlParams.get('key');
    if (keyFromUrl) {
        const licenseInput = document.getElementById('licenseKey');
        if (licenseInput) {
            licenseInput.value = keyFromUrl;
        }
        checkLicense();
    }
}

// ===== ФУНКЦИИ ДЛЯ КОПИРОВАНИЯ =====

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Скопировано!');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Скопировано!');
    });
}

// Делаем функции глобальными
window.loginWithKey = loginWithKey;
window.addAsset = addAsset;
window.deleteAsset = deleteAsset;
window.logout = logout;
window.verifyAndDownload = verifyAndDownload;
window.checkLicense = checkLicense;
window.copyToClipboard = copyToClipboard;