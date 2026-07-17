const mysql = require('mysql2/promise');

async function testDB() {
  try {
    const conn = await mysql.createConnection({
      host: 'bqewt7bk6nx7my0d2mvn-mysql.services.clever-cloud.com',
      user: 'u4mdcvqxtsmaia2o',
      password: 'DpdtgKEdr3uq7KqcdXpE',
      database: 'bqewt7bk6nx7my0d2mvn',
      port: 3306,
      ssl: { rejectUnauthorized: false }
    });
    const [rows] = await conn.query('SHOW TABLES');
    console.log('Tables in DB:', rows);
    await conn.end();
  } catch (err) {
    console.error('DB Error:', err.message);
  }
}
testDB();
