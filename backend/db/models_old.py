# -*- coding: utf-8 -*-
"""
데이터베이스 모델 정의
SQLAlchemy ORM 모델
"""

from datetime import datetime
# Use absolute import to avoid circular import issues
import sys
sys.path.insert(0, '.')
from backend import db as _db
db = _db

# Export db so it can be imported from this module
__all__ = ['db', 'User', 'Group', 'Band', 'UsersBands', 'SensorData', 'Event',
           'NervestimulationStatus', 'NervestimulationHist', 'BloodPressure', 'PrescriptionHist']


class User(db.Model):
    """사용자 모델"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime)
    uid = db.Column(db.Integer)
    username = db.Column(db.String(48))
    password = db.Column(db.String(256))
    name = db.Column(db.String(48))
    permission = db.Column(db.Integer)
    age = db.Column(db.Integer)
    gender = db.Column(db.Integer)
    phone = db.Column(db.String(30))
    email = db.Column(db.String(48))
    token = db.Column(db.String(128))
    last_logon_time = db.Column(db.DateTime)
    birth = db.Column(db.String(12))
    address = db.Column(db.String(256))

    # 호환성을 위한 프로퍼티
    @property
    def user_id(self):
        return self.username

    @property
    def level(self):
        return self.permission

    @property
    def created_at(self):
        return self.created

    @property
    def updated_at(self):
        return self.last_logon_time

    @property
    def is_active(self):
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'level': self.level,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }


class Group(db.Model):
    """그룹 모델"""
    __tablename__ = 'groups'

    id = db.Column(db.Integer, primary_key=True)
    gid = db.Column(db.Integer)
    groupname = db.Column(db.String(24))
    permission = db.Column(db.Integer)
    created = db.Column(db.DateTime)

    # 호환성을 위한 프로퍼티
    @property
    def name(self):
        return self.groupname

    @property
    def created_at(self):
        return self.created

    @property
    def description(self):
        return None

    @property
    def is_active(self):
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Band(db.Model):
    """밴드(디바이스) 모델"""
    __tablename__ = 'bands'

    id = db.Column(db.Integer, primary_key=True)
    bid = db.Column(db.String(48))
    created = db.Column(db.DateTime)
    alias = db.Column(db.String(48))
    name = db.Column(db.String(48))
    gender = db.Column(db.Integer)
    birth = db.Column(db.DateTime)
    disconnect_time = db.Column(db.DateTime)
    connect_time = db.Column(db.DateTime)
    connect_state = db.Column(db.Integer)
    latitude = db.Column(db.Numeric(10, 8))
    longitude = db.Column(db.Numeric(11, 8))
    heat_warn = db.Column(db.Integer)
    cold_warn = db.Column(db.Integer)
    heat_illness_risk = db.Column(db.Integer)
    rest_alert = db.Column(db.Integer)
    sw_ver = db.Column(db.String(48))

    # 호환성을 위한 프로퍼티
    @property
    def wearer_name(self):
        return self.name or self.alias

    @property
    def firmware_version(self):
        return self.sw_ver

    @property
    def is_active(self):
        return True

    @property
    def battery(self):
        return 0  # 실제 배터리 정보가 없으면 기본값

    @property
    def address(self):
        return ''  # 주소 정보가 없으면 빈 문자열

    @property
    def last_data_at(self):
        return self.connect_time

    @property
    def created_at(self):
        return self.created

    @property
    def updated_at(self):
        return self.disconnect_time

    @property
    def guardian_phone(self):
        return None  # 실제 DB에 보호자 전화번호 필드 없음

    @property
    def wearer_phone(self):
        return None  # 실제 DB에 착용자 전화번호 필드 없음

    @property
    def stimulator_connected(self):
        return False

    @property
    def stimulator_id(self):
        return None

    @property
    def location_type(self):
        return 'GPS'

    # 관계
    sensor_data = db.relationship('SensorData', backref='band', lazy='dynamic')
    events = db.relationship('Event', backref='band', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'bid': self.bid,
            'wearer_name': self.wearer_name,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'address': self.address,
            'connect_state': self.connect_state,
            'battery': self.battery,
            'firmware_version': self.firmware_version,
            'last_data_at': self.last_data_at.isoformat() if self.last_data_at else None,
            'is_active': self.is_active
        }


class UsersBands(db.Model):
    """사용자-밴드 매핑"""
    __tablename__ = 'users_bands'

    id = db.Column(db.Integer, primary_key=True)
    FK_uid = db.Column(db.Integer, db.ForeignKey('users.id'))
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'))

    # 호환성을 위한 프로퍼티
    @property
    def user_id(self):
        return self.FK_uid

    @property
    def band_id(self):
        return self.FK_bid


class SensorData(db.Model):
    """센서 데이터 모델"""
    __tablename__ = 'sensordata'

    id = db.Column(db.Integer, primary_key=True)
    datetime = db.Column(db.DateTime)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'))
    battery_level = db.Column(db.Integer)
    hr = db.Column(db.Integer)
    spo2 = db.Column(db.Integer)
    motionFlag = db.Column(db.Integer)
    scdState = db.Column(db.Integer)
    activity = db.Column(db.Integer)
    walk_steps = db.Column(db.Integer)
    run_steps = db.Column(db.Integer)
    temp_walk_steps = db.Column(db.Integer)
    temp_run_steps = db.Column(db.Integer)
    x = db.Column(db.Integer)
    y = db.Column(db.Integer)
    z = db.Column(db.Integer)
    rssi = db.Column(db.Integer)
    move_activity = db.Column(db.Integer)
    move_cumulative_activity = db.Column(db.Integer)
    heart_activity = db.Column(db.Integer)
    skin_temp = db.Column(db.Integer)
    sum_Kcal_acc = db.Column(db.Integer)
    ssHr_dayMin = db.Column(db.Integer)
    ssHr_dayMax = db.Column(db.Integer)
    temperature_dayMin = db.Column(db.Integer)
    temperature_dayMax = db.Column(db.Integer)

    # 호환성을 위한 프로퍼티
    @property
    def hrv_sdnn(self):
        return None

    @property
    def hrv_rmssd(self):
        return None

    @property
    def acc_x(self):
        return self.x

    @property
    def acc_y(self):
        return self.y

    @property
    def acc_z(self):
        return self.z

    @property
    def steps(self):
        return (self.walk_steps or 0) + (self.run_steps or 0)

    @property
    def activity_type(self):
        return self.activity

    @property
    def calories(self):
        return self.sum_Kcal_acc
    
    def to_dict(self):
        return {
            'id': self.id,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'hr': self.hr,
            'spo2': self.spo2,
            'hrv_sdnn': self.hrv_sdnn,
            'hrv_rmssd': self.hrv_rmssd,
            'skin_temp': self.skin_temp,
            'acc_x': self.acc_x,
            'acc_y': self.acc_y,
            'acc_z': self.acc_z,
            'steps': self.steps,
            'activity_type': self.activity_type,
            'calories': self.calories,
            'battery_level': self.battery_level
        }


class Event(db.Model):
    """이벤트(알림) 모델"""
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    datetime = db.Column(db.DateTime)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'))
    type = db.Column(db.Integer)  # 이벤트 타입 (6:SOS, 7:낙상, 8:심박수높음, 9:심박수낮음, 10:산소포화도낮음)
    value = db.Column(db.Integer)
    action_status = db.Column(db.Integer, default=0)  # 0:미처리, 1:처리중, 2:완료
    action_time = db.Column(db.DateTime)
    action_by = db.Column(db.String(48))
    action_note = db.Column(db.Text)

    # 호환성을 위한 프로퍼티
    @property
    def event_type(self):
        """type을 event_type 문자열로 변환"""
        type_map = {
            6: 'sos',
            7: 'fall',
            8: 'hr_high',
            9: 'hr_low',
            10: 'spo2_low',
        }
        return type_map.get(self.type, 'unknown')

    @property
    def event_level(self):
        """type을 event_level로 변환"""
        if self.type in [6, 7]:  # SOS, 낙상
            return 4
        elif self.type in [8, 9, 10]:  # 생체신호 이상
            return 3
        return 1

    @property
    def message(self):
        """action_note를 message로"""
        return self.action_note

    @property
    def is_read(self):
        """action_status가 0이 아니면 읽음"""
        return self.action_status != 0

    @property
    def is_resolved(self):
        """action_status가 2면 해결됨"""
        return self.action_status == 2

    @property
    def resolved_at(self):
        return self.action_time

    @property
    def resolved_by(self):
        return self.action_by

    @property
    def latitude(self):
        """DB에 없는 필드"""
        return None

    @property
    def longitude(self):
        """DB에 없는 필드"""
        return None

    @property
    def sms_sent(self):
        """DB에 없는 필드"""
        return False

    @property
    def sms_sent_at(self):
        """DB에 없는 필드"""
        return None
    
    def to_dict(self):
        return {
            'id': self.id,
            'FK_bid': self.FK_bid,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'event_type': self.event_type,
            'event_level': self.event_level,
            'value': self.value,
            'message': self.message,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'is_read': self.is_read,
            'is_resolved': self.is_resolved,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'sms_sent': self.sms_sent
        }


class NervestimulationStatus(db.Model):
    """신경자극 세션 상태"""
    __tablename__ = 'nervestimulation_status'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(50), unique=True, nullable=False)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False)
    stimulator_id = db.Column(db.String(50))
    status = db.Column(db.Integer, default=0)  # 0:대기, 1:진행중, 2:완료, 3:중단
    stim_level = db.Column(db.Integer, default=1)  # 1-10
    frequency = db.Column(db.Float, default=10.0)  # Hz
    pulse_width = db.Column(db.Integer, default=200)  # μs
    duration = db.Column(db.Integer, default=20)  # 분
    stim_mode = db.Column(db.String(20), default='manual')
    target_nerve = db.Column(db.String(20), default='median')
    scheduled_at = db.Column(db.DateTime)
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    end_reason = db.Column(db.String(50))
    bp_before_id = db.Column(db.Integer)
    bp_after_id = db.Column(db.Integer)
    
    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'FK_bid': self.FK_bid,
            'stimulator_id': self.stimulator_id,
            'status': self.status,
            'stim_level': self.stim_level,
            'frequency': self.frequency,
            'pulse_width': self.pulse_width,
            'duration': self.duration,
            'stim_mode': self.stim_mode,
            'target_nerve': self.target_nerve,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'end_reason': self.end_reason
        }


class NervestimulationHist(db.Model):
    """신경자극 이력"""
    __tablename__ = 'nervestimulation_hist'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(50), nullable=False)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False)
    stimulator_id = db.Column(db.String(50))
    stim_level = db.Column(db.Integer)
    frequency = db.Column(db.Float)
    pulse_width = db.Column(db.Integer)
    duration_planned = db.Column(db.Integer)
    duration_actual = db.Column(db.Integer)
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    end_reason = db.Column(db.String(50))
    bp_systolic_before = db.Column(db.Integer)
    bp_diastolic_before = db.Column(db.Integer)
    bp_systolic_after = db.Column(db.Integer)
    bp_diastolic_after = db.Column(db.Integer)
    bp_change = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'FK_bid': self.FK_bid,
            'stimulator_id': self.stimulator_id,
            'stim_level': self.stim_level,
            'frequency': self.frequency,
            'pulse_width': self.pulse_width,
            'duration_planned': self.duration_planned,
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
    """혈압 기록"""
    __tablename__ = 'bloodpressure'
    
    id = db.Column(db.Integer, primary_key=True)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False)
    datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    systolic = db.Column(db.Integer, nullable=False)  # 수축기
    diastolic = db.Column(db.Integer, nullable=False)  # 이완기
    pulse = db.Column(db.Integer)  # 맥박
    measurement_type = db.Column(db.String(20), default='manual')
    session_id = db.Column(db.String(50))
    arm_position = db.Column(db.String(10))
    posture = db.Column(db.String(20))
    notes = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'FK_bid': self.FK_bid,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'systolic': self.systolic,
            'diastolic': self.diastolic,
            'pulse': self.pulse,
            'measurement_type': self.measurement_type,
            'session_id': self.session_id,
            'arm_position': self.arm_position,
            'posture': self.posture,
            'notes': self.notes
        }


class PrescriptionHist(db.Model):
    """처방 이력"""
    __tablename__ = 'prescription_hist'

    id = db.Column(db.Integer, primary_key=True)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False)
    prescribed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    stim_level = db.Column(db.Integer)
    frequency = db.Column(db.Float)
    duration = db.Column(db.Integer)
    sessions_per_day = db.Column(db.Integer)
    schedule_times = db.Column(db.Text)  # MySQL longtext
    valid_from = db.Column(db.DateTime)
    valid_until = db.Column(db.DateTime)
    diagnosis = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime)
    is_active = db.Column(db.Integer)  # MySQL tinyint(1)
    
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
            'notes': self.notes,
            'is_active': self.is_active
        }


class UsersGroups(db.Model):
    """사용자-그룹 매핑"""
    __tablename__ = 'usersgroups'

    id = db.Column(db.Integer, primary_key=True)
    FK_uid = db.Column(db.Integer, db.ForeignKey('users.id'))
    FK_gid = db.Column(db.Integer, db.ForeignKey('groups.id'))


class BandLog(db.Model):
    """밴드 로그"""
    __tablename__ = 'bandlog'

    id = db.Column(db.Integer, primary_key=True)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'))
    type = db.Column(db.Integer)
    datetime = db.Column(db.DateTime)


class DailyStatistics(db.Model):
    """일별 통계"""
    __tablename__ = 'daily_statistics'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    FK_bid = db.Column(db.Integer, nullable=False)
    avg_hr = db.Column(db.Numeric(5, 2))
    min_hr = db.Column(db.Integer)
    max_hr = db.Column(db.Integer)
    avg_spo2 = db.Column(db.Numeric(5, 2))
    min_spo2 = db.Column(db.Integer)
    total_steps = db.Column(db.Integer)
    total_kcal = db.Column(db.Numeric(10, 2))
    work_hours = db.Column(db.Numeric(5, 2))
    rest_hours = db.Column(db.Numeric(5, 2))
    alert_count = db.Column(db.Integer)
    sos_count = db.Column(db.Integer)


class AlertRecipients(db.Model):
    """알림 수신자"""
    __tablename__ = 'alert_recipients'

    id = db.Column(db.Integer, primary_key=True)
    FK_user_id = db.Column(db.Integer)
    FK_group_id = db.Column(db.Integer)
    recipient_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100))
    phone = db.Column(db.String(30))
    push_token = db.Column(db.String(255))
    alert_types = db.Column(db.String(200))
    is_active = db.Column(db.Integer)
    created_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime)


class MessageHistory(db.Model):
    """메시지 전송 이력"""
    __tablename__ = 'message_history'

    id = db.Column(db.Integer, primary_key=True)
    FK_template_id = db.Column(db.Integer)
    FK_rule_id = db.Column(db.Integer)
    FK_user_id = db.Column(db.Integer)
    FK_bid = db.Column(db.Integer)
    title = db.Column(db.String(200))
    content = db.Column(db.Text, nullable=False)
    recipient_type = db.Column(db.String(20), nullable=False)
    recipient = db.Column(db.String(100), nullable=False)
    send_type = db.Column(db.String(20))
    status = db.Column(db.String(20))
    error_message = db.Column(db.Text)
    sent_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime)
    sent_by = db.Column(db.Integer)


class Departments(db.Model):
    """부서"""
    __tablename__ = 'departments'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    manager_id = db.Column(db.Integer)
    location = db.Column(db.String(100))
    created = db.Column(db.DateTime)
