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
    user_id = db.Column(db.String(50), unique=True, nullable=False, comment='로그인 ID')
    password = db.Column(db.String(255), nullable=False, comment='암호화된 비밀번호')
    name = db.Column(db.String(100), nullable=False, comment='사용자 이름')
    email = db.Column(db.String(255), comment='이메일')
    phone = db.Column(db.String(20), comment='전화번호')
    level = db.Column(db.Integer, default=2, comment='권한 레벨 (0:슈퍼관리자, 1:관리자, 2:일반)')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # 관계
    bands = db.relationship('UserBand', backref='user', lazy='dynamic')
    
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
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    bid = db.Column(db.String(15), unique=True, nullable=False, comment='밴드 고유 ID (IMEI)')
    wearer_name = db.Column(db.String(100), comment='착용자 이름')
    wearer_phone = db.Column(db.String(20), comment='착용자 전화번호')
    guardian_phone = db.Column(db.String(20), comment='보호자 전화번호')
    
    # 위치 정보
    latitude = db.Column(db.Float, comment='위도')
    longitude = db.Column(db.Float, comment='경도')
    address = db.Column(db.String(255), comment='주소')
    location_type = db.Column(db.String(10), default='GPS', comment='위치 타입 (GPS/RF)')
    
    # 상태 정보
    connect_state = db.Column(db.Integer, default=0, comment='연결 상태 (0:오프라인, 1:온라인)')
    battery = db.Column(db.Integer, default=0, comment='배터리 잔량 (%)')
    firmware_version = db.Column(db.String(20), comment='펌웨어 버전')
    
    # 신경자극기 연결 상태
    stimulator_connected = db.Column(db.Boolean, default=False, comment='신경자극기 BLE 연결 여부')
    stimulator_id = db.Column(db.String(50), comment='연결된 신경자극기 ID')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_data_at = db.Column(db.DateTime, comment='마지막 데이터 수신 시간')
    is_active = db.Column(db.Boolean, default=True)
    
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
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'location_type': self.location_type,
            'connect_state': self.connect_state,
            'battery': self.battery,
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
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False, index=True)
    datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # 생체신호
    hr = db.Column(db.Integer, comment='심박수 (bpm)')
    spo2 = db.Column(db.Integer, comment='산소포화도 (%)')
    hrv_sdnn = db.Column(db.Float, comment='HRV SDNN (ms)')
    hrv_rmssd = db.Column(db.Float, comment='HRV RMSSD (ms)')
    skin_temp = db.Column(db.Float, comment='피부 온도 (°C)')
    
    # IMU 데이터
    acc_x = db.Column(db.Float, comment='가속도 X')
    acc_y = db.Column(db.Float, comment='가속도 Y')
    acc_z = db.Column(db.Float, comment='가속도 Z')
    gyro_x = db.Column(db.Float, comment='자이로 X')
    gyro_y = db.Column(db.Float, comment='자이로 Y')
    gyro_z = db.Column(db.Float, comment='자이로 Z')
    
    # 활동 데이터
    steps = db.Column(db.Integer, comment='걸음 수')
    activity_type = db.Column(db.String(20), comment='활동 유형 (walking/running/resting)')
    calories = db.Column(db.Float, comment='칼로리 소모량')
    
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
            'steps': self.steps,
            'activity_type': self.activity_type,
            'calories': self.calories
        }


class Event(db.Model):
    """이벤트(알림) 테이블"""
    __tablename__ = 'events'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    FK_bid = db.Column(db.Integer, db.ForeignKey('bands.id'), nullable=False, index=True)
    datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    event_type = db.Column(db.String(50), nullable=False, comment='이벤트 유형')
    event_level = db.Column(db.Integer, default=1, comment='심각도 (1:정보, 2:주의, 3:경고, 4:긴급)')
    value = db.Column(db.Float, comment='관련 수치')
    message = db.Column(db.String(255), comment='이벤트 메시지')
    
    # 위치 정보 (이벤트 발생 시점)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    
    # 처리 상태
    is_read = db.Column(db.Boolean, default=False, comment='읽음 여부')
    is_resolved = db.Column(db.Boolean, default=False, comment='해결 여부')
    resolved_at = db.Column(db.DateTime, comment='해결 시간')
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'), comment='해결자')
    
    # SMS 발송 여부
    sms_sent = db.Column(db.Boolean, default=False)
    sms_sent_at = db.Column(db.DateTime)
    
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
