const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host              : process.env.DB_HOST     || 'localhost',
  port              : parseInt(process.env.DB_PORT || '3306'),
  user              : process.env.DB_USER     || 'root',
  password          : process.env.DB_PASS     || '',
  database          : process.env.DB_NAME     || 'data_air',
  waitForConnections: true,
  connectionLimit   : 10,
  queueLimit        : 0,
  charset           : 'utf8mb4',
  timezone          : '+07:00', // WIB
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
