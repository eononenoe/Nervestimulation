-- 신경자극기 연결 컬럼 추가 마이그레이션
-- 이미 컬럼이 존재하는 경우 오류 발생하지 않음

-- stimulator_connected 컬럼 추가
ALTER TABLE bands
ADD COLUMN IF NOT EXISTS stimulator_connected BOOLEAN DEFAULT FALSE COMMENT '신경자극기 BLE 연결 여부';

-- stimulator_id 컬럼 추가
ALTER TABLE bands
ADD COLUMN IF NOT EXISTS stimulator_id VARCHAR(50) COMMENT '연결된 신경자극기 ID';
