const express = require('express');
const db      = require('../config/db');
const { getSensorData, addSensorData } = require('../controllers/sensorController');
const { apiKeyMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Sensor Data ────────────────────────────────────────────────
// GET: Frontend mengambil data (tanpa API key — cukup koneksi jaringan lokal)
router.get('/sensors', getSensorData);

// POST: ESP32 mengirim data (wajib API key)
router.post('/sensors', apiKeyMiddleware, addSensorData);

// ── Logs ───────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100'), 1000);
    const [rows] = await db.query(
      'SELECT * FROM tb_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('[GET /logs]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Config / Kalibrasi ─────────────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tb_config WHERE id = 1 LIMIT 1');
    if (rows.length === 0) {
      // Kembalikan default jika belum ada data
      return res.json({ offset_ph: 0, offset_tds: 0, offset_kekeruhan: 0 });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('[GET /config]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/config', async (req, res) => {
  const { offset_ph, offset_tds, offset_kekeruhan } = req.body;

  // Validasi
  if ([offset_ph, offset_tds, offset_kekeruhan].some(v => isNaN(parseFloat(v)))) {
    return res.status(400).json({ success: false, message: 'Semua offset harus berupa angka.' });
  }

  // Batasi nilai offset yang wajar
  const clamp = (v, min, max) => Math.min(Math.max(parseFloat(v), min), max);
  const safeOffsets = {
    offset_ph        : clamp(offset_ph,         -2,   2),
    offset_tds       : clamp(offset_tds,        -100, 100),
    offset_kekeruhan : clamp(offset_kekeruhan,  -10,  10),
  };

  try {
    // Upsert: update jika ada, insert jika belum
    await db.query(
      `INSERT INTO tb_config (id, offset_ph, offset_tds, offset_kekeruhan) VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE offset_ph=VALUES(offset_ph), offset_tds=VALUES(offset_tds), offset_kekeruhan=VALUES(offset_kekeruhan)`,
      [safeOffsets.offset_ph, safeOffsets.offset_tds, safeOffsets.offset_kekeruhan]
    );
    res.json({ success: true, message: 'Kalibrasi berhasil disimpan.', data: safeOffsets });
  } catch (error) {
    console.error('[POST /config]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Export CSV ─────────────────────────────────────────────────
router.get('/export', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = 'SELECT * FROM tb_sensor ORDER BY created_at DESC';
    const params = [];

    if (from && to) {
      query = 'SELECT * FROM tb_sensor WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC';
      params.push(from, to);
    }

    const [rows] = await db.query(query, params);

    let csv = 'ID,pH,Kekeruhan (NTU),TDS (ppm),Status,Tegangan (V),Waktu\n';
    rows.forEach(r => {
      csv += `${r.id},${r.ph},${r.kekeruhan},${r.tds},"${r.status}",${r.tegangan},"${r.created_at}"\n`;
    });

    const filename = `data_kualitas_air_${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM untuk Excel
  } catch (error) {
    console.error('[GET /export]', error.message);
    res.status(500).json({ success: false, message: 'Gagal ekspor data.' });
  }
});

// ── Statistik ringkas ──────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT
        COUNT(*)                          AS total,
        ROUND(AVG(ph), 3)                 AS avg_ph,
        ROUND(MIN(ph), 3)                 AS min_ph,
        ROUND(MAX(ph), 3)                 AS max_ph,
        ROUND(AVG(kekeruhan), 2)          AS avg_turbidity,
        ROUND(AVG(tds), 1)                AS avg_tds,
        SUM(status = 'Layak')             AS total_layak,
        SUM(status = 'Tidak Layak')       AS total_tidak_layak,
        MIN(created_at)                   AS oldest,
        MAX(created_at)                   AS newest
      FROM tb_sensor
    `);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('[GET /stats]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
