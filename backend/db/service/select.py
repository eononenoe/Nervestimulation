# -*- coding: utf-8 -*-
"""
데이터베이스 읽기 작업 모듈 (SELECT)
"""

from datetime import datetime, timedelta
from sqlalchemy import func, desc
# Import 순서 중요: db 패키지를 먼저 import한 후 SQLAlchemy 인스턴스를 import
from backend.db.table import (
    User, Band, SensorData, Event, Group,
    NerveStimSession, NerveStimHistory, BloodPressure, Prescription
)
from backend import db


# ============================================================
# 밴드 관련
# ============================================================

def get_band_by_bid(bid):
    """밴드 ID로 밴드 조회"""
    return Band.query.filter_by(bid=bid, ).first()


def get_band_by_id(band_id):
    """내부 ID로 밴드 조회"""
    return Band.query.filter_by(id=band_id, ).first()


def get_all_bands(include_inactive=False):
    """모든 밴드 목록 조회"""
    query = Band.query
    if not include_inactive:
        query = query.filter_by()
    return query.order_by(Band.id).all()


def get_online_bands():
    """온라인 상태 밴드 목록 조회"""
    return Band.query.filter_by(connect_state=1, ).all()


def get_bands_by_user(user_id):
    """사용자에게 할당된 밴드 목록 조회"""
    from backend.db.table.table_band import UserBand
    
    return db.session.query(Band)\
        .join(UserBand, Band.id == UserBand.band_id)\
        .filter(UserBand.user_id == user_id)\
        .filter(True)\
        .all()


# ============================================================
# 센서 데이터 관련
# ============================================================

def get_latest_sensordata(bid, limit=1):
    """밴드의 최신 센서 데이터 조회"""
    band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
    if not band:
        return []
    
    return SensorData.query\
        .filter_by(FK_bid=band.id)\
        .order_by(desc(SensorData.datetime))\
        .limit(limit)\
        .all()


def get_sensordata_range(bid, start_time, end_time):
    """기간별 센서 데이터 조회"""
    band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
    if not band:
        return []
    
    return SensorData.query\
        .filter_by(FK_bid=band.id)\
        .filter(SensorData.datetime >= start_time)\
        .filter(SensorData.datetime <= end_time)\
        .order_by(SensorData.datetime)\
        .all()


def get_sensordata_statistics(bid, hours=24):
    """센서 데이터 통계 조회"""
    band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
    if not band:
        return None
    
    since = datetime.utcnow() - timedelta(hours=hours)
    
    result = db.session.query(
        func.avg(SensorData.hr).label('avg_hr'),
        func.min(SensorData.hr).label('min_hr'),
        func.max(SensorData.hr).label('max_hr'),
        func.avg(SensorData.spo2).label('avg_spo2'),
        func.min(SensorData.spo2).label('min_spo2'),
        func.sum(SensorData.steps).label('total_steps'),
        func.sum(SensorData.calories).label('total_calories')
    ).filter(
        SensorData.FK_bid == band.id,
        SensorData.datetime >= since
    ).first()
    
    return {
        'avg_hr': round(result.avg_hr, 1) if result.avg_hr else None,
        'min_hr': result.min_hr,
        'max_hr': result.max_hr,
        'avg_spo2': round(result.avg_spo2, 1) if result.avg_spo2 else None,
        'min_spo2': result.min_spo2,
        'total_steps': result.total_steps or 0,
        'total_calories': round(result.total_calories, 1) if result.total_calories else 0
    }


# ============================================================
# 이벤트 관련
# ============================================================

def get_events_by_band(bid, limit=50, unresolved_only=False):
    """밴드별 이벤트 목록 조회"""
    band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
    if not band:
        return []
    
    query = Event.query.filter_by(FK_bid=band.id)

    if unresolved_only:
        query = query.filter(Event.action_status != 2)

    return query.order_by(desc(Event.datetime)).limit(limit).all()


def get_recent_events(limit=100, event_level=None):
    """최근 이벤트 목록 조회"""
    query = Event.query

    if event_level:
        # event_level을 type으로 변환
        # level 1: 모든 이벤트
        # level 2: type >= ?
        # level 3: type in [6,7,8,9,10] (SOS, 낙상, 심박수높음, 심박수낮음, 산소포화도낮음)
        # level 4: type in [6,7] (SOS, 낙상)
        if event_level >= 4:
            query = query.filter(Event.type.in_([6, 7]))
        elif event_level >= 3:
            query = query.filter(Event.type.in_([6, 7, 8, 9, 10]))

    return query.order_by(desc(Event.datetime)).limit(limit).all()


def get_unread_events_count(bid=None):
    """읽지 않은 이벤트 수 조회"""
    query = Event.query.filter_by(action_status=0)
    
    if bid:
        band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
        if band:
            query = query.filter_by(FK_bid=band.id)
    
    return query.count()


# ============================================================
# 신경자극 세션 관련
# ============================================================

def get_nervestim_session(session_id):
    """세션 ID로 신경자극 세션 조회"""
    return NerveStimSession.query.filter_by(session_id=session_id).first()


def get_active_session_by_band(bid):
    """밴드의 현재 진행중인 세션 조회"""
    band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
    if not band:
        return None
    
    return NerveStimSession.query\
        .filter_by(FK_bid=band.id)\
        .filter(NerveStimSession.status.in_([0, 1]))\
        .first()


def get_sessions_by_band(bid, limit=20):
    """밴드의 세션 목록 조회"""
    band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
    if not band:
        return []
    
    return NerveStimSession.query\
        .filter_by(FK_bid=band.id)\
        .order_by(desc(NerveStimSession.created_at))\
        .limit(limit)\
        .all()


def get_session_history(bid, start_date=None, end_date=None, limit=100):
    """신경자극 이력 조회"""
    band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
    if not band:
        return []
    
    query = NerveStimHistory.query.filter_by(FK_bid=band.id)
    
    if start_date:
        query = query.filter(NerveStimHistory.started_at >= start_date)
    if end_date:
        query = query.filter(NerveStimHistory.started_at <= end_date)
    
    return query.order_by(desc(NerveStimHistory.started_at)).limit(limit).all()


# ============================================================
# 혈압 관련
# ============================================================

def get_bloodpressure_by_band(bid, limit=50):
    """밴드별 혈압 기록 조회"""
    band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
    if not band:
        return []
    
    return BloodPressure.query\
        .filter_by(FK_bid=band.id)\
        .order_by(desc(BloodPressure.datetime))\
        .limit(limit)\
        .all()


def get_bloodpressure_statistics(bid, days=30):
    """혈압 통계 조회"""
    band = get_band_by_bid(bid) if isinstance(bid, str) else Band.query.get(bid)
    if not band:
        return None
    
    since = datetime.utcnow() - timedelta(days=days)
    
    result = db.session.query(
        func.avg(BloodPressure.systolic).label('avg_systolic'),
        func.avg(BloodPressure.diastolic).label('avg_diastolic'),
        func.min(BloodPressure.systolic).label('min_systolic'),
        func.max(BloodPressure.systolic).label('max_systolic'),
        func.count(BloodPressure.id).label('total_count')
    ).filter(
        BloodPressure.FK_bid == band.id,
        BloodPressure.datetime >= since
    ).first()
    
    return {
        'avg_systolic': round(result.avg_systolic, 1) if result.avg_systolic else None,
        'avg_diastolic': round(result.avg_diastolic, 1) if result.avg_diastolic else None,
        'min_systolic': result.min_systolic,
        'max_systolic': result.max_systolic,
        'total_count': result.total_count
    }


# ============================================================
# 사용자 관련
# ============================================================

def get_user_by_id(user_id):
    """사용자 ID로 조회"""
    return User.query.filter_by(username=user_id).first()


def get_user_by_pk(pk):
    """내부 ID(PK)로 사용자 조회"""
    return User.query.filter_by(id=pk).first()


def get_all_users(include_inactive=False):
    """모든 사용자 목록"""
    query = User.query
    # Note: is_active is a property, not a column, so we don't filter by it
    return query.order_by(User.id).all()


# ============================================================
# 대시보드용 집계
# ============================================================

def get_dashboard_statistics():
    """대시보드용 통계 데이터 조회"""
    total_bands = Band.query.count()
    online_bands = Band.query.filter_by(connect_state=1).count()
    unread_events = Event.query.filter_by(action_status=0).count()
    # type: 6=SOS, 7=낙상, 8=심박수높음, 9=심박수낮음, 10=산소포화도낮음 (event_level >= 3)
    urgent_events = Event.query.filter(
        Event.action_status != 2,
        Event.type.in_([6, 7, 8, 9, 10])
    ).count()
    
    # 오늘의 자극 세션 수
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sessions = NerveStimSession.query\
        .filter(NerveStimSession.created_at >= today_start)\
        .count()
    
    # 진행중인 세션 수
    active_sessions = NerveStimSession.query\
        .filter_by(status=1)\
        .count()
    
    return {
        'total_bands': total_bands,
        'online_bands': online_bands,
        'offline_bands': total_bands - online_bands,
        'unread_events': unread_events,
        'urgent_events': urgent_events,
        'today_sessions': today_sessions,
        'active_sessions': active_sessions
    }
