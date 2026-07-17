const mysql = require('mysql2');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = mysql.createPool({
  host              : process.env.DB_HOST     || process.env.MYSQL_ADDON_HOST     || 'localhost',
  port              : parseInt(process.env.DB_PORT || process.env.MYSQL_ADDON_PORT || '3306'),
  user              : process.env.DB_USER     || process.env.MYSQL_ADDON_USER     || 'root',
  password          : process.env.DB_PASS     || process.env.MYSQL_ADDON_PASSWORD || '',
  database          : process.env.DB_NAME     || process.env.MYSQL_ADDON_DB       || 'data_air',
  waitForConnections: true,
  // SANGAT PENTING: Clever Cloud gratis maks 5 koneksi. 
  // Set ke 1 agar aman saat Vercel membuka banyak instance serverless bersamaan.
  connectionLimit   : 1, 
  queueLimit        : 0,
  charset           : 'utf8mb4',
  timezone          : '+07:00', // WIB
  // SSL wajib untuk Clever Cloud di production
  ssl               : isProduction ? { rejectUnauthorized: false } : false,
});

const promisePool = pool.promise();

// Test koneksi saat startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('[DB] Koneksi gagal:', err.message);
    console.error('[DB] Pastikan MySQL berjalan dan kredensial di .env sudah benar.');
    return;
  }
  console.log('[DB] Koneksi berhasil ke:', process.env.DB_NAME);
  connection.release();
});

module.exports = promisePool;
