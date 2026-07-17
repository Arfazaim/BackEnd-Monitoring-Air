const mysql = require('mysql2/promise');

async function insertDummy() {
  try {
    const conn = await mysql.createConnection({
      host: 'bqewt7bk6nx7my0d2mvn-mysql.services.clever-cloud.com',
      user: 'u4mdcvqxtsmaia2o',
      password: 'DpdtgKEdr3uq7KqcdXpE',
      database: 'bqewt7bk6nx7my0d2mvn',
      port: 3306,
      ssl: { rejectUnauthorized: false }
    });
    
    // Insert dummy data
    await conn.query(`
      INSERT INTO tb_sensor (ph, kekeruhan, tds, status, tegangan, ml_score, ml_confidence, ml_prediction) 
      VALUES (7.2, 10.5, 150, 'Layak', 220, 15, 'Tinggi', 'Layak')
    `);
    
    console.log('Dummy data berhasil ditambahkan!');
    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}
insertDummy();
