const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const apiRoutes  = require('./routes/apiRoutes');
const { apiKeyMiddleware } = require('./middleware/auth');

const path = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────
// Untuk cloud deployment, set env CORS_ORIGIN ke URL frontend production
// Contoh: CORS_ORIGIN=https://aqua-monitor.vercel.app
const allowedOrigins = [
  'http://localhost:5173',       // Vite dev default
  'http://localhost:3000',
  'http://localhost:4173',       // Vite preview
  'http://localhost:5000',
  'http://localhost:8080',       // Vite custom port
  'http://192.168.1.2:8080',    // Frontend via IP lokal router
  'http://192.168.1.2:5173',    // Vite dev via IP lokal
  'http://192.168.137.1:8080',  // Frontend via IP hotspot Windows
  'http://192.168.137.1:5173',  // Vite dev via hotspot
  'https://front-end-monitoring-air.vercel.app', // Frontend production Vercel
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : []),
];

app.use(cors({
  origin: (origin, cb) => {
    // Izinkan request tanpa origin (Postman, ESP32, curl)
    if (!origin || allowedOrigins.includes(origin)) 
      return cb(null, true);
    cb(new Error(`Origin ${origin} tidak diizinkan oleh CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
}));

// ── Static Files (panel test aktuator) ────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Body Parser ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Simple Request Logger ─────────────────────────────────────
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ── Health Check (tanpa API key) ──────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    status : 'ok',
    service: 'Aqua Monitor API',
    version: '2.0.0',
    uptime : Math.floor(process.uptime()) + 's',
    time   : new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────
// Endpoint GET dibuka untuk frontend (cek api key di level controller jika perlu)
// Endpoint POST wajib pakai API key (ESP32)
app.use('/api', apiRoutes);

// ── 404 Handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan server.'
      : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('─────────────────────────────────────');
  console.log(`  Aqua Monitor Backend v2.0`);
  console.log(`  Server  : http://localhost:${PORT}`);
  console.log(`  Panel   : http://localhost:${PORT}/panel.html`);
  console.log(`  Mode    : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  DB      : ${process.env.DB_NAME}@${process.env.DB_HOST}`);
  console.log('─────────────────────────────────────');
});
