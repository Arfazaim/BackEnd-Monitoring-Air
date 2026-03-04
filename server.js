const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Agar bisa membaca request body berformat JSON

// Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('<h2>Backend API Skripsi Kualitas Air Berjalan Lancar! 🚀</h2>');
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});