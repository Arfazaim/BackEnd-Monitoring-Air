const db    = require('../config/db');
const axios = require('axios');

// ── Konfigurasi ML Service ────────────────────────────────────
const ML_API = process.env.ML_API_URL || 'http://localhost:8000';

// ── Panggil Python ML Service ─────────────────────────────────
// Mengembalikan null jika ML service offline (graceful fallback)
const callMLService = async (ph, kekeruhan, tds) => {
  try {
    const { data } = await axios.post(`${ML_API}/predict`, {
      ph, kekeruhan, tds,
    }, { timeout: 3000 }); // Timeout 3 detik agar tidak memperlambat ESP32

    return {
      ml_score      : data.best.score,
      ml_confidence : data.best.score >= 75 || data.best.score <= 25 ? 'Tinggi'
                    : data.best.score >= 60 || data.best.score <= 40 ? 'Sedang' : 'Rendah',
      ml_prediction : data.best.prediction,
      ml_detail     : {
        rf: data.rf,
        dt: data.dt,
        nb: data.nb,
        best_model: data.best_model,
        confidence: data.confidence,
      },
    };
  } catch {
    // ML service tidak aktif — tidak blokir alur utama
    return null;
  }
};

// ── Thresholds (bisa override via env) ───────────────────────
const THRESHOLDS = {
  ph_min         : parseFloat(process.env.PH_MIN          || '6.5'),
  ph_max         : parseFloat(process.env.PH_MAX          || '8.5'),
  turbidity_max  : parseFloat(process.env.TURBIDITY_MAX   || '25'),
  tds_max        : parseFloat(process.env.TDS_MAX         || '500'),
  battery_min    : parseFloat(process.env.BATTERY_MIN     || '3.0'),
};

// ── Alert cooldown (hindari spam Telegram) ────────────────────
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 menit

// ── Manual Override Solenoid ──────────────────────────────────
// null  = mode otomatis (berdasarkan kualitas air)
// true  = paksa BUKA keran (untuk testing)
// false = paksa TUTUP keran
let manualSolenoidOverride = null;

const setManualOverride = (value) => { manualSolenoidOverride = value; };
const getManualOverride = () => manualSolenoidOverride;

// ── Kirim notifikasi Telegram ─────────────────────────────────
const sendTelegramAlert = async (message) => {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
    console.log('[Telegram] Cooldown aktif, notifikasi dilewati.');
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id   : chatId,
      text      : message,
      parse_mode: 'HTML',
    });
    lastAlertTime = now;
    console.log('[Telegram] Notifikasi terkirim.');
  } catch (e) {
    console.error('[Telegram] Gagal kirim notifikasi:', e.message);
  }
};

// ── Ambil konfigurasi kalibrasi dari DB ───────────────────────
const getCalibrationOffsets = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM tb_config WHERE id = 1 LIMIT 1');
    if (rows.length > 0) return rows[0];
  } catch {
    // Jika tabel belum ada, pakai default
  }
  return { offset_ph: 0, offset_tds: 0, offset_kekeruhan: 0 };
};

// ── GET /api/sensors ──────────────────────────────────────────
// Mengambil data sensor (untuk React dashboard)
const getSensorData = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100'), 500);
    const [rows] = await db.query(
      'SELECT * FROM tb_sensor ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('[getSensorData]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/sensors ─────────────────────────────────────────
// Menerima data dari ESP32
const addSensorData = async (req, res) => {
  // Validasi input
  const { ph, kekeruhan, tds, tegangan } = req.body;

  if ([ph, kekeruhan, tds, tegangan].some(v => v === undefined || v === null || isNaN(Number(v)))) {
    return res.status(400).json({
      success: false,
      message: 'Data tidak lengkap. Kirim: ph, kekeruhan, tds, tegangan',
    });
  }

  const phVal         = parseFloat(ph);
  const kekeruhanVal  = parseFloat(kekeruhan);
  const tdsVal        = parseFloat(tds);
  const teganganVal   = parseFloat(tegangan);

  // Validasi range wajar (sensor error check)
  if (phVal < 0 || phVal > 14)          return res.status(400).json({ success: false, message: 'Nilai pH tidak valid (0-14)' });
  if (kekeruhanVal < 0 || kekeruhanVal > 10000) return res.status(400).json({ success: false, message: 'Nilai kekeruhan tidak valid' });

  // Terapkan kalibrasi offset (parseFloat memastikan nilai offset dari DB tidak string)
  const cal = await getCalibrationOffsets();
  const phCalibrated         = parseFloat((phVal        + parseFloat(cal.offset_ph         || 0)).toFixed(3));
  const kekeruhanCalibrated  = parseFloat((kekeruhanVal + parseFloat(cal.offset_kekeruhan  || 0)).toFixed(3));
  const tdsCalibrated        = parseFloat((tdsVal       + parseFloat(cal.offset_tds        || 0)).toFixed(3));

  // Logika kelayakan
  const isLayak = (
    phCalibrated    >= THRESHOLDS.ph_min &&
    phCalibrated    <= THRESHOLDS.ph_max &&
    kekeruhanCalibrated <= THRESHOLDS.turbidity_max &&
    tdsCalibrated   <= THRESHOLDS.tds_max
  );
  const status = isLayak ? 'Layak' : 'Tidak Layak';

  // Logika aktuator — Manual override mengalahkan logika otomatis
  // null = otomatis, true = paksa buka, false = paksa tutup
  const solenoidOn = manualSolenoidOverride !== null ? manualSolenoidOverride : !isLayak;
  const mode = manualSolenoidOverride !== null ? 'manual' : 'auto';

  try {
    // ── Panggil ML Service (paralel, tidak blokir jika offline) ──
    const mlResult = await callMLService(phCalibrated, kekeruhanCalibrated, tdsCalibrated);

    // ── 1. Simpan data sensor + hasil ML ─────────────────────────
    if (mlResult) {
      await db.query(
        `INSERT INTO tb_sensor
         (ph, kekeruhan, tds, status, tegangan, ml_score, ml_confidence, ml_prediction)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [phCalibrated, kekeruhanCalibrated, tdsCalibrated, status, teganganVal,
         mlResult.ml_score, mlResult.ml_confidence, mlResult.ml_prediction]
      );
    } else {
      await db.query(
        'INSERT INTO tb_sensor (ph, kekeruhan, tds, status, tegangan) VALUES (?, ?, ?, ?, ?)',
        [phCalibrated, kekeruhanCalibrated, tdsCalibrated, status, teganganVal]
      );
    }

    // 3. Kirim notifikasi Telegram jika tidak layak
    if (!isLayak) {
      const reasons = [];
      if (phCalibrated < THRESHOLDS.ph_min || phCalibrated > THRESHOLDS.ph_max)
        reasons.push(`pH: <b>${phCalibrated}</b> (normal: ${THRESHOLDS.ph_min}–${THRESHOLDS.ph_max})`);
      if (kekeruhanCalibrated > THRESHOLDS.turbidity_max)
        reasons.push(`Kekeruhan: <b>${kekeruhanCalibrated.toFixed(1)} NTU</b> (maks: ${THRESHOLDS.turbidity_max})`);
      if (tdsCalibrated > THRESHOLDS.tds_max)
        reasons.push(`TDS: <b>${tdsCalibrated.toFixed(0)} ppm</b> (maks: ${THRESHOLDS.tds_max})`);

      await sendTelegramAlert(
        `⚠️ <b>PERINGATAN — Kualitas Air Buruk!</b>\n\n` +
        reasons.join('\n') +
        `\n\nWaktu: ${new Date().toLocaleString('id-ID')}\n` +
        `Status: <b>${status}</b> | Tegangan AC: ${teganganVal}V\n` +
        `Solenoid Valve: <b>${solenoidOn ? 'DIBUKA' : 'TERTUTUP'}</b>`
      );
    }

    // ── 3. Balas ke ESP32 + sertakan prediksi ML ─────────────────
    res.status(201).json({
      success   : true,
      status_air: status,
      calibrated: { ph: phCalibrated, kekeruhan: kekeruhanCalibrated, tds: tdsCalibrated },
      commands  : {
        solenoid: solenoidOn,
        mode,
      },
      // ML prediction (null jika ML service offline)
      ml: mlResult ? {
        score      : mlResult.ml_score,
        confidence : mlResult.ml_confidence,
        prediction : mlResult.ml_prediction,
        detail     : mlResult.ml_detail,
      } : null,
    });
  } catch (error) {
    console.error('[addSensorData]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/latest ──────────────────────────────────────────
const getLatestSensorData = async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT * FROM tb_sensor ORDER BY created_at DESC LIMIT 1'
    );
    if (!row) {
      return res.status(404).json({ success: false, message: 'Belum ada data sensor.' });
    }
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('[getLatestSensorData]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSensorData, addSensorData, getLatestSensorData, getManualOverride, setManualOverride };
