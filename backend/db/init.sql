-- Wellsafer Database Initialization Script
-- MySQL 8.0+

-- 데이터베이스 생성 (docker-compose에서 이미 생성됨)
-- CREATE DATABASE IF NOT EXISTS wellsafer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE wellsafer;

-- ============================================================
-- 테이블 생성 (SQLAlchemy ORM이 자동 생성하지만, 참조용)
-- ============================================================

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE COMMENT '로그인 ID',
    password VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
    name VARCHAR(100) NOT NULL COMMENT '사용자 이름',
    email VARCHAR(255) COMMENT '이메일',
    phone VARCHAR(20) COMMENT '전화번호',
    level INT DEFAULT 2 COMMENT '권한 레벨 (0:슈퍼관리자, 1:관리자, 2:일반)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_user_id (user_id),
    INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 그룹 테이블
CREATE TABLE IF NOT EXISTS `groups` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '그룹 이름',
    description TEXT COMMENT '그룹 설명',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 밴드(디바이스) 테이블
CREATE TABLE IF NOT EXISTS bands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bid VARCHAR(15) NOT NULL UNIQUE COMMENT '밴드 고유 ID (IMEI)',
    wearer_name VARCHAR(100) COMMENT '착용자 이름',
    wearer_phone VARCHAR(20) COMMENT '착용자 전화번호',
    guardian_phone VARCHAR(20) COMMENT '보호자 전화번호',
    latitude DOUBLE COMMENT '위도',
    longitude DOUBLE COMMENT '경도',
    address VARCHAR(255) COMMENT '주소',
    location_type VARCHAR(10) DEFAULT 'GPS' COMMENT '위치 타입 (GPS/RF)',
    connect_state INT DEFAULT 0 COMMENT '연결 상태 (0:오프라인, 1:온라인)',
    battery INT DEFAULT 0 COMMENT '배터리 잔량 (%)',
    firmware_version VARCHAR(20) COMMENT '펌웨어 버전',
    stimulator_connected BOOLEAN DEFAULT FALSE COMMENT '신경자극기 BLE 연결 여부',
    stimulator_id VARCHAR(50) COMMENT '연결된 신경자극기 ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_data_at DATETIME COMMENT '마지막 데이터 수신 시간',
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_bid (bid),
    INDEX idx_connect_state (connect_state),
    INDEX idx_last_data (last_data_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자-밴드 매핑 테이블
CREATE TABLE IF NOT EXISTS users_bands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    band_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_band (user_id, band_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 센서 데이터 테이블 (파티셔닝 적용)
CREATE TABLE IF NOT EXISTS sensordata (
    id BIGINT AUTO_INCREMENT,
    FK_bid INT NOT NULL,
    datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hr INT COMMENT '심박수 (bpm)',
    spo2 INT COMMENT '산소포화도 (%)',
    hrv_sdnn FLOAT COMMENT 'HRV SDNN (ms)',
    hrv_rmssd FLOAT COMMENT 'HRV RMSSD (ms)',
    skin_temp FLOAT COMMENT '피부 온도 (°C)',
    acc_x FLOAT COMMENT '가속도 X',
    acc_y FLOAT COMMENT '가속도 Y',
    acc_z FLOAT COMMENT '가속도 Z',
    gyro_x FLOAT COMMENT '자이로 X',
    gyro_y FLOAT COMMENT '자이로 Y',
    gyro_z FLOAT COMMENT '자이로 Z',
    steps INT COMMENT '걸음 수',
    activity_type VARCHAR(20) COMMENT '활동 유형',
    calories FLOAT COMMENT '칼로리 소모량',
    PRIMARY KEY (id, datetime),
    INDEX idx_bid_datetime (FK_bid, datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(datetime) * 100 + MONTH(datetime)) (
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p202502 VALUES LESS THAN (202503),
    PARTITION p202503 VALUES LESS THAN (202504),
    PARTITION p202504 VALUES LESS THAN (202505),
    PARTITION p202505 VALUES LESS THAN (202506),
    PARTITION p202506 VALUES LESS THAN (202507),
    PARTITION p202507 VALUES LESS THAN (202508),
    PARTITION p202508 VALUES LESS THAN (202509),
    PARTITION p202509 VALUES LESS THAN (202510),
    PARTITION p202510 VALUES LESS THAN (202511),
    PARTITION p202511 VALUES LESS THAN (202512),
    PARTITION p202512 VALUES LESS THAN (202601),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- 이벤트(알림) 테이블
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_bid INT NOT NULL,
    datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(50) NOT NULL COMMENT '이벤트 유형',
    event_level INT DEFAULT 1 COMMENT '심각도 (1:정보, 2:주의, 3:경고, 4:긴급)',
    value FLOAT COMMENT '관련 수치',
    message VARCHAR(255) COMMENT '이벤트 메시지',
    latitude DOUBLE,
    longitude DOUBLE,
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
    is_resolved BOOLEAN DEFAULT FALSE COMMENT '해결 여부',
    resolved_at DATETIME COMMENT '해결 시간',
    resolved_by INT COMMENT '해결자',
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at DATETIME,
    INDEX idx_bid_datetime (FK_bid, datetime),
    INDEX idx_event_level (event_level),
    INDEX idx_is_resolved (is_resolved),
    FOREIGN KEY (FK_bid) REFERENCES bands(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 신경자극 세션 테이블
CREATE TABLE IF NOT EXISTS nervestimulation_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL UNIQUE COMMENT '세션 고유 ID',
    FK_bid INT NOT NULL,
    stimulator_id VARCHAR(50) COMMENT '신경자극기 ID',
    status INT DEFAULT 0 COMMENT '상태 (0:대기, 1:진행중, 2:완료, 3:중단)',
    stim_level INT DEFAULT 1 COMMENT '자극 강도 (1-10)',
    frequency FLOAT DEFAULT 10.0 COMMENT '자극 주파수 (Hz)',
    pulse_width INT DEFAULT 200 COMMENT '펄스 폭 (μs)',
    duration INT DEFAULT 20 COMMENT '자극 시간 (분)',
    stim_mode VARCHAR(20) DEFAULT 'manual' COMMENT '자극 모드',
    target_nerve VARCHAR(20) DEFAULT 'median' COMMENT '대상 신경',
    scheduled_at DATETIME COMMENT '예약 시간',
    started_at DATETIME COMMENT '시작 시간',
    ended_at DATETIME COMMENT '종료 시간',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_reason VARCHAR(50) COMMENT '종료 사유',
    bp_before_id INT COMMENT '자극 전 혈압',
    bp_after_id INT COMMENT '자극 후 혈압',
    INDEX idx_session_id (session_id),
    INDEX idx_bid_status (FK_bid, status),
    FOREIGN KEY (FK_bid) REFERENCES bands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 신경자극 이력 테이블
CREATE TABLE IF NOT EXISTS nervestimulation_hist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    FK_bid INT NOT NULL,
    stimulator_id VARCHAR(50),
    stim_level INT,
    frequency FLOAT,
    pulse_width INT,
    duration_planned INT COMMENT '계획된 시간 (분)',
    duration_actual INT COMMENT '실제 시간 (분)',
    started_at DATETIME,
    ended_at DATETIME,
    end_reason VARCHAR(50),
    bp_systolic_before INT COMMENT '자극 전 수축기 혈압',
    bp_diastolic_before INT COMMENT '자극 전 이완기 혈압',
    bp_systolic_after INT COMMENT '자극 후 수축기 혈압',
    bp_diastolic_after INT COMMENT '자극 후 이완기 혈압',
    bp_change INT COMMENT '혈압 변화량 (mmHg)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bid_started (FK_bid, started_at),
    INDEX idx_session_id (session_id),
    FOREIGN KEY (FK_bid) REFERENCES bands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 혈압 기록 테이블
CREATE TABLE IF NOT EXISTS bloodpressure (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_bid INT NOT NULL,
    datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    systolic INT NOT NULL COMMENT '수축기 혈압 (mmHg)',
    diastolic INT NOT NULL COMMENT '이완기 혈압 (mmHg)',
    pulse INT COMMENT '맥박수 (bpm)',
    measurement_type VARCHAR(20) DEFAULT 'manual' COMMENT '측정 유형',
    session_id VARCHAR(50) COMMENT '연관된 자극 세션 ID',
    arm_position VARCHAR(10) COMMENT '측정 팔',
    posture VARCHAR(20) COMMENT '자세',
    notes TEXT COMMENT '메모',
    INDEX idx_bid_datetime (FK_bid, datetime),
    FOREIGN KEY (FK_bid) REFERENCES bands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 처방 이력 테이블
CREATE TABLE IF NOT EXISTS prescription_hist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    FK_bid INT NOT NULL,
    prescribed_by INT COMMENT '처방 의료인',
    stim_level INT COMMENT '권장 자극 강도',
    frequency FLOAT COMMENT '권장 주파수',
    duration INT COMMENT '권장 자극 시간',
    sessions_per_day INT DEFAULT 1 COMMENT '일일 권장 횟수',
    schedule_times JSON COMMENT '권장 자극 시간대',
    valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME,
    diagnosis TEXT COMMENT '진단명',
    notes TEXT COMMENT '처방 메모',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (FK_bid) REFERENCES bands(id) ON DELETE CASCADE,
    FOREIGN KEY (prescribed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 초기 데이터 삽입
-- ============================================================

-- 기본 관리자 계정 (비밀번호: admin1234)
-- bcrypt hash for 'admin1234'
INSERT INTO users (user_id, password, name, email, level) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4beSmULU4iy5C.Gy', '관리자', 'admin@wellsafer.com', 0)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 테스트 사용자
INSERT INTO users (user_id, password, name, email, phone, level) VALUES
('user1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4beSmULU4iy5C.Gy', '김철수', 'user1@test.com', '01012345678', 2),
('user2', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4beSmULU4iy5C.Gy', '이영희', 'user2@test.com', '01087654321', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 테스트 밴드
INSERT INTO bands (bid, wearer_name, wearer_phone, guardian_phone, latitude, longitude, address, connect_state, battery) VALUES
('467191213660619', '홍길동', '01011112222', '01033334444', 37.5665, 126.9780, '서울특별시 중구', 1, 85),
('467191213660620', '김영수', '01055556666', '01077778888', 37.5013, 127.0397, '서울특별시 강남구', 0, 45),
('467191213660621', '박미영', '01099990000', '01011110000', 35.1796, 129.0756, '부산광역시 해운대구', 1, 72)
ON DUPLICATE KEY UPDATE wearer_name = VALUES(wearer_name);

-- 사용자-밴드 매핑
INSERT INTO users_bands (user_id, band_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 1),
(3, 2)
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

-- 테스트 그룹
INSERT INTO `groups` (name, description) VALUES
('서울지역', '서울 지역 착용자 그룹'),
('요양원A', 'A 요양원 관리 그룹')
ON DUPLICATE KEY UPDATE description = VALUES(description);
