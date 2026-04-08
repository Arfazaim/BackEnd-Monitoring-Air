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
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ph          DECIMAL(5,3)   NOT NULL,
  kekeruhan   DECIMAL(8,3)   NOT NULL COMMENT 'Turbidity dalam NTU',
  tds         DECIMAL(8,3)   NOT NULL COMMENT 'Total Dissolved Solids dalam ppm',
  tegangan    DECIMAL(5,3)   NOT NULL COMMENT 'Tegangan baterai ESP32 dalam Volt',
  status      ENUM('Layak','Tidak Layak') NOT NULL DEFAULT 'Layak',
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- ============================================================
-- Contoh data dummy untuk testing
-- ============================================================
INSERT INTO tb_sensor (ph, kekeruhan, tds, tegangan, status) VALUES
  (7.20, 5.5,  210, 4.1, 'Layak'),
  (7.35, 8.2,  280, 4.0, 'Layak'),
  (6.80, 18.5, 350, 3.9, 'Layak'),
  (6.40, 30.0, 520, 3.8, 'Tidak Layak'),
  (7.10, 12.0, 290, 4.1, 'Layak');
