const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const apiRoutes  = require('./routes/apiRoutes');
const { apiKeyMiddleware } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173', // Vite dev
  'http://localhost:3000',
  'http://localhost:4173', // Vite preview
  'http://localhost:5000',
  'http://localhost:8080',
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
  console.log(`  Mode    : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  DB      : ${process.env.DB_NAME}@${process.env.DB_HOST}`);
  console.log('─────────────────────────────────────');
});
