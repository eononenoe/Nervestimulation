# -*- coding: utf-8 -*-
"""
대시보드 API 모듈
통계 및 요약 정보 제공
"""

from flask import Blueprint, jsonify, request, g
from datetime import datetime, timedelta
from backend.db.models import db, Band, Event, SensorData, NervestimulationStatus, NervestimulationHist
from backend.utils import token_required, success_response, error_response

dashboard_bp = Blueprint('dashboard', __name__)


def get_dashboard_summary():
    """
    대시보드 요약 데이터 생성
    
    Returns:
        dict: 대시보드 요약 데이터
    """
    # 밴드 통계
    total_bands = Band.query.count()
    online_bands = Band.query.filter_by(connect_state=1).count()
    offline_bands = total_bands - online_bands

    # 오늘 날짜 범위
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # 이벤트 통계
    unread_events = Event.query.filter(Event.action_status == 0).count()
    urgent_events = Event.query.filter(
        Event.type.in_([6, 7, 8, 9, 10]),
        Event.action_status != 2
    ).count()
    
    today_events = Event.query.filter(
        Event.datetime >= today_start,
        Event.datetime < today_end
    ).count()
    
    # 신경자극 통계
    today_sessions = NervestimulationHist.query.filter(
        NervestimulationHist.started_at >= today_start,
        NervestimulationHist.started_at < today_end
    ).count()
    
    active_sessions = NervestimulationStatus.query.filter_by(status=1).count()
    
    # 신경자극기 연결 밴드 수 (stimulator_connected는 @property라서 직접 필터링 불가)
    # 모든 밴드를 가져와서 Python에서 필터링
    all_bands = Band.query.all()
    stimulator_connected = sum(1 for b in all_bands if b.stimulator_connected)
    
    return {
        'total_bands': total_bands,
        'online_bands': online_bands,
        'offline_bands': offline_bands,
        'unread_events': unread_events,
        'urgent_events': urgent_events,
        'today_events': today_events,
        'today_sessions': today_sessions,
        'active_sessions': active_sessions,
        'stimulator_connected': stimulator_connected,
        'timestamp': datetime.utcnow().isoformat()
    }


@dashboard_bp.route('', methods=['GET'])
@token_required
def get_dashboard():
    """
    대시보드 데이터 조회
    
    GET /api/Wellsafer/v1/dashboard
    """
    summary = get_dashboard_summary()
    return success_response(summary)


@dashboard_bp.route('/events', methods=['GET'])
@token_required
def get_dashboard_events():
    """
    대시보드 최근 이벤트 목록
    
    GET /api/Wellsafer/v1/dashboard/events?limit=20
    """
    limit = request.args.get('limit', 20, type=int)
    limit = min(100, max(1, limit))
    
    events = Event.query.order_by(Event.datetime.desc()).limit(limit).all()
    
    # 밴드 정보 조인
    result = []
    for event in events:
        event_dict = event.to_dict()
        band = Band.query.get(event.FK_bid)
        if band:
            event_dict['bid'] = band.bid
            event_dict['wearer_name'] = band.wearer_name
        result.append(event_dict)
    
    return success_response(result)


@dashboard_bp.route('/bands-status', methods=['GET'])
@token_required
def get_bands_status():
    """
    밴드 상태 요약
    
    GET /api/Wellsafer/v1/dashboard/bands-status
    """
    bands = Band.query.all()
    
    result = []
    for band in bands:
        # 최신 센서 데이터
        latest_sensor = SensorData.query.filter_by(FK_bid=band.id)\
            .order_by(SensorData.datetime.desc()).first()
        
        # 최근 24시간 이벤트 수
        yesterday = datetime.utcnow() - timedelta(days=1)
        event_count = Event.query.filter(
            Event.FK_bid == band.id,
            Event.datetime >= yesterday
        ).count()
        
        result.append({
            'bid': band.bid,
            'wearer_name': band.wearer_name,
            'connect_state': band.connect_state,
            'battery': band.battery,
            'stimulator_connected': band.stimulator_connected,
            'latest_hr': latest_sensor.hr if latest_sensor else None,
            'latest_spo2': latest_sensor.spo2 if latest_sensor else None,
            'last_data_at': band.last_data_at.isoformat() if band.last_data_at else None,
            'event_count_24h': event_count
        })
    
    return success_response(result)


@dashboard_bp.route('/statistics', methods=['GET'])
@token_required
def get_statistics():
    """
    상세 통계 정보
    
    GET /api/Wellsafer/v1/dashboard/statistics?days=7
    """
    days = request.args.get('days', 7, type=int)
    days = min(30, max(1, days))
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # 일별 이벤트 통계 (type 6,7,8,9,10이 urgent)
    daily_events = db.session.query(
        db.func.date(Event.datetime).label('date'),
        db.func.count(Event.id).label('count'),
        db.func.sum(db.case((Event.type.in_([6, 7, 8, 9, 10]), 1), else_=0)).label('urgent_count')
    ).filter(
        Event.datetime >= start_date
    ).group_by(
        db.func.date(Event.datetime)
    ).all()
    
    # 일별 신경자극 통계
    daily_stimulations = db.session.query(
        db.func.date(NervestimulationHist.started_at).label('date'),
        db.func.count(NervestimulationHist.id).label('count'),
        db.func.avg(NervestimulationHist.duration_actual).label('avg_duration')
    ).filter(
        NervestimulationHist.started_at >= start_date
    ).group_by(
        db.func.date(NervestimulationHist.started_at)
    ).all()
    
    return success_response({
        'days': days,
        'daily_events': [
            {
                'date': str(row.date),
                'count': row.count,
                'urgent_count': row.urgent_count or 0
            }
            for row in daily_events
        ],
        'daily_stimulations': [
            {
                'date': str(row.date),
                'count': row.count,
                'avg_duration': round(row.avg_duration, 1) if row.avg_duration else 0
            }
            for row in daily_stimulations
        ]
    })


@dashboard_bp.route('/alerts-summary', methods=['GET'])
@token_required
def get_alerts_summary():
    """
    알림 요약
    
    GET /api/Wellsafer/v1/dashboard/alerts-summary
    """
    # 이벤트 유형별 통계 (type 컬럼 사용)
    type_stats = db.session.query(
        Event.type,
        db.func.count(Event.id).label('count')
    ).filter(
        Event.datetime >= datetime.utcnow() - timedelta(days=7)
    ).group_by(Event.type).all()

    # 레벨별 통계 - type을 level로 매핑
    level_stats_raw = db.session.query(
        Event.type,
        db.func.count(Event.id).label('count')
    ).filter(
        Event.datetime >= datetime.utcnow() - timedelta(days=7)
    ).group_by(Event.type).all()

    # type을 event_level로 변환 (6,7=level 4, 8,9,10=level 3)
    level_counts = {}
    for row in level_stats_raw:
        if row.type in [6, 7]:
            level = 4
        elif row.type in [8, 9, 10]:
            level = 3
        else:
            level = 1
        level_counts[level] = level_counts.get(level, 0) + row.count

    # 미해결 이벤트 (action_status != 2)
    unresolved = Event.query.filter(Event.action_status != 2).count()
    
    # type을 event_type 문자열로 변환
    type_map = {6: 'sos', 7: 'fall', 8: 'hr_high', 9: 'hr_low', 10: 'spo2_low'}
    by_type = {type_map.get(row.type, 'unknown'): row.count for row in type_stats}

    return success_response({
        'by_type': by_type,
        'by_level': level_counts,
        'unresolved_count': unresolved
    })


@dashboard_bp.route('/stimulation-summary', methods=['GET'])
@token_required
def get_stimulation_summary():
    """
    신경자극 요약 통계
    
    GET /api/Wellsafer/v1/dashboard/stimulation-summary
    """
    # 최근 30일 통계
    start_date = datetime.utcnow() - timedelta(days=30)
    
    # 총 세션 수
    total_sessions = NervestimulationHist.query.filter(
        NervestimulationHist.started_at >= start_date
    ).count()
    
    # 완료된 세션
    completed_sessions = NervestimulationHist.query.filter(
        NervestimulationHist.started_at >= start_date,
        NervestimulationHist.end_reason == 'completed'
    ).count()
    
    # 평균 자극 시간
    avg_duration = db.session.query(
        db.func.avg(NervestimulationHist.duration_actual)
    ).filter(
        NervestimulationHist.started_at >= start_date,
        NervestimulationHist.duration_actual.isnot(None)
    ).scalar()
    
    # 평균 혈압 변화
    bp_change_stats = db.session.query(
        db.func.avg(NervestimulationHist.bp_change).label('avg_change'),
        db.func.count(NervestimulationHist.id).label('count')
    ).filter(
        NervestimulationHist.started_at >= start_date,
        NervestimulationHist.bp_change.isnot(None)
    ).first()
    
    # 현재 진행 중인 세션
    active_sessions = NervestimulationStatus.query.filter_by(status=1).all()
    
    return success_response({
        'period_days': 30,
        'total_sessions': total_sessions,
        'completed_sessions': completed_sessions,
        'completion_rate': round(completed_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0,
        'avg_duration_minutes': round(avg_duration, 1) if avg_duration else 0,
        'avg_bp_change': round(bp_change_stats.avg_change, 1) if bp_change_stats.avg_change else 0,
        'bp_change_sample_count': bp_change_stats.count if bp_change_stats else 0,
        'active_sessions': [
            {
                'session_id': s.session_id,
                'bid': Band.query.get(s.FK_bid).bid if Band.query.get(s.FK_bid) else None,
                'started_at': s.started_at.isoformat() if s.started_at else None,
                'stim_level': s.stim_level
            }
            for s in active_sessions
        ]
    })
