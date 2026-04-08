# Aqua Monitor — Backend API v2.0

Backend Express.js untuk sistem monitoring kualitas air berbasis IoT (ESP32 + MySQL).

## Cara Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Setup database
```bash
mysql -u root -p < schema.sql
```

### 3. Konfigurasi environment
```bash
cp .env.example .env
# Edit .env dan isi semua nilai yang diperlukan
```

> ⚠️ **PENTING:** Jangan pernah commit file `.env` ke Git. File `.gitignore` sudah dikonfigurasi.

### 4. Jalankan server
```bash
npm run dev   # development (auto-restart)
npm start     # production
```

---

## Endpoint API

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/sensors` | - | Ambil data sensor (maks 100 baris) |
| POST | `/api/sensors` | x-api-key | Kirim data dari ESP32 |
| GET | `/api/logs` | - | Riwayat injeksi PAC |
| GET | `/api/config` | - | Baca offset kalibrasi |
| POST | `/api/config` | - | Simpan offset kalibrasi |
| GET | `/api/export` | - | Export CSV |
| GET | `/api/stats` | - | Statistik ringkas |
| GET | `/api/health` | - | Health check |

### Query parameters
- `GET /api/sensors?limit=50` — ubah jumlah baris (maks 500)
- `GET /api/logs?limit=200`
- `GET /api/export?from=2025-01-01&to=2025-12-31`

---

## Format data dari ESP32

```http
POST /api/sensors
x-api-key: your_api_key
Content-Type: application/json

{
  "ph": 7.2,
  "kekeruhan": 12.5,
  "tds": 280,
  "tegangan": 4.1
}
```

### Response ke ESP32
```json
{
  "success": true,
  "status_air": "Layak",
  "calibrated": { "ph": 7.2, "kekeruhan": 12.5, "tds": 280 },
  "commands": {
    "pump_pac": false,
    "buzzer": false
  }
}
```

---

## Threshold default

| Parameter | Min | Max |
|-----------|-----|-----|
| pH | 6.5 | 8.5 |
| Kekeruhan | 0 | 25 NTU |
| TDS | 0 | 500 ppm |
| Tegangan | 3.0 V | — |

Bisa dikustomisasi via environment variable: `PH_MIN`, `PH_MAX`, `TURBIDITY_MAX`, `TDS_MAX`.
