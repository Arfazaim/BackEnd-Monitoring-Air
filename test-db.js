const mysql = require('mysql2/promise');

async function checkData() {
  try {
    const conn = await mysql.createConnection({
      host: 'bqewt7bk6nx7my0d2mvn-mysql.services.clever-cloud.com',
      user: 'u4mdcvqxtsmaia2o',
      password: 'DpdtgKEdr3uq7KqcdXpE',
      database: 'bqewt7bk6nx7my0d2mvn',
      port: 3306,
      ssl: { rejectUnauthorized: false }
    });
    
    const [rows] = await conn.query('SELECT * FROM tb_sensor ORDER BY id DESC LIMIT 5');
    console.log('Data di tb_sensor:', rows);
    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}
checkData();
