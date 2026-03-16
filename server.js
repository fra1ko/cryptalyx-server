require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs'); // ← ОДИН РАЗ!
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const csv = require('csv-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// ===== Базовый путь к проекту =====
const BASE_PATH = __dirname;
const ADMIN_PATH = path.join(BASE_PATH, 'admin');
const PUBLIC_PATH = path.join(BASE_PATH, 'public');

console.log('📁 Базовая папка:', BASE_PATH);
console.log('📁 Admin папка:', ADMIN_PATH);
console.log('📁 Public папка:', PUBLIC_PATH);

// Проверяем наличие файлов в public
try {
    const files = fs.readdirSync(PUBLIC_PATH);
    console.log('📁 Файлы в public:', files);
} catch (err) {
    console.log('📁 Создаю папку public...');
    fs.mkdirSync(PUBLIC_PATH, { recursive: true });
}

// ===== Подключаем Supabase =====
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// Отключаем CSP для разработки
app.use((req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Security-Policy');
    res.removeHeader('X-WebKit-CSP');
    next();
});

// ===== СТАТИЧЕСКИЕ ФАЙЛЫ =====
app.use(express.static(PUBLIC_PATH));
app.use('/admin', express.static(ADMIN_PATH));

// ===== КРАСИВЫЕ URL (без .html) =====
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, 'dashboard.html'));
});

app.get('/check', (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, 'check.html'));
});

app.get('/download', (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, 'download.html'));
});

// ===== Функция для генерации лицензионного ключа =====
function generateLicenseKey() {
    const key = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 24);
    return key.match(/.{1,4}/g).join('-');
}

// ===== Функция отправки файла в Telegram =====
async function sendFileToTelegram(telegramId, filePath, caption) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Файл не найден: ${filePath}`);
            return false;
        }

        const stats = fs.statSync(filePath);
        console.log(`📤 Отправка файла ${filePath} (${stats.size} байт) пользователю ${telegramId}...`);
        
        const fileStream = fs.createReadStream(filePath);
        const token = process.env.BOT_TOKEN;
        
        const formData = new FormData();
        formData.append('chat_id', telegramId);
        formData.append('document', fileStream);
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');

        const response = await axios.post(
            `https://api.telegram.org/bot${token}/sendDocument`,
            formData,
            {
                headers: formData.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        if (response.data?.ok) {
            console.log(`✅ Файл успешно отправлен пользователю ${telegramId}`);
            return true;
        } else {
            console.error('❌ Ошибка Telegram API:', response.data);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error.response?.data || error.message);
        return false;
    }
}

// ===== Функция для создания платежа NOWPayments =====
async function createNowPaymentsPayment(amountUSD, orderId, description) {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    const url = 'https://api.nowpayments.io/v1/invoice';
    
    const payload = {
        price_amount: amountUSD,
        price_currency: 'usd',
        pay_currency: 'usdttrc20',
        order_id: orderId,
        order_description: description,
        ipn_callback_url: `https://${process.env.RENDER_EXTERNAL_URL || 'localhost:3001'}/api/nowpayments-webhook`,
        success_url: 'https://t.me/cryptalyx_official_bot',
        cancel_url: 'https://t.me/cryptalyx_official_bot',
        is_fixed_rate: true,
        is_fee_paid_by_user: true
    };

    console.log('📤 Отправка запроса в NOWPayments:', payload);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('📥 Ответ от NOWPayments:', responseText);

    if (!response.ok) {
        throw new Error(`NOWPayments error (${response.status}): ${responseText}`);
    }

    return JSON.parse(responseText);
}

// ===== Эндпоинт для проверки здоровья =====
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Cryptalyx backend работает 🚀',
        timestamp: new Date().toISOString()
    });
});

// ===== Эндпоинт для получения цены монеты (прокси) =====
app.get('/api/price/:coin', async (req, res) => {
    const coin = req.params.coin.toUpperCase();
    
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
    
    try {
        // Пробуем Binance
        const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${coin}USDT`);
        if (binanceRes.ok) {
            const data = await binanceRes.json();
            return res.json({ price: parseFloat(data.price), source: 'binance' });
        }
    } catch (e) {}
    
    try {
        // Пробуем Bybit
        const bybitRes = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${coin}USDT`);
        if (bybitRes.ok) {
            const data = await bybitRes.json();
            if (data.result?.list?.[0]?.lastPrice) {
                return res.json({ price: parseFloat(data.result.list[0].lastPrice), source: 'bybit' });
            }
        }
    } catch (e) {}
    
    try {
        // Пробуем KuCoin
        const kucoinRes = await fetch(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${coin}-USDT`);
        if (kucoinRes.ok) {
            const data = await kucoinRes.json();
            if (data.data?.price) {
                return res.json({ price: parseFloat(data.data.price), source: 'kucoin' });
            }
        }
    } catch (e) {}
    
    try {
        // Пробуем CoinGecko
        const geckoId = specialCoins[coin] || coin.toLowerCase();
        const geckoRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`);
        if (geckoRes.ok) {
            const data = await geckoRes.json();
            if (data[geckoId]?.usd) {
                return res.json({ price: data[geckoId].usd, source: 'coingecko' });
            }
        }
    } catch (e) {}
    
    res.json({ price: 0, source: 'none' });
});

// ===== ИМПОРТ CSV =====
const upload = multer({ dest: '/tmp/uploads/' });

app.post('/api/import/csv', upload.single('file'), async (req, res) => {
    try {
        const { exchange } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        console.log('📥 Импорт CSV:', exchange, req.file.path);
        
        // Читаем файл как текст
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const lines = fileContent.split('\n');
        
        // Удаляем временный файл
        fs.unlinkSync(req.file.path);
        
        const transactions = [];
        const coinAmounts = {}; // для агрегации по монетам
        
        if (exchange === 'bybit') {
            // Заголовки: Currency,Contract,Type,Direction,Quantity,Position,Filled Price,Funding,Fee Paid,Cash Flow,Change,Wallet Balance,Action,OrderId,TradedTime
            
            for (let i = 1; i < lines.length; i++) { // пропускаем заголовок
                const line = lines[i].trim();
                if (!line) continue;
                
                // Разделяем по запятой
                const parts = line.split(',');
                if (parts.length < 10) continue;
                
                const currency = parts[0]; // USDT или монета
                const contract = parts[1]; // например BTCUSDT
                const type = parts[2]; // TRADE, LIQUIDATION и т.д.
                const direction = parts[3]; // Buy или Sell
                const quantity = parseFloat(parts[4]); // количество
                const price = parseFloat(parts[6]); // цена
                
                // Нас интересуют только спот-покупки (где Currency - это монета, а не USDT)
                if (currency !== 'USDT' && type === 'TRADE' && direction === 'Buy' && quantity > 0 && price > 0) {
                    
                    // Проверяем что это не фьючерсы (если есть Contract, то берем из него монету)
                    let coin = currency;
                    if (contract && contract.includes('USDT')) {
                        coin = contract.replace('USDT', '');
                    }
                    
                    // Агрегируем по монетам
                    if (!coinAmounts[coin]) {
                        coinAmounts[coin] = {
                            totalAmount: 0,
                            totalValue: 0,
                            transactions: []
                        };
                    }
                    
                    coinAmounts[coin].totalAmount += quantity;
                    coinAmounts[coin].totalValue += quantity * price;
                    coinAmounts[coin].transactions.push({
                        amount: quantity,
                        price: price,
                        date: parts[14] || new Date().toISOString()
                    });
                    
                    console.log(`✅ Найдена покупка: ${coin} ${quantity} по $${price}`);
                }
            }
            
            // Преобразуем агрегированные данные в транзакции
            for (const [coin, data] of Object.entries(coinAmounts)) {
                const avgPrice = data.totalValue / data.totalAmount;
                transactions.push({
                    coin: coin,
                    amount: data.totalAmount,
                    price: avgPrice,
                    transactions: data.transactions.length,
                    type: 'buy'
                });
            }
        }
        
        // Парсим Binance CSV
        if (exchange === 'binance') {
            // Аналогичная логика для Binance
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(',');
                // ... логика для Binance
            }
        }
        
        console.log(`📊 Найдено уникальных монет: ${transactions.length}`);
        console.log('📦 Итоговые позиции:', transactions);
        
        res.json({ 
            success: true, 
            transactions: transactions,
            count: transactions.length,
            coins: Object.keys(coinAmounts)
        });
        
    } catch (error) {
        console.error('❌ CSV import error:', error);
        res.status(500).json({ error: 'Ошибка импорта CSV: ' + error.message });
    }
});

// ===== Эндпоинт для создания заказа (ЮKassa) =====
app.post('/api/create-order', async (req, res) => {
    try {
        const {
            telegramId,
            telegramUsername,
            email,
            username,
            plan,
            period,
            payment
        } = req.body;

        if (payment === 'usdt') {
            return res.status(400).json({
                success: false,
                message: 'Для оплаты USDT используйте кнопку "Криптовалюта"'
            });
        }

        console.log('📦 Получен запрос на создание заказа (ЮKassa):', req.body);

        let { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('telegram_id', telegramId.toString())
            .single();

        if (!user) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    telegram_id: telegramId.toString(),
                    email: email,
                    login: username || telegramUsername,
                    status: 'active'
                }])
                .select()
                .single();

            if (createError) {
                console.error('❌ Ошибка создания пользователя:', createError);
                throw createError;
            }
            user = newUser;
        }

        let amount = 0;
        let planType = '';
        let periodType = '';

        if (plan === 'Базовая' || plan === 'basic') {
            planType = 'basic';
            amount = period === '1 месяц' ? 990 : 9990;
        } else {
            planType = 'premium';
            amount = period === '1 месяц' ? 1990 : 19990;
        }

        periodType = period === '1 месяц' ? 'month' : 'year';
        const description = `Cryptalyx: ${plan} на ${period}`;

        const idempotenceKey = crypto.randomUUID();
        const auth = Buffer.from(
            process.env.YOOKASSA_SHOP_ID + ':' + process.env.YOOKASSA_SECRET_KEY
        ).toString('base64');

        console.log('💰 Отправка запроса в ЮKassa...');

        const paymentResponse = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotence-Key': idempotenceKey,
                'Authorization': 'Basic ' + auth
            },
            body: JSON.stringify({
                amount: {
                    value: amount.toFixed(2),
                    currency: 'RUB'
                },
                payment_method_data: {
                    type: 'bank_card'
                },
                confirmation: {
                    type: 'redirect',
                    return_url: 'https://t.me/cryptalyx_official_bot'
                },
                capture: true,
                description: description,
                metadata: {
                    telegramId: telegramId.toString(),
                    plan: planType,
                    period: periodType
                }
            })
        });

        console.log('📊 Статус ответа ЮKassa:', paymentResponse.status);

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error('❌ Ошибка ЮKassa:', paymentData);
            throw new Error(paymentData.description || 'Ошибка создания платежа');
        }

        const { error: subError } = await supabase
            .from('subscriptions')
            .insert([{
                user_id: user.id,
                license_key: null,
                plan_type: planType,
                period: periodType,
                status: 'pending',
                price: amount,
                payment_method: 'card',
                payment_id: paymentData.id
            }]);

        if (subError) {
            console.error('❌ Ошибка сохранения подписки:', subError);
            throw subError;
        }

        if (!paymentData.confirmation || !paymentData.confirmation.confirmation_url) {
            console.error('❌ ОШИБКА: нет confirmation_url в ответе ЮKassa!');
            throw new Error('Не удалось получить ссылку на оплату');
        }

        console.log('✅ Ссылка на оплату получена:', paymentData.confirmation.confirmation_url);

        res.json({
            success: true,
            paymentUrl: paymentData.confirmation.confirmation_url,
            paymentMethod: 'card'
        });

    } catch (error) {
        console.error('❌ Ошибка создания заказа:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка при создании заказа'
        });
    }
});

// ===== Эндпоинт для создания крипто-заказа (NOWPayments) =====
app.post('/api/create-crypto-order', async (req, res) => {
    try {
        const {
            telegramId,
            telegramUsername,
            email,
            username,
            plan,
            period
        } = req.body;

        console.log('📦 Получен запрос на крипто-заказ (USDT):', req.body);

        let { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('telegram_id', telegramId.toString())
            .single();

        if (!user) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    telegram_id: telegramId.toString(),
                    email: email,
                    login: username || telegramUsername,
                    status: 'active'
                }])
                .select()
                .single();

            if (createError) {
                console.error('❌ Ошибка создания пользователя:', createError);
                throw createError;
            }
            user = newUser;
        }

        let amountUSD = 0;
        let planType = '';
        let periodType = '';

        if (plan === 'Базовая' || plan === 'basic') {
            planType = 'basic';
            amountUSD = period === '1 месяц' ? 10 : 100;
        } else {
            planType = 'premium';
            amountUSD = period === '1 месяц' ? 20 : 200;
        }

        periodType = period === '1 месяц' ? 'month' : 'year';
        const orderId = `${user.id}_${Date.now()}`;
        const description = `Cryptalyx: ${plan} на ${period}`;

        console.log('💰 Создание платежа в NOWPayments...');
        
        const payment = await createNowPaymentsPayment(amountUSD, orderId, description);
        console.log('✅ Платеж создан:', payment);

        const { error: subError } = await supabase
            .from('subscriptions')
            .insert([{
                user_id: user.id,
                license_key: null,
                plan_type: planType,
                period: periodType,
                status: 'pending',
                price: amountUSD,
                payment_method: 'usdt_trc20',
                payment_id: payment.id.toString()
            }]);

        if (subError) {
            console.error('❌ Ошибка сохранения подписки:', subError);
            throw subError;
        }

        res.json({
            success: true,
            paymentUrl: payment.invoice_url,
            paymentMethod: 'usdt'
        });

    } catch (error) {
        console.error('❌ Ошибка создания крипто-заказа:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка при создании заказа'
        });
    }
});

// ===== Эндпоинт для вебхуков от ЮKassa =====
app.post('/api/payment-webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log('🔔 Получен вебхук от ЮKassa:', JSON.stringify(event, null, 2));

        if (event.event === 'payment.succeeded') {
            const payment = event.object;
            const paymentId = payment.id;
            const metadata = payment.metadata;

            if (!metadata || !metadata.telegramId) {
                console.error('❌ Нет metadata в платеже');
                return res.sendStatus(200);
            }

            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, email, login, telegram_id')
                .eq('telegram_id', metadata.telegramId)
                .single();

            if (userError || !user) {
                console.error('❌ Пользователь не найден:', metadata.telegramId);
                return res.sendStatus(200);
            }

            const licenseKey = generateLicenseKey();

            const now = new Date();
            const expireDate = new Date(now);
            
            if (metadata.period === 'month') {
                expireDate.setMonth(expireDate.getMonth() + 1);
            } else {
                expireDate.setFullYear(expireDate.getFullYear() + 1);
            }

            // Обновляем подписку
            await supabase
                .from('subscriptions')
                .update({
                    license_key: licenseKey,
                    status: 'active',
                    start_date: now.toISOString(),
                    expire_date: expireDate.toISOString()
                })
                .eq('payment_id', paymentId);

            // Обновляем пользователя
            await supabase
                .from('users')
                .update({ 
                    license_key: licenseKey,
                    plan: metadata.plan,
                    expire_date: expireDate.toISOString()
                })
                .eq('id', user.id);

            console.log(`✅ Подписка активирована для ${metadata.telegramId}`);
            console.log(`🔑 Ключ: ${licenseKey}`);

            // Отправляем сообщение с ключом
            const message = 
                `🎉 *Спасибо за покупку Cryptalyx!*\n\n` +
                `🔑 *Ваш лицензионный ключ:* \`${licenseKey}\`\n` +
                `📊 *Тариф:* ${metadata.plan === 'premium' ? 'Премиум' : 'Базовая'}\n` +
                `⏱ *Срок:* ${metadata.period === 'year' ? '1 год' : '1 месяц'}\n\n` +
                `🌐 *Войти в кабинет:* https://${process.env.RENDER_EXTERNAL_URL || 'localhost:3001'}/login.html\n` +
                `📊 *Управление портфелем:* https://${process.env.RENDER_EXTERNAL_URL || 'localhost:3001'}/dashboard.html`;

            await sendMessageToTelegram(user.telegram_id, message);
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('❌ Ошибка обработки вебхука ЮKassa:', error);
        res.sendStatus(500);
    }
});

// ===== Вебхук для уведомлений от NOWPayments =====
app.post('/api/nowpayments-webhook', async (req, res) => {
    try {
        const payment = req.body;
        console.log('🔔 Получен вебхук от NOWPayments:', JSON.stringify(payment, null, 2));
        
        if (payment.payment_status === 'finished' || payment.payment_status === 'confirmed') {
            const paymentId = payment.payment_id?.toString() || payment.id?.toString();
            
            if (!paymentId) {
                console.error('❌ Нет ID платежа');
                return res.sendStatus(200);
            }

            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('user_id, plan_type, period')
                .eq('payment_id', paymentId)
                .single();

            if (!subscription) {
                console.error('❌ Подписка не найдена:', paymentId);
                return res.sendStatus(200);
            }

            const licenseKey = generateLicenseKey();

            const now = new Date();
            const expireDate = new Date(now);
            
            if (subscription.period === 'month') {
                expireDate.setMonth(expireDate.getMonth() + 1);
            } else {
                expireDate.setFullYear(expireDate.getFullYear() + 1);
            }

            // Обновляем подписку
            await supabase
                .from('subscriptions')
                .update({
                    license_key: licenseKey,
                    status: 'active',
                    start_date: now.toISOString(),
                    expire_date: expireDate.toISOString()
                })
                .eq('payment_id', paymentId);

            // Обновляем пользователя
            await supabase
                .from('users')
                .update({ 
                    license_key: licenseKey,
                    plan: subscription.plan_type,
                    expire_date: expireDate.toISOString()
                })
                .eq('id', subscription.user_id);

            const { data: user } = await supabase
                .from('users')
                .select('telegram_id')
                .eq('id', subscription.user_id)
                .single();

            console.log(`✅ Крипто-подписка активирована для пользователя ${subscription.user_id}`);
            console.log(`🔑 Ключ: ${licenseKey}`);

            if (user) {
                const message = 
                    `🎉 *Спасибо за покупку Cryptalyx (USDT)!*\n\n` +
                    `🔑 *Ваш лицензионный ключ:* \`${licenseKey}\`\n` +
                    `📊 *Тариф:* ${subscription.plan_type === 'premium' ? 'Премиум' : 'Базовый'}\n` +
                    `⏱ *Срок:* ${subscription.period === 'year' ? '1 год' : '1 месяц'}\n\n` +
                    `🌐 *Войти в кабинет:* https://${process.env.RENDER_EXTERNAL_URL || 'localhost:3001'}/login.html\n` +
                    `📊 *Управление портфелем:* https://${process.env.RENDER_EXTERNAL_URL || 'localhost:3001'}/dashboard.html`;

                await sendMessageToTelegram(user.telegram_id, message);
            }
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('❌ Ошибка обработки вебхука NOWPayments:', error);
        res.sendStatus(500);
    }
});

// ===== Эндпоинт для получения информации о пользователе =====
app.get('/api/user-info', async (req, res) => {
    try {
        const { telegramId } = req.query;
        
        if (!telegramId) {
            return res.status(400).json({ error: 'telegramId обязателен' });
        }
        
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, login, license_key, plan, expire_date')
            .eq('telegram_id', telegramId)
            .single();
        
        if (userError || !user) {
            return res.json({ subscription: null });
        }
        
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('license_key, plan_type, period, expire_date, status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (subError || !subscription) {
            return res.json({ 
                user: {
                    email: user.email,
                    login: user.login
                },
                subscription: null 
            });
        }
        
        res.json({
            user: {
                email: user.email,
                login: user.login
            },
            subscription: {
                license_key: subscription.license_key,
                plan_type: subscription.plan_type,
                period: subscription.period,
                expire_date: subscription.expire_date,
                status: subscription.status
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения данных пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// ===== АДМИНКА =====
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cryptalyx2026';
const JWT_SECRET = process.env.JWT_SECRET || 'cryptalyx_secret';

// Вход в админку
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    console.log('🔑 Попытка входа в админку');
    
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Неверный пароль' });
    }
});

// Middleware для проверки токена
function verifyAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Нет токена' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Нет токена' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('❌ Ошибка верификации токена:', err.message);
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.admin = decoded;
        next();
    });
}

// Статистика для админки
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
    console.log('📊 Запрос статистики от админа');
    
    try {
        const { count: totalUsers, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        if (usersError) {
            console.error('❌ Ошибка users:', usersError);
            return res.status(500).json({ error: 'Ошибка получения пользователей' });
        }

        const { count: activeSubs, error: subsError } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        
        if (subsError) {
            console.error('❌ Ошибка subscriptions:', subsError);
            return res.status(500).json({ error: 'Ошибка получения подписок' });
        }

        const { count: premiumCount, error: premiumError } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('plan_type', 'premium')
            .eq('status', 'active');
        
        if (premiumError) {
            console.error('❌ Ошибка premium:', premiumError);
            return res.status(500).json({ error: 'Ошибка получения premium' });
        }

        const { count: basicCount, error: basicError } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('plan_type', 'basic')
            .eq('status', 'active');
        
        if (basicError) {
            console.error('❌ Ошибка basic:', basicError);
            return res.status(500).json({ error: 'Ошибка получения basic' });
        }

        res.json({
            totalUsers: totalUsers || 0,
            activeSubscriptions: activeSubs || 0,
            premiumCount: premiumCount || 0,
            basicCount: basicCount || 0
        });
        
    } catch (error) {
        console.error('❌ Критическая ошибка в /stats:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Список пользователей для админки
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    console.log('👥 Запрос списка пользователей от админа');
    
    try {
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (usersError) {
            console.error('❌ Ошибка получения users:', usersError);
            return res.status(500).json({ error: 'Ошибка получения пользователей' });
        }
        
        if (!users || users.length === 0) {
            return res.json([]);
        }
        
        const result = [];
        
        for (const user of users) {
            const { data: subscriptions } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);
            
            const subscription = subscriptions?.[0];
            
            result.push({
                id: user.id,
                telegram_id: user.telegram_id,
                telegram_username: user.login || user.telegram_username,
                email: user.email,
                login: user.login,
                license_key: subscription?.license_key || user.license_key,
                plan: subscription?.plan_type || user.plan,
                period: subscription?.period || null,
                expire_date: subscription?.expire_date || user.expire_date,
                created_at: user.created_at,
                status: subscription?.status || user.status || 'inactive'
            });
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Ошибка в /users:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Продлить подписку
app.post('/api/admin/extend', verifyAdmin, async (req, res) => {
    try {
        const { userId, months } = req.body;
        
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('expire_date')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        const now = new Date();
        let newDate;
        
        if (subscription?.expire_date && new Date(subscription.expire_date) > now) {
            newDate = new Date(subscription.expire_date);
            newDate.setMonth(newDate.getMonth() + months);
        } else {
            newDate = new Date();
            newDate.setMonth(newDate.getMonth() + months);
        }
        
        if (subscription) {
            await supabase
                .from('subscriptions')
                .update({ expire_date: newDate.toISOString() })
                .eq('user_id', userId)
                .eq('status', 'active');
        }
        
        await supabase
            .from('users')
            .update({ expire_date: newDate.toISOString() })
            .eq('id', userId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка продления:', error);
        res.status(500).json({ error: 'Ошибка продления подписки' });
    }
});

// Удалить пользователя
app.delete('/api/admin/user/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        await supabase.from('subscriptions').delete().eq('user_id', id);
        await supabase.from('users').delete().eq('id', id);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        res.status(500).json({ error: 'Ошибка удаления пользователя' });
    }
});

// ===== Проверка лицензии =====
app.get('/check_license', async (req, res) => {
    const licenseKey = req.query.license_key;
    console.log('🔑 Проверка ключа:', licenseKey);
    
    try {
        const { data: sub, error } = await supabase
            .from('subscriptions')
            .select('license_key, plan_type, status, expire_date')
            .eq('license_key', licenseKey)
            .single();
        
        if (error || !sub) {
            return res.json({ 
                status: 'not_found',
                message: 'Ключ не найден'
            });
        }
        
        if (sub.status !== 'active') {
            return res.json({
                status: sub.status,
                plan: sub.plan_type,
                expire_date: sub.expire_date
            });
        }
        
        const now = new Date();
        const expire = new Date(sub.expire_date);
        
        if (expire < now) {
            return res.json({
                status: 'expired',
                plan: sub.plan_type,
                expire_date: sub.expire_date
            });
        }
        
        res.json({
            status: 'active',
            plan: sub.plan_type,
            expire_date: sub.expire_date
        });
        
    } catch (error) {
        console.error('❌ Ошибка проверки ключа:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== Скачивание файлов с проверкой ключа =====
app.get('/download/:filename', async (req, res) => {
    const filename = req.params.filename;
    const licenseKey = req.query.key;
    
    if (filename === 'instruction.pdf') {
        const filePath = path.join(PUBLIC_PATH, filename);
        if (fs.existsSync(filePath)) {
            return res.download(filePath);
        }
        return res.status(404).send('Файл не найден');
    }
    
    if (!licenseKey) {
        return res.status(403).send('Требуется лицензионный ключ');
    }
    
    try {
        const { data: sub, error } = await supabase
            .from('subscriptions')
            .select('status, expire_date')
            .eq('license_key', licenseKey)
            .single();
        
        if (error || !sub) {
            return res.status(404).send('Ключ не найден');
        }
        
        if (sub.status !== 'active') {
            return res.status(403).send('Ключ не активирован');
        }
        
        const now = new Date();
        const expire = new Date(sub.expire_date);
        
        if (expire < now) {
            return res.status(403).send('Срок действия ключа истек');
        }
        
        const filePath = path.join(PUBLIC_PATH, filename);
        if (fs.existsSync(filePath)) {
            return res.download(filePath);
        }
        res.status(404).send('Файл не найден');
    } catch (error) {
        console.error('Ошибка при скачивании:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

// ===== Запуск сервера =====
app.listen(PORT, () => {
    console.log(`\n🚀 Cryptalyx Server запущен на порту ${PORT}`);
    console.log(`📁 Рабочая папка: ${BASE_PATH}`);
    console.log(`📁 Public папка: ${PUBLIC_PATH}`);
    console.log(`📁 Admin папка: ${ADMIN_PATH}`);
    console.log(`\n📌 Ссылки:`);
    console.log(`   Главная:     http://localhost:${PORT}`);
    console.log(`   Вход:        http://localhost:${PORT}/login`);
    console.log(`   Дашборд:     http://localhost:${PORT}/dashboard`);
    console.log(`   Проверка:    http://localhost:${PORT}/check`);
    console.log(`   Админка:     http://localhost:${PORT}/admin/index.html`);
    console.log(`   API здоровье: http://localhost:${PORT}/api/health\n`);
});