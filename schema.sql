-- ============================================================
-- Aqua Monitor — Database Schema
-- Jalankan: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS data_air
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE data_air;

-- ── Tabel sensor utama ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tb_sensor (
  id             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ph             DECIMAL(5,3)   NOT NULL,
  kekeruhan      DECIMAL(8,3)   NOT NULL COMMENT 'Turbidity dalam NTU',
  tds            DECIMAL(8,3)   NOT NULL COMMENT 'Total Dissolved Solids dalam ppm',
  tegangan       DECIMAL(7,2)   NOT NULL COMMENT 'Tegangan AC Jaringan dari ZMPT101B dalam Volt',
  status         ENUM('Layak','Tidak Layak') NOT NULL DEFAULT 'Layak',
  -- ML predictions (NULL jika ML service belum aktif)
  ml_score       DECIMAL(5,2)   NULL COMMENT 'Probabilitas Tidak Layak dari ML 0-100 (%)',
  ml_confidence  ENUM('Tinggi','Sedang','Rendah') NULL COMMENT 'Tingkat keyakinan prediksi ML',
  ml_prediction  ENUM('Layak','Tidak Layak') NULL COMMENT 'Prediksi label dari model ML terbaik',
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tabel log aktuator (injeksi PAC) ─────────────────────────
CREATE TABLE IF NOT EXISTS tb_logs (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama_aktuator VARCHAR(100) NOT NULL,
  obat_digunakan VARCHAR(150) NOT NULL,
  keterangan    TEXT,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tabel konfigurasi kalibrasi ───────────────────────────────
CREATE TABLE IF NOT EXISTS tb_config (
  id                INT UNSIGNED  NOT NULL DEFAULT 1,
  offset_ph         DECIMAL(5,3)  NOT NULL DEFAULT 0.000,
  offset_tds        DECIMAL(8,3)  NOT NULL DEFAULT 0.000,
  offset_kekeruhan  DECIMAL(6,3)  NOT NULL DEFAULT 0.000,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sisipkan baris konfigurasi default
INSERT IGNORE INTO tb_config (id, offset_ph, offset_tds, offset_kekeruhan)
VALUES (1, 0, 0, 0);
