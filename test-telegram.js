require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function testAxios() {
    const token = process.env.BOT_TOKEN;
    const chatId = '5284456024';
    
    const filePath = './public/cryptalyx.xlsm';
    const fileStream = fs.createReadStream(filePath);
    
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', fileStream);
    formData.append('caption', '🧪 Тест через axios');
    
    try {
        const response = await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, formData, {
            headers: formData.getHeaders()
        });
        console.log('✅ Успех:', response.data);
    } catch (error) {
        console.log('❌ Ошибка:', error.response?.data || error.message);
    }
}

testAxios();