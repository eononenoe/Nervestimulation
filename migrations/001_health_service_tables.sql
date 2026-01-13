-- ============================================
-- eHG4 스마트밴드 신경자극 SaaS 플랫폼
-- 데이터베이스 마이그레이션 스크립트
-- ============================================

-- 1. 신경자극 세션 테이블
CREATE TABLE IF NOT EXISTS nerve_stim_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_bid INT,
    status INT DEFAULT 0 COMMENT '0:대기, 1:진행중, 2:완료',
    start_time DATETIME,
    end_time DATETIME NULL,
    strength INT COMMENT '자극 강도 1-20',
    frequency INT COMMENT '주파수 Hz 10-100',
    duration INT COMMENT '시간 분',
    bp_before_systolic INT NULL COMMENT '자극 전 수축기 혈압',
    bp_before_diastolic INT NULL COMMENT '자극 전 이완기 혈압',
    bp_after_systolic INT NULL COMMENT '자극 후 수축기 혈압',
    bp_after_diastolic INT NULL COMMENT '자극 후 이완기 혈압',
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FK_bid) REFERENCES bands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 혈압 측정 테이블
CREATE TABLE IF NOT EXISTS blood_pressure (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_bid INT,
    systolic INT COMMENT '수축기 혈압 mmHg',
    diastolic INT COMMENT '이완기 혈압 mmHg',
    pulse INT COMMENT '맥박 bpm',
    measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_after_stim BOOLEAN DEFAULT FALSE COMMENT '신경자극 후 측정 여부',
    FK_session_id INT NULL,
    FOREIGN KEY (FK_bid) REFERENCES bands(id) ON DELETE CASCADE,
    FOREIGN KEY (FK_session_id) REFERENCES nerve_stim_sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 건강 리포트 테이블
CREATE TABLE IF NOT EXISTS health_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_bid INT NULL,
    report_type VARCHAR(50) COMMENT '종합, 혈압, 신경자극, 활동량',
    report_name VARCHAR(200),
    period_start DATE,
    period_end DATE,
    file_path VARCHAR(500) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    download_count INT DEFAULT 0,
    FOREIGN KEY (FK_bid) REFERENCES bands(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 기기 관리 테이블
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    alias VARCHAR(100),
    device_type VARCHAR(50) COMMENT '자체 밴드, 상용워치, BLE 자극기',
    connection_type VARCHAR(50) COMMENT 'LTE-M, BLE, WiFi',
    status VARCHAR(20) DEFAULT '오프라인' COMMENT '온라인, 오프라인',
    battery INT DEFAULT 100 COMMENT '배터리 퍼센트',
    signal_strength INT DEFAULT 0 COMMENT '신호 강도 0-4',
    last_seen DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FK_bid INT NULL,
    -- LTE-M Cat.M1 관련 필드
    imei VARCHAR(20) NULL COMMENT 'LTE-M IMEI',
    iccid VARCHAR(25) NULL COMMENT 'SIM ICCID',
    firmware_version VARCHAR(20) NULL COMMENT '펌웨어 버전',
    -- RF 실내위치 관련
    rf_enabled BOOLEAN DEFAULT FALSE COMMENT 'RF 실내위치 활성화',
    -- GPS 관련
    gps_enabled BOOLEAN DEFAULT TRUE COMMENT 'GPS 활성화',
    last_latitude FLOAT NULL COMMENT '마지막 위도',
    last_longitude FLOAT NULL COMMENT '마지막 경도',
    FOREIGN KEY (FK_bid) REFERENCES bands(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 인덱스 생성
-- ============================================

-- 신경자극 세션 인덱스
CREATE INDEX idx_nerve_stim_sessions_status ON nerve_stim_sessions(status);
CREATE INDEX idx_nerve_stim_sessions_start_time ON nerve_stim_sessions(start_time);
CREATE INDEX idx_nerve_stim_sessions_fk_bid ON nerve_stim_sessions(FK_bid);

-- 혈압 측정 인덱스
CREATE INDEX idx_blood_pressure_measured_at ON blood_pressure(measured_at);
CREATE INDEX idx_blood_pressure_fk_bid ON blood_pressure(FK_bid);

-- 건강 리포트 인덱스
CREATE INDEX idx_health_reports_created_at ON health_reports(created_at);
CREATE INDEX idx_health_reports_type ON health_reports(report_type);

-- 기기 관리 인덱스
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_connection_type ON devices(connection_type);
CREATE INDEX idx_devices_device_type ON devices(device_type);

-- ============================================
-- 샘플 데이터 (테스트용)
-- ============================================

-- 신경자극 세션 샘플 데이터
INSERT INTO nerve_stim_sessions (FK_bid, status, start_time, end_time, strength, frequency, duration, bp_before_systolic, bp_before_diastolic, bp_after_systolic, bp_after_diastolic) VALUES
(1, 1, NOW(), NULL, 10, 80, 15, 135, 88, NULL, NULL),
(2, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR), 8, 60, 10, 140, 90, 125, 82),
(3, 0, DATE_ADD(NOW(), INTERVAL 1 HOUR), NULL, 12, 100, 20, NULL, NULL, NULL, NULL),
(1, 2, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 23 HOUR), 10, 80, 15, 138, 89, 128, 84),
(2, 1, NOW(), NULL, 6, 40, 10, 132, 85, NULL, NULL);

-- 혈압 측정 샘플 데이터
INSERT INTO blood_pressure (FK_bid, systolic, diastolic, pulse, measured_at, is_after_stim) VALUES
(1, 125, 80, 72, DATE_SUB(NOW(), INTERVAL 10 MINUTE), FALSE),
(2, 138, 88, 78, DATE_SUB(NOW(), INTERVAL 25 MINUTE), FALSE),
(3, 118, 76, 68, DATE_SUB(NOW(), INTERVAL 5 MINUTE), FALSE),
(1, 145, 92, 82, DATE_SUB(NOW(), INTERVAL 15 MINUTE), FALSE),
(2, 128, 82, 70, DATE_SUB(NOW(), INTERVAL 30 MINUTE), TRUE),
(1, 122, 78, 68, DATE_SUB(NOW(), INTERVAL 1 HOUR), TRUE);

-- 건강 리포트 샘플 데이터
INSERT INTO health_reports (FK_bid, report_type, report_name, period_start, period_end, created_at, download_count) VALUES
(1, '종합', '홍길동 종합 리포트', '2024-01-01', '2024-01-31', DATE_SUB(NOW(), INTERVAL 1 DAY), 5),
(2, '혈압', '김철수 혈압 분석', '2024-01-01', '2024-01-31', DATE_SUB(NOW(), INTERVAL 2 DAY), 3),
(3, '신경자극', '이영희 신경자극 효과', '2023-12-01', '2024-01-31', DATE_SUB(NOW(), INTERVAL 3 DAY), 2),
(1, '활동량', '박민수 활동량 리포트', '2024-01-01', '2024-01-31', DATE_SUB(NOW(), INTERVAL 4 DAY), 1);

-- 기기 샘플 데이터
INSERT INTO devices (device_id, alias, device_type, connection_type, status, battery, signal_strength, last_seen, FK_bid, imei, rf_enabled, gps_enabled) VALUES
('BAND001', '홍길동 밴드', '자체 밴드', 'LTE-M', '온라인', 85, 3, NOW(), 1, '359881090000001', TRUE, TRUE),
('BAND002', '김철수 밴드', '자체 밴드', 'BLE', '온라인', 62, 2, DATE_SUB(NOW(), INTERVAL 2 MINUTE), 2, NULL, FALSE, TRUE),
('STIM001', '이영희 자극기', 'BLE 자극기', 'BLE', '온라인', 15, 1, DATE_SUB(NOW(), INTERVAL 5 MINUTE), 3, NULL, FALSE, FALSE),
('WATCH001', '박민수 워치', '상용워치', 'BLE', '오프라인', 45, 0, DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL, NULL, FALSE, TRUE),
('BAND003', '최수진 밴드', '자체 밴드', 'LTE-M', '온라인', 78, 4, NOW(), NULL, '359881090000002', TRUE, TRUE);
