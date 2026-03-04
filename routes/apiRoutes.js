const express = require('express');
const db = require('../config/db'); // PENTING: Harus diimpor untuk query langsung di sini
const { getSensorData, addSensorData } = require('../controllers/sensorController');

const router = express.Router();

// Endpoint Utama
router.get('/sensors', getSensorData);
router.post('/sensors', addSensorData);

// Fitur No 3: Export CSV
router.get('/export', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tb_sensor ORDER BY created_at DESC');
        let csv = 'ID,pH,Kekeruhan,TDS,Status,Tegangan,Waktu\n';
        rows.forEach(row => {
            csv += `${row.id},${row.ph},${row.kekeruhan},${row.tds},${row.status},${row.tegangan},${row.created_at}\n`;
        });
        res.header('Content-Type', 'text/csv');
        res.attachment('data_kualitas_air.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).send("Gagal ekspor data");
    }
});

// Fitur No 5: Konfigurasi & Kalibrasi
router.post('/config', async (req, res) => {
    const { offset_ph, offset_tds, offset_kekeruhan } = req.body;
    try {
        await db.query('UPDATE tb_config SET offset_ph=?, offset_tds=?, offset_kekeruhan=? WHERE id=1', 
                      [offset_ph, offset_tds, offset_kekeruhan]);
        res.json({ success: true, message: 'Kalibrasi berhasil disimpan' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/config', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tb_config WHERE id=1');
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

router.get('/logs', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM tb_logs ORDER BY created_at DESC LIMIT 50');
    res.json({ success: true, data: rows });
});

module.exports = router;