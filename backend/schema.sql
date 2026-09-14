-- Skema database untuk Disaster Monitoring Indonesia
-- Sumber data: BMKG (TEWS autogempa / gempaterkini / gempadirasakan)

CREATE TABLE IF NOT EXISTS earthquakes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(64) NOT NULL UNIQUE,
  magnitude DECIMAL(3, 1) NOT NULL,
  depth_km INT NOT NULL,
  latitude DECIMAL(8, 4) NOT NULL,
  longitude DECIMAL(9, 4) NOT NULL,
  location TEXT NOT NULL,
  event_time DATETIME NOT NULL,
  tsunami_status VARCHAR(64) NULL,
  felt TEXT NULL,
  shakemap VARCHAR(128) NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'BMKG',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_time (event_time),
  INDEX idx_magnitude (magnitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel gunung api (sumber: MAGMA Indonesia / PVMBG Badan Geologi)
CREATE TABLE IF NOT EXISTS volcanoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  province VARCHAR(128) NOT NULL,
  level TINYINT NOT NULL,
  level_name VARCHAR(16) NOT NULL,
  latitude DECIMAL(8, 4) NULL,
  longitude DECIMAL(9, 4) NULL,
  elevation_m INT NULL,
  report_url TEXT NULL,
  report_id VARCHAR(32) NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'MAGMA',
  observed_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
