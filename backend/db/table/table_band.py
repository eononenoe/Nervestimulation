# -*- coding: utf-8 -*-
"""
밴드, 사용자, 센서 데이터, 이벤트 테이블 모델
"""

from datetime import datetime
from backend import db


class User(db.Model):
    """사용자 테이블"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    created = db.Column(db.DateTime)
    uid = db.Column(db.Integer)
    username = db.Column(db.String(48), comment='로그인 ID')
    password = db.Column(db.String(256), comment='암호화된 비밀번호')
    name = db.Column(db.String(48), comment='사용자 이름')
    permission = db.Column(db.Integer, comment='권한 레벨 (0:슈퍼관리자, 1:관리자, 2:일반)')
    age = db.Column(db.Integer)
    gender = db.Column(db.Integer)
    phone = db.Column(db.String(30), comment='전화번호')
    email = db.Column(db.String(48), comment='이메일')
    token = db.Column(db.String(128))
    last_logon_time = db.Column(db.DateTime)
    birth = db.Column(db.String(12))
    address = db.Column(db.String(256))

    # 관계
    bands = db.relationship('UserBand', backref='user', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'permission': self.permission,
            'created': self.created.isoformat() if self.created else None,
            'last_logon_time': self.last_logon_time.isoformat() if self.last_logon_time else None
        }


class Group(db.Model):
    """그룹 테이블"""
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, comment='그룹 이름')
    description = db.Column(db.Text, comment='그룹 설명')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Band(db.Model):
    """밴드(디바이스) 테이블"""
    __tablename__ = 'bands'

    # 실제 데이터베이스 컬럼
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
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
    def wearer_phone(self):
        return None

    @property
    def guardian_phone(self):
        return None

    @property
    def address(self):
        return ''

    @property
    def location_type(self):
        return 'GPS'

    @property
    def battery(self):
        return 0

    @property
    def firmware_version(self):
        return self.sw_ver

    @property
    def stimulator_connected(self):
        return self._stimulator_connected or False

    @stimulator_connected.setter
    def stimulator_connected(self, value):
        self._stimulator_connected = value

    @property
    def stimulator_id(self):
        return self._stimulator_id

    @stimulator_id.setter
    def stimulator_id(self, value):
        self._stimulator_id = value

    @property
    def created_at(self):
        return self.created

    @property
    def updated_at(self):
        return self.disconnect_time

    @property
    def last_data_at(self):
        return self.connect_time

    @property
    def is_active(self):
        return True

    # 관계
    sensor_data = db.relationship('SensorData', backref='band', lazy='dynamic')
    events = db.relationship('Event', backref='band', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'bid': self.bid,
            'wearer_name': self.wearer_name,
            'wearer_phone': self.wearer_phone,
            'guardian_phone': self.guardian_phone,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'address': self.address,
            'location_type': self.location_type,
            'connect_state': self.connect_state,
            'battery': self.battery,
            'firmware_version': self.firmware_version,
            'stimulator_connected': self.stimulator_connected,
            'stimulator_id': self.stimulator_id,
            'last_data_at': self.last_data_at.isoformat() if self.last_data_at else None,
            'is_active': self.is_active
        }


class UserBand(db.Model):
    """사용자-밴드 매핑 테이블"""
    __tablename__ = 'users_bands'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    band_id = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SensorData(db.Model):
    """센서 데이터 테이블"""
    __tablename__ = 'sensordata'

    # 실제 데이터베이스 컬럼
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
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

    # 신경자극기 연결 상태
    _stimulator_connected = db.Column('stimulator_connected', db.Boolean, default=False)
    _stimulator_id = db.Column('stimulator_id', db.String(48))

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
    def gyro_x(self):
        return None

    @property
    def gyro_y(self):
        return None

    @property
    def gyro_z(self):
        return None

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
            'FK_bid': self.FK_bid,
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
    """이벤트(알림) 테이블"""
    __tablename__ = 'events'

    # 실제 데이터베이스 컬럼
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
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


# 이벤트 타입 상수
class EventType:
    FALL_DETECTED = 'fall_detected'           # 낙상 감지
    HR_HIGH = 'hr_high'                       # 심박수 높음
    HR_LOW = 'hr_low'                         # 심박수 낮음
    SPO2_LOW = 'spo2_low'                     # 산소포화도 낮음
    BATTERY_LOW = 'battery_low'              # 배터리 부족
    GEOFENCE_EXIT = 'geofence_exit'          # 지오펜스 이탈
    SOS_BUTTON = 'sos_button'                # SOS 버튼
    DEVICE_OFFLINE = 'device_offline'        # 기기 오프라인
    STIMULATOR_DISCONNECTED = 'stimulator_disconnected'  # 신경자극기 연결 해제
