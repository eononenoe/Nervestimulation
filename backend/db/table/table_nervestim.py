# -*- coding: utf-8 -*-
"""
신경자극 세션, 혈압 기록, 처방 이력 테이블 모델
"""

from datetime import datetime
from backend import db


class NerveStimSession(db.Model):
    """신경자극 세션 테이블"""
    __tablename__ = 'nervestimulation_status'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.String(50), unique=True, nullable=False, comment='세션 고유 ID')
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False, index=True)
    stimulator_id = db.Column(db.String(50), comment='신경자극기 ID')
    
    # 세션 상태
    status = db.Column(db.Integer, default=0, comment='상태 (0:대기, 1:진행중, 2:완료, 3:중단)')
    
    # 자극 파라미터
    stim_level = db.Column(db.Integer, default=1, comment='자극 강도 (1-10)')
    frequency = db.Column(db.Float, default=10.0, comment='자극 주파수 (Hz)')
    pulse_width = db.Column(db.Integer, default=200, comment='펄스 폭 (μs)')
    duration = db.Column(db.Integer, default=20, comment='자극 시간 (분)')
    
    # 자극 모드
    stim_mode = db.Column(db.String(20), default='manual', comment='자극 모드 (manual/auto/scheduled)')
    target_nerve = db.Column(db.String(20), default='median', comment='대상 신경 (median/ulnar/both)')
    
    # 시간 정보
    scheduled_at = db.Column(db.DateTime, comment='예약 시간')
    started_at = db.Column(db.DateTime, comment='시작 시간')
    ended_at = db.Column(db.DateTime, comment='종료 시간')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 종료 사유
    end_reason = db.Column(db.String(50), comment='종료 사유 (completed/user_stop/error/timeout)')
    
    # 혈압 측정 연결
    bp_before_id = db.Column(db.Integer, db.ForeignKey('bloodpressure.id'), comment='자극 전 혈압')
    bp_after_id = db.Column(db.Integer, db.ForeignKey('bloodpressure.id'), comment='자극 후 혈압')
    
    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'FK_bid': self.FK_bid,
            'stimulator_id': self.stimulator_id,
            'status': self.status,
            'status_text': self.get_status_text(),
            'stim_level': self.stim_level,
            'frequency': self.frequency,
            'pulse_width': self.pulse_width,
            'duration': self.duration,
            'stim_mode': self.stim_mode,
            'target_nerve': self.target_nerve,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'end_reason': self.end_reason
        }
    
    def get_status_text(self):
        status_map = {0: '대기', 1: '진행중', 2: '완료', 3: '중단'}
        return status_map.get(self.status, '알 수 없음')


class NerveStimHistory(db.Model):
    """신경자극 이력 테이블 (완료된 세션 아카이브)"""
    __tablename__ = 'nervestimulation_hist'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.String(50), nullable=False, index=True)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False, index=True)
    stimulator_id = db.Column(db.String(50))
    
    # 자극 파라미터
    stim_level = db.Column(db.Integer)
    frequency = db.Column(db.Float)
    pulse_width = db.Column(db.Integer)
    duration_planned = db.Column(db.Integer, comment='계획된 시간 (분)')
    duration_actual = db.Column(db.Integer, comment='실제 시간 (분)')
    
    # 시간 정보
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    
    # 결과
    end_reason = db.Column(db.String(50))
    
    # 혈압 변화
    bp_systolic_before = db.Column(db.Integer, comment='자극 전 수축기 혈압')
    bp_diastolic_before = db.Column(db.Integer, comment='자극 전 이완기 혈압')
    bp_systolic_after = db.Column(db.Integer, comment='자극 후 수축기 혈압')
    bp_diastolic_after = db.Column(db.Integer, comment='자극 후 이완기 혈압')
    bp_change = db.Column(db.Integer, comment='혈압 변화량 (mmHg)')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'FK_bid': self.FK_bid,
            'stim_level': self.stim_level,
            'frequency': self.frequency,
            'duration_actual': self.duration_actual,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'end_reason': self.end_reason,
            'bp_systolic_before': self.bp_systolic_before,
            'bp_diastolic_before': self.bp_diastolic_before,
            'bp_systolic_after': self.bp_systolic_after,
            'bp_diastolic_after': self.bp_diastolic_after,
            'bp_change': self.bp_change
        }


class BloodPressure(db.Model):
    """혈압 기록 테이블"""
    __tablename__ = 'bloodpressure'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False, index=True)
    datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # 혈압 값
    systolic = db.Column(db.Integer, nullable=False, comment='수축기 혈압 (mmHg)')
    diastolic = db.Column(db.Integer, nullable=False, comment='이완기 혈압 (mmHg)')
    pulse = db.Column(db.Integer, comment='맥박수 (bpm)')
    
    # 측정 맥락
    measurement_type = db.Column(db.String(20), default='manual', comment='측정 유형 (manual/auto/pre_stim/post_stim)')
    session_id = db.Column(db.String(50), comment='연관된 자극 세션 ID')
    
    # 추가 정보
    arm_position = db.Column(db.String(10), comment='측정 팔 (left/right)')
    posture = db.Column(db.String(20), comment='자세 (sitting/standing/lying)')
    notes = db.Column(db.Text, comment='메모')
    
    def to_dict(self):
        return {
            'id': self.id,
            'FK_bid': self.FK_bid,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'systolic': self.systolic,
            'diastolic': self.diastolic,
            'pulse': self.pulse,
            'measurement_type': self.measurement_type,
            'session_id': self.session_id
        }
    
    @property
    def category(self):
        """혈압 분류 반환"""
        if self.systolic < 120 and self.diastolic < 80:
            return 'normal'
        elif self.systolic < 130 and self.diastolic < 80:
            return 'elevated'
        elif self.systolic < 140 or self.diastolic < 90:
            return 'high_stage1'
        elif self.systolic < 180 or self.diastolic < 120:
            return 'high_stage2'
        else:
            return 'crisis'


class Prescription(db.Model):
    """처방 이력 테이블"""
    __tablename__ = 'prescription_hist'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False, index=True)
    prescribed_by = db.Column(db.Integer, db.ForeignKey('users.id'), comment='처방 의료인')
    
    # 처방 내용
    stim_level = db.Column(db.Integer, comment='권장 자극 강도')
    frequency = db.Column(db.Float, comment='권장 주파수')
    duration = db.Column(db.Integer, comment='권장 자극 시간')
    sessions_per_day = db.Column(db.Integer, default=1, comment='일일 권장 횟수')
    
    # 스케줄
    schedule_times = db.Column(db.JSON, comment='권장 자극 시간대')
    
    # 유효 기간
    valid_from = db.Column(db.DateTime, default=datetime.utcnow)
    valid_until = db.Column(db.DateTime)
    
    # 메모
    diagnosis = db.Column(db.Text, comment='진단명')
    notes = db.Column(db.Text, comment='처방 메모')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'FK_bid': self.FK_bid,
            'prescribed_by': self.prescribed_by,
            'stim_level': self.stim_level,
            'frequency': self.frequency,
            'duration': self.duration,
            'sessions_per_day': self.sessions_per_day,
            'schedule_times': self.schedule_times,
            'valid_from': self.valid_from.isoformat() if self.valid_from else None,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'diagnosis': self.diagnosis,
            'is_active': self.is_active
        }


# 세션 상태 상수
class SessionStatus:
    PENDING = 0      # 대기
    RUNNING = 1      # 진행중
    COMPLETED = 2    # 완료
    STOPPED = 3      # 중단


# 종료 사유 상수
class EndReason:
    COMPLETED = 'completed'      # 정상 완료
    USER_STOP = 'user_stop'      # 사용자 중지
    ERROR = 'error'              # 오류
    TIMEOUT = 'timeout'          # 타임아웃
    DISCONNECTED = 'disconnected'  # 연결 끊김
    LOW_BATTERY = 'low_battery'  # 배터리 부족
    SYSTEM_CLEANUP = 'system_cleanup'  # 시스템 정리 (좀비 세션 자동 종료)
