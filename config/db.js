const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Gunakan promise agar lebih mudah dikelola dengan async/await
const promisePool = pool.promise();

module.exports = promisePool;