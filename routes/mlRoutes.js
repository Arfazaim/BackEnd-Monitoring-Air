const express = require('express');
const axios   = require('axios');

const router = express.Router();

const ML_API = process.env.ML_API_URL || 'http://localhost:8000';

// ── Helper: panggil ML service dengan timeout ──────────────────
const mlFetch = (path) =>
  axios.get(`${ML_API}${path}`, { timeout: 5000 });

// ── GET /api/ml/status ─────────────────────────────────────────
// Cek apakah ML service online dan model sudah ditraining
router.get('/status', async (_req, res) => {
  try {
    const { data } = await mlFetch('/');
    res.json({
      success    : true,
      online     : true,
      best_model : data.best_model,
      trained_at : data.trained_at,
      time       : data.time,
    });
  } catch {
    res.json({
      success: true,
      online : false,
      message: 'ML service tidak berjalan. Jalankan start.bat di folder ML_Air.',
    });
  }
});

// ── GET /api/ml/accuracy ───────────────────────────────────────
// Akurasi semua model dari metadata training
router.get('/accuracy', async (_req, res) => {
  try {
    const { data } = await mlFetch('/model/info');
    const meta     = data.data;

    // Format ringkas untuk frontend
    const models = Object.values(meta.models || {}).map(m => ({
      key       : m.key,
      name      : m.name,
      accuracy  : m.accuracy,
      precision : m.precision,
      recall    : m.recall,
      f1_score  : m.f1_score,
      cv_mean   : m.cv_mean,
      cv_std    : m.cv_std,
      is_best   : m.key === meta.best_model,
    }));

    res.json({
      success     : true,
      best_model  : meta.best_model_name,
      total_data  : meta.total_data,
      trained_at  : meta.trained_at,
      models,
    });
  } catch (e) {
    res.status(503).json({
      success: false,
      message: 'ML service tidak tersedia atau model belum ditraining.',
    });
  }
});

// ── GET /api/ml/feature-importance ────────────────────────────
// Kontribusi tiap fitur sensor dalam prediksi (dari Random Forest)
router.get('/feature-importance', async (_req, res) => {
  try {
    const { data } = await mlFetch('/model/feature-importance');
    res.json({ success: true, data: data.data });
  } catch {
    res.status(503).json({
      success: false,
      message: 'ML service tidak tersedia.',
    });
  }
});

module.exports = router;
