# -*- coding: utf-8 -*-
"""
데이터베이스 쓰기 작업 모듈 (INSERT/UPDATE)
"""

from datetime import datetime
# Import 순서 중요: db 패키지를 먼저 import한 후 SQLAlchemy 인스턴스를 import
from backend.db.table import (
    User, Band, SensorData, Event,
    NerveStimSession, NerveStimHistory, BloodPressure
)
from backend import db


# ============================================================
# 센서 데이터 관련
# ============================================================

def insert_sensordata(bid, data):
    """
    센서 데이터 저장
    
    Args:
        bid: 밴드 ID (FK_bid)
        data: 센서 데이터 딕셔너리
    
    Returns:
        int: 삽입된 레코드 ID
    """
    sensor = SensorData(
        FK_bid=bid,
        datetime=data.get('datetime', datetime.utcnow()),
        hr=data.get('hr'),
        spo2=data.get('spo2'),
        hrv_sdnn=data.get('hrv_sdnn'),
        hrv_rmssd=data.get('hrv_rmssd'),
        skin_temp=data.get('skin_temp'),
        acc_x=data.get('acc_x'),
        acc_y=data.get('acc_y'),
        acc_z=data.get('acc_z'),
        gyro_x=data.get('gyro_x'),
        gyro_y=data.get('gyro_y'),
        gyro_z=data.get('gyro_z'),
        steps=data.get('steps'),
        activity_type=data.get('activity_type'),
        calories=data.get('calories')
    )
    
    db.session.add(sensor)
    db.session.commit()
    
    return sensor.id


# ============================================================
# 이벤트 관련
# ============================================================

def insert_event(bid, event_type, event_level, value=None, message=None, lat=None, lng=None):
    """
    이벤트(알림) 저장
    
    Args:
        bid: 밴드 ID
        event_type: 이벤트 유형
        event_level: 심각도 (1-4)
        value: 관련 수치
        message: 이벤트 메시지
        lat: 위도
        lng: 경도
    
    Returns:
        int: 삽입된 이벤트 ID
    """
    event = Event(
        FK_bid=bid,
        datetime=datetime.utcnow(),
        event_type=event_type,
        event_level=event_level,
        value=value,
        message=message,
        latitude=lat,
        longitude=lng
    )
    
    db.session.add(event)
    db.session.commit()
    
    return event.id


def update_event_resolved(event_id, user_id):
    """이벤트 해결 처리"""
    event = Event.query.get(event_id)
    if event:
        event.is_resolved = True
        event.resolved_at = datetime.utcnow()
        event.resolved_by = user_id
        db.session.commit()
        return True
    return False


def update_event_sms_sent(event_id):
    """이벤트 SMS 발송 완료 처리"""
    event = Event.query.get(event_id)
    if event:
        event.sms_sent = True
        event.sms_sent_at = datetime.utcnow()
        db.session.commit()
        return True
    return False


# ============================================================
# 밴드 관련
# ============================================================

def update_band_status(bid, **kwargs):
    """
    밴드 상태 업데이트
    
    Args:
        bid: 밴드 ID
        **kwargs: 업데이트할 필드들 (connect_state, battery, etc.)
    
    Returns:
        int: 영향받은 행 수
    """
    band = Band.query.filter_by(bid=bid).first()
    if not band:
        return 0
    
    for key, value in kwargs.items():
        if hasattr(band, key):
            setattr(band, key, value)
    
    band.updated_at = datetime.utcnow()
    db.session.commit()
    
    return 1


def update_band_location(bid, lat, lng, address=None, location_type='GPS'):
    """밴드 위치 업데이트"""
    band = Band.query.filter_by(bid=bid).first()
    if not band:
        return 0
    
    band.latitude = lat
    band.longitude = lng
    band.address = address
    band.location_type = location_type
    band.updated_at = datetime.utcnow()
    
    db.session.commit()
    return 1


def update_band_last_data(bid):
    """밴드 마지막 데이터 수신 시간 업데이트"""
    band = Band.query.filter_by(bid=bid).first()
    if band:
        band.last_data_at = datetime.utcnow()
        band.connect_state = 1  # 온라인으로 설정
        db.session.commit()
        return 1
    return 0


def update_band_stimulator_connection(bid, connected, stimulator_id=None):
    """밴드의 신경자극기 연결 상태 업데이트"""
    band = Band.query.filter_by(bid=bid).first()
    if band:
        band.stimulator_connected = connected
        band.stimulator_id = stimulator_id if connected else None
        band.updated_at = datetime.utcnow()
        db.session.commit()
        return 1
    return 0


# ============================================================
# 신경자극 세션 관련
# ============================================================

def insert_nervestim_session(bid, session_data):
    """
    신경자극 세션 생성
    
    Args:
        bid: 밴드 ID
        session_data: 세션 데이터 딕셔너리
    
    Returns:
        str: 생성된 세션 ID
    """
    # 세션 ID 생성
    session_id = f"SESSION-{datetime.now().strftime('%Y%m%d%H%M%S')}-{bid}"
    
    session = NerveStimSession(
        session_id=session_id,
        FK_bid=bid,
        stimulator_id=session_data.get('stimulator_id'),
        status=0,  # 대기 상태
        stim_level=session_data.get('stim_level', 1),
        frequency=session_data.get('frequency', 10.0),
        pulse_width=session_data.get('pulse_width', 200),
        duration=session_data.get('duration', 20),
        stim_mode=session_data.get('stim_mode', 'manual'),
        target_nerve=session_data.get('target_nerve', 'median'),
        scheduled_at=session_data.get('scheduled_at')
    )
    
    db.session.add(session)
    db.session.commit()
    
    return session_id


def update_nervestim_status(session_id, status, **kwargs):
    """
    신경자극 세션 상태 업데이트
    
    Args:
        session_id: 세션 ID
        status: 새로운 상태 (0-3)
        **kwargs: 추가 필드 (started_at, ended_at, end_reason)
    
    Returns:
        int: 영향받은 행 수
    """
    session = NerveStimSession.query.filter_by(session_id=session_id).first()
    if not session:
        return 0
    
    session.status = status
    
    for key, value in kwargs.items():
        if hasattr(session, key):
            setattr(session, key, value)
    
    db.session.commit()
    return 1


def update_nervestim_level(session_id, level):
    """자극 강도 변경"""
    session = NerveStimSession.query.filter_by(session_id=session_id).first()
    if session and session.status == 1:  # 진행중일 때만
        session.stim_level = level
        db.session.commit()
        return 1
    return 0


# ============================================================
# 혈압 관련
# ============================================================

def insert_bloodpressure(bid, systolic, diastolic, pulse=None, measurement_type='manual', session_id=None):
    """
    혈압 기록 저장
    
    Args:
        bid: 밴드 ID
        systolic: 수축기 혈압
        diastolic: 이완기 혈압
        pulse: 맥박수
        measurement_type: 측정 유형
        session_id: 연관된 자극 세션 ID
    
    Returns:
        int: 삽입된 레코드 ID
    """
    bp = BloodPressure(
        FK_bid=bid,
        datetime=datetime.utcnow(),
        systolic=systolic,
        diastolic=diastolic,
        pulse=pulse,
        measurement_type=measurement_type,
        session_id=session_id
    )
    
    db.session.add(bp)
    db.session.commit()
    
    return bp.id


def insert_nervestim_history(history_data):
    """
    신경자극 세션 히스토리 저장

    Args:
        history_data: 히스토리 데이터 딕셔너리

    Returns:
        int: 삽입된 레코드 ID
    """
    history = NerveStimHistory(**history_data)

    db.session.add(history)
    db.session.commit()

    return history.id


# ============================================================
# 사용자 관련
# ============================================================

def insert_login_history(user_id, ip_addr, user_agent=None):
    """로그인 이력 저장 (별도 테이블 필요시 구현)"""
    # 간단히 사용자 마지막 로그인 시간 업데이트
    user = User.query.get(user_id)
    if user:
        user.updated_at = datetime.utcnow()
        db.session.commit()
        return user.id
    return None
