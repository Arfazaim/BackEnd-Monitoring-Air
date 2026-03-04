const db = require('../config/db');
const axios = require('axios');

// Fungsi Kirim Notifikasi Telegram
const sendAlert = async (message) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return; // Lewati jika env belum diisi

    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;
    try { 
        await axios.get(url); 
    } catch (e) { 
        console.error("Gagal kirim Telegram:", e.message); 
    }
};

// Mengambil semua data sensor (Untuk React.js)
const getSensorData = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tb_sensor ORDER BY created_at DESC LIMIT 100');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Menerima data baru dari ESP32
const addSensorData = async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { ph, kekeruhan, tds, tegangan } = req.body;
    
    // Logika Kelayakan
    let status = (ph < 6.5 || ph > 8.5 || kekeruhan > 25 || tds > 500) ? 'Tidak Layak' : 'Layak';

    try {
        // 1. Simpan Data Sensor
        await db.query('INSERT INTO tb_sensor (ph, kekeruhan, tds, status, tegangan) VALUES (?, ?, ?, ?, ?)', 
                      [ph, kekeruhan, tds, status, tegangan]);

        // 2. Logika Dosing Pump PAC & Log Aktuator
        let command_pump_pac = false;
        if (kekeruhan > 25) {
            command_pump_pac = true;
            await db.query('INSERT INTO tb_logs (nama_aktuator, obat_digunakan, keterangan) VALUES (?, ?, ?)', 
                          ['Dosing Pump 1', 'PAC (Poly Aluminium Chloride)', 'Kekeruhan tinggi terdeteksi']);
        }

        // 3. Notifikasi jika Kritis
        if (status === 'Tidak Layak') {
            await sendAlert(`⚠️ PERINGATAN: Kualitas air buruk!\npH: ${ph}\nKekeruhan: ${kekeruhan}\nTDS: ${tds}\nStatus: ${status}`);
        }

        // 4. Kirim balik instruksi ke ESP32
        res.status(201).json({ 
            success: true, 
            status_air: status,
            commands: {
                pump_pac: command_pump_pac,
                buzzer: status === 'Tidak Layak'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Ekspor semua fungsi
module.exports = { addSensorData, getSensorData };