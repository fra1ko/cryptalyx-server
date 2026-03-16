require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const csv = require('csv-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// ===== Подключаем Supabase =====
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

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
        ipn_callback_url: `https://sensitometrically-numinous-kristyn.ngrok-free.dev/api/nowpayments-webhook`,
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
                .select('id, email, login')
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

            const excelCaption = 
                `🎉 *Спасибо за покупку Cryptalyx!*\n\n` +
                `🔑 *Ваш лицензионный ключ:* \`${licenseKey}\`\n` +
                `📊 *Тариф:* ${metadata.plan === 'premium' ? 'Премиум' : 'Базовая'}\n` +
                `⏱ *Срок:* ${metadata.period === 'year' ? '1 год' : '1 месяц'}\n\n` +
                `📎 Файл с разблокированными функциями во вложении.`;

            await sendFileToTelegram(metadata.telegramId, './public/cryptalyx.xlsm', excelCaption);
            await sendFileToTelegram(metadata.telegramId, './public/instruction.pdf', '📘 *Инструкция по работе с Cryptalyx*');
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
                const excelCaption = 
                    `🎉 *Спасибо за покупку Cryptalyx (USDT)!*\n\n` +
                    `🔑 *Ваш лицензионный ключ:* \`${licenseKey}\`\n` +
                    `📊 *Тариф:* ${subscription.plan_type === 'premium' ? 'Премиум' : 'Базовый'}\n` +
                    `⏱ *Срок:* ${subscription.period === 'year' ? '1 год' : '1 месяц'}\n\n` +
                    `📎 Файл с разблокированными функциями во вложении.`;

                await sendFileToTelegram(user.telegram_id, './public/cryptalyx.xlsm', excelCaption);
                await sendFileToTelegram(user.telegram_id, './public/instruction.pdf', '📘 *Инструкция по работе с Cryptalyx*');
            }
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('❌ Ошибка обработки вебхука NOWPayments:', error);
        res.sendStatus(500);
    }
});

// ===== Эндпоинт для получения информации о пользователе (личный кабинет) =====
app.get('/api/user-info', async (req, res) => {
    try {
        const { telegramId } = req.query;
        
        if (!telegramId) {
            return res.status(400).json({ error: 'telegramId обязателен' });
        }
        
        // Ищем пользователя
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, login, license_key, plan, expire_date')
            .eq('telegram_id', telegramId)
            .single();
        
        if (userError || !user) {
            return res.json({ subscription: null });
        }
        
        // Ищем активную подписку
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

// Вход
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

// Статистика
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
    console.log('📊 Запрос статистики от админа');
    
    try {
        console.log('🔍 Запрос к таблице users...');
        const { count: totalUsers, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        if (usersError) {
            console.error('❌ Ошибка users:', usersError);
            return res.status(500).json({ error: 'Ошибка получения пользователей', details: usersError });
        }
        console.log(`✅ users count: ${totalUsers}`);

        console.log('🔍 Запрос к таблице subscriptions (active)...');
        const { count: activeSubs, error: subsError } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        
        if (subsError) {
            console.error('❌ Ошибка subscriptions:', subsError);
            return res.status(500).json({ error: 'Ошибка получения подписок', details: subsError });
        }
        console.log(`✅ active subs count: ${activeSubs}`);

        console.log('🔍 Запрос к таблице subscriptions (premium)...');
        const { count: premiumCount, error: premiumError } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('plan_type', 'premium')
            .eq('status', 'active');
        
        if (premiumError) {
            console.error('❌ Ошибка premium:', premiumError);
            return res.status(500).json({ error: 'Ошибка получения premium', details: premiumError });
        }
        console.log(`✅ premium count: ${premiumCount}`);

        console.log('🔍 Запрос к таблице subscriptions (basic)...');
        const { count: basicCount, error: basicError } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('plan_type', 'basic')
            .eq('status', 'active');
        
        if (basicError) {
            console.error('❌ Ошибка basic:', basicError);
            return res.status(500).json({ error: 'Ошибка получения basic', details: basicError });
        }
        console.log(`✅ basic count: ${basicCount}`);

        const result = {
            totalUsers: totalUsers || 0,
            activeSubscriptions: activeSubs || 0,
            premiumCount: premiumCount || 0,
            basicCount: basicCount || 0
        };
        
        console.log('📦 Отправка результата:', result);
        res.json(result);
        
    } catch (error) {
        console.error('❌ Критическая ошибка в /stats:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера', 
            message: error.message,
            stack: error.stack 
        });
    }
});

// Список пользователей
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    console.log('👥 Запрос списка пользователей от админа');
    
    try {
        console.log('🔍 1. Пытаемся получить пользователей из таблицы users...');
        
        // Получаем всех пользователей
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .order('start_date', { ascending: false });
        
        if (usersError) {
            console.error('❌ Ошибка получения users:', usersError);
            console.error('❌ Детали ошибки:', JSON.stringify(usersError, null, 2));
            return res.status(500).json({ 
                error: 'Ошибка получения пользователей',
                details: usersError
            });
        }
        
        console.log(`✅ Получено ${users?.length || 0} пользователей`);
        
        if (!users || users.length === 0) {
            console.log('📦 Пользователей нет, отправляем пустой массив');
            return res.json([]);
        }
        
        // Для каждого пользователя получим его подписки
        const result = [];
        
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            console.log(`🔍 Обработка пользователя ${i + 1}/${users.length}: ID ${user.id}`);
            
            try {
                // Получаем последнюю подписку пользователя
                const { data: subscriptions, error: subsError } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1);
                
                if (subsError) {
                    console.error(`⚠️ Ошибка получения подписок для user ${user.id}:`, subsError);
                    // Добавляем пользователя без подписки
                    result.push({
                        id: user.id,
                        telegram_id: user.telegram_id,
                        telegram_username: user.login || user.telegram_username,
                        email: user.email,
                        login: user.login,
                        license_key: user.license_key,
                        plan: user.plan,
                        expire_date: user.expire_date,
                        created_at: user.created_at,
                        status: user.status || 'inactive'
                    });
                    continue;
                }
                
                // Берём последнюю подписку (если есть)
                const subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;
                
                if (subscription) {
                    console.log(`✅ Найдена подписка для user ${user.id}:`, subscription.id);
                } else {
                    console.log(`ℹ️ Нет подписок для user ${user.id}`);
                }
                
                result.push({
                    id: user.id,
                    telegram_id: user.telegram_id,
                    telegram_username: user.login || user.telegram_username,
                    email: user.email,
                    login: user.login,
                    license_key: subscription?.license_key || user.license_key,
                    plan: subscription?.plan_type || user.plan,
                    expire_date: subscription?.expire_date || user.expire_date,
                    created_at: user.created_at,
                    status: subscription?.status || user.status || 'inactive'
                });
                
            } catch (subError) {
                console.error(`❌ Критическая ошибка при обработке user ${user.id}:`, subError);
                // Добавляем пользователя с базовыми данными
                result.push({
                    id: user.id,
                    telegram_id: user.telegram_id,
                    telegram_username: user.login || user.telegram_username,
                    email: user.email,
                    login: user.login,
                    license_key: user.license_key,
                    plan: user.plan,
                    expire_date: user.expire_date,
                    created_at: user.created_at,
                    status: user.status || 'error'
                });
            }
        }
        
        console.log(`📦 Отправка ${result.length} пользователей`);
        console.log('📦 Первый пользователь:', JSON.stringify(result[0], null, 2));
        res.json(result);
        
    } catch (error) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА в /users:');
        console.error('❌ Имя ошибки:', error.name);
        console.error('❌ Сообщение:', error.message);
        console.error('❌ Стек:', error.stack);
        
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            message: error.message,
            name: error.name
        });
    }
});

// Продлить подписку
app.post('/api/admin/extend', verifyAdmin, async (req, res) => {
    try {
        const { userId, months } = req.body;
        
        const { data: user } = await supabase
            .from('users')
            .select('expire_date')
            .eq('id', userId)
            .single();
        
        const now = new Date();
        let newDate;
        
        if (user?.expire_date && new Date(user.expire_date) > now) {
            newDate = new Date(user.expire_date);
            newDate.setMonth(newDate.getMonth() + months);
        } else {
            newDate = new Date();
            newDate.setMonth(newDate.getMonth() + months);
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
        
        // Сначала удаляем подписки
        await supabase
            .from('subscriptions')
            .delete()
            .eq('user_id', id);
        
        // Потом пользователя
        await supabase
            .from('users')
            .delete()
            .eq('id', id);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        res.status(500).json({ error: 'Ошибка удаления пользователя' });
    }
});
// ===== Проверка лицензии для Excel =====
app.get('/check_license', async (req, res) => {
    const licenseKey = req.query.license_key;
    console.log('🔑 Проверка ключа:', licenseKey);
    
    try {
        // Ищем подписку по ключу
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

// ===== ИМПОРТ CSV =====
app.post('/api/import/csv', upload.single('file'), async (req, res) => {
    try {
        const results = [];
        const { exchange } = req.body; // 'bybit', 'binance', 'kucoin'
        
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                // Удаляем временный файл
                fs.unlinkSync(req.file.path);
                
                const transactions = [];
                
                // Парсим в зависимости от биржи
                if (exchange === 'bybit') {
                    // Bybit формат
                    results.forEach(row => {
                        if (row.Type === 'SPOT' || row.Type === 'spot') {
                            transactions.push({
                                coin: row.Symbol?.replace('USDT', ''),
                                amount: parseFloat(row.Executed),
                                price: parseFloat(row.Price),
                                date: row.Time,
                                type: row.Side === 'Buy' ? 'buy' : 'sell'
                            });
                        }
                    });
                } else if (exchange === 'binance') {
                    // Binance формат
                    results.forEach(row => {
                        if (row.操作 === '买入' || row.Operation === 'Buy') {
                            transactions.push({
                                coin: row.币种?.replace('USDT', ''),
                                amount: parseFloat(row.数量),
                                price: parseFloat(row.价格),
                                date: row.时间,
                                type: 'buy'
                            });
                        }
                    });
                }
                
                res.json({ 
                    success: true, 
                    transactions: transactions,
                    count: transactions.length 
                });
            });
    } catch (error) {
        console.error('CSV import error:', error);
        res.status(500).json({ error: 'Ошибка импорта CSV' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Cryptalyx Server запущен на порту ${PORT}`);
    console.log(`📡 http://localhost:${PORT}/api/health`);
    console.log(`🔗 Webhook URL ЮKassa: https://sensitometrically-numinous-kristyn.ngrok-free.dev/api/payment-webhook`);
    console.log(`🔗 Webhook URL NOWPayments: https://sensitometrically-numinous-kristyn.ngrok-free.dev/api/nowpayments-webhook`);
    console.log(`👑 Админ-панель: http://localhost:${PORT}/admin/index.html`);
});