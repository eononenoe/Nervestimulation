# -*- coding: utf-8 -*-
"""
신경자극 API 모듈
자극 세션 관리, 혈압 기록
"""

from flask import Blueprint, jsonify, request, g
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from backend.db.models import (
    db, Band, NervestimulationStatus, NervestimulationHist, BloodPressure
)
from backend.utils import (
    token_required, success_response, error_response,
    generate_session_id, validate_stim_level, paginate_query
)

nervestim_bp = Blueprint('nervestim', __name__)


# ============================================================
# 자극 세션 관리
# ============================================================

@nervestim_bp.route('/sessions', methods=['GET'])
@token_required
def get_sessions():
    """
    자극 세션 목록 조회
    
    GET /api/Wellsafer/v1/nervestim/sessions?bid=&status=&limit=20
    """
    bid = request.args.get('bid')
    status = request.args.get('status', type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(100, max(1, limit))
    
    query = NervestimulationStatus.query
    
    if bid:
        band = Band.query.filter_by(bid=bid).first()
        if band:
            query = query.filter_by(FK_bid=band.id)
    
    if status is not None:
        query = query.filter_by(status=status)
    
    sessions = query.order_by(NervestimulationStatus.created_at.desc()).limit(limit).all()
    
    result = []
    for session in sessions:
        session_dict = session.to_dict()
        band = Band.query.get(session.FK_bid)
        if band:
            session_dict['bid'] = band.bid
            session_dict['wearer_name'] = band.wearer_name
        result.append(session_dict)
    
    return success_response(result)


@nervestim_bp.route('/sessions/<session_id>', methods=['GET'])
@token_required
def get_session(session_id):
    """
    자극 세션 상세 조회
    
    GET /api/Wellsafer/v1/nervestim/sessions/<session_id>
    """
    session = NervestimulationStatus.query.filter_by(session_id=session_id).first()
    
    if not session:
        return error_response('Session not found', 404)
    
    session_dict = session.to_dict()
    
    band = Band.query.get(session.FK_bid)
    if band:
        session_dict['bid'] = band.bid
        session_dict['wearer_name'] = band.wearer_name
    
    # 혈압 기록
    if session.bp_before_id:
        bp_before = BloodPressure.query.get(session.bp_before_id)
        session_dict['bp_before'] = bp_before.to_dict() if bp_before else None
    
    if session.bp_after_id:
        bp_after = BloodPressure.query.get(session.bp_after_id)
        session_dict['bp_after'] = bp_after.to_dict() if bp_after else None
    
    return success_response(session_dict)


@nervestim_bp.route('/sessions', methods=['POST'])
@token_required
def create_session():
    """
    새 자극 세션 생성
    
    POST /api/Wellsafer/v1/nervestim/sessions
    {
        "bid": "467191213660619",
        "stim_level": 3,
        "frequency": 10,
        "duration": 20,
        "target_nerve": "median"
    }
    """
    data = request.get_json()
    
    if not data or 'bid' not in data:
        return error_response('bid is required', 400)
    
    band = Band.query.filter_by(bid=data['bid'], is_active=True).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    if not band.stimulator_connected:
        return error_response('Stimulator not connected', 400)
    
    # 이미 진행 중인 세션 확인
    active = NervestimulationStatus.query.filter_by(FK_bid=band.id, status=1).first()
    if active:
        return error_response('Another session is already active', 400)
    
    # 자극 강도 검증
    stim_level = data.get('stim_level', 3)
    if not validate_stim_level(stim_level):
        return error_response('Invalid stim_level (1-10)', 400)
    
    session = NervestimulationStatus(
        session_id=generate_session_id(),
        FK_bid=band.id,
        stimulator_id=band.stimulator_id,
        status=0,  # 대기
        stim_level=stim_level,
        frequency=data.get('frequency', 10.0),
        pulse_width=data.get('pulse_width', 200),
        duration=data.get('duration', 20),
        target_nerve=data.get('target_nerve', 'median'),
        stim_mode=data.get('stim_mode', 'manual')
    )
    
    db.session.add(session)
    db.session.commit()
    
    return success_response({
        'session_id': session.session_id,
        'status': session.status
    }, status_code=201)


@nervestim_bp.route('/sessions/<session_id>/start', methods=['POST'])
@token_required
def start_session(session_id):
    """
    자극 세션 시작
    
    POST /api/Wellsafer/v1/nervestim/sessions/<session_id>/start
    {
        "systolic": 140,  # 자극 전 혈압 (선택)
        "diastolic": 90,
        "pulse": 72
    }
    """
    session = NervestimulationStatus.query.filter_by(session_id=session_id).first()
    
    if not session:
        return error_response('Session not found', 404)
    
    if session.status != 0:
        return error_response('Session cannot be started (not in waiting status)', 400)
    
    band = Band.query.get(session.FK_bid)
    
    if not band or not band.stimulator_connected:
        return error_response('Stimulator not connected', 400)
    
    data = request.get_json() or {}
    
    # 자극 전 혈압 기록 (선택)
    if data.get('systolic') and data.get('diastolic'):
        bp = BloodPressure(
            FK_bid=band.id,
            datetime=datetime.utcnow(),
            systolic=data['systolic'],
            diastolic=data['diastolic'],
            pulse=data.get('pulse'),
            measurement_type='pre_stim',
            session_id=session_id
        )
        db.session.add(bp)
        db.session.flush()
        session.bp_before_id = bp.id
    
    # 세션 시작
    session.status = 1  # 진행중
    session.started_at = datetime.utcnow()
    
    db.session.commit()
    
    # MQTT로 자극기에 시작 명령 전송
    from mqtt_client import send_stim_control
    send_stim_control(band.bid, session_id, 'start', level=session.stim_level)
    
    return success_response({
        'session_id': session_id,
        'status': session.status,
        'started_at': session.started_at.isoformat()
    })


@nervestim_bp.route('/sessions/<session_id>/stop', methods=['POST'])
@token_required
def stop_session(session_id):
    """
    자극 세션 중지
    
    POST /api/Wellsafer/v1/nervestim/sessions/<session_id>/stop
    {
        "systolic": 130,  # 자극 후 혈압 (선택)
        "diastolic": 85,
        "pulse": 68
    }
    """
    session = NervestimulationStatus.query.filter_by(session_id=session_id).first()
    
    if not session:
        return error_response('Session not found', 404)
    
    if session.status != 1:
        return error_response('Session is not running', 400)
    
    band = Band.query.get(session.FK_bid)
    data = request.get_json() or {}
    
    # 자극 후 혈압 기록 (선택)
    bp_change = None
    if data.get('systolic') and data.get('diastolic'):
        bp = BloodPressure(
            FK_bid=band.id,
            datetime=datetime.utcnow(),
            systolic=data['systolic'],
            diastolic=data['diastolic'],
            pulse=data.get('pulse'),
            measurement_type='post_stim',
            session_id=session_id
        )
        db.session.add(bp)
        db.session.flush()
        session.bp_after_id = bp.id
        
        # 혈압 변화량 계산
        if session.bp_before_id:
            bp_before = BloodPressure.query.get(session.bp_before_id)
            if bp_before:
                bp_change = bp_before.systolic - data['systolic']
    
    # 세션 종료
    session.status = 2  # 완료
    session.ended_at = datetime.utcnow()
    session.end_reason = 'user_stop'
    
    # 히스토리 저장
    duration_actual = None
    if session.started_at:
        duration_actual = int((session.ended_at - session.started_at).total_seconds() / 60)
    
    bp_before = BloodPressure.query.get(session.bp_before_id) if session.bp_before_id else None
    bp_after = BloodPressure.query.get(session.bp_after_id) if session.bp_after_id else None
    
    history = NervestimulationHist(
        session_id=session.session_id,
        FK_bid=session.FK_bid,
        stimulator_id=session.stimulator_id,
        stim_level=session.stim_level,
        frequency=session.frequency,
        pulse_width=session.pulse_width,
        duration_planned=session.duration,
        duration_actual=duration_actual,
        started_at=session.started_at,
        ended_at=session.ended_at,
        end_reason=session.end_reason,
        bp_systolic_before=bp_before.systolic if bp_before else None,
        bp_diastolic_before=bp_before.diastolic if bp_before else None,
        bp_systolic_after=bp_after.systolic if bp_after else None,
        bp_diastolic_after=bp_after.diastolic if bp_after else None,
        bp_change=bp_change
    )
    
    db.session.add(history)
    db.session.commit()
    
    # MQTT로 자극기에 중지 명령 전송
    from mqtt_client import send_stim_control
    send_stim_control(band.bid, session_id, 'stop')
    
    return success_response({
        'session_id': session_id,
        'status': session.status,
        'duration_actual': duration_actual,
        'bp_change': bp_change
    })


@nervestim_bp.route('/sessions/<session_id>/level', methods=['PUT'])
@token_required
def change_level(session_id):
    """
    자극 강도 변경
    
    PUT /api/Wellsafer/v1/nervestim/sessions/<session_id>/level
    {
        "level": 5
    }
    """
    session = NervestimulationStatus.query.filter_by(session_id=session_id).first()
    
    if not session:
        return error_response('Session not found', 404)
    
    if session.status != 1:
        return error_response('Session is not running', 400)
    
    data = request.get_json()
    level = data.get('level')
    
    if not validate_stim_level(level):
        return error_response('Invalid level (1-10)', 400)
    
    session.stim_level = level
    db.session.commit()
    
    # MQTT로 강도 변경 명령 전송
    band = Band.query.get(session.FK_bid)
    from mqtt_client import send_stim_control
    send_stim_control(band.bid, session_id, 'set_level', level=level)
    
    return success_response({
        'session_id': session_id,
        'stim_level': level
    })


# ============================================================
# 혈압 관리
# ============================================================

@nervestim_bp.route('/bloodpressure', methods=['GET'])
@token_required
def get_blood_pressure():
    """
    혈압 기록 조회
    
    GET /api/Wellsafer/v1/nervestim/bloodpressure?bid=&limit=50
    """
    bid = request.args.get('bid')
    limit = request.args.get('limit', 50, type=int)
    limit = min(200, max(1, limit))
    
    if not bid:
        return error_response('bid is required', 400)
    
    band = Band.query.filter_by(bid=bid, is_active=True).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    records = BloodPressure.query.filter_by(FK_bid=band.id)\
        .order_by(BloodPressure.datetime.desc()).limit(limit).all()
    
    # 통계
    month_ago = datetime.utcnow() - timedelta(days=30)
    stats = db.session.query(
        func.avg(BloodPressure.systolic).label('avg_systolic'),
        func.avg(BloodPressure.diastolic).label('avg_diastolic'),
        func.count(BloodPressure.id).label('total_count')
    ).filter(
        BloodPressure.FK_bid == band.id,
        BloodPressure.datetime >= month_ago
    ).first()
    
    return success_response({
        'data': [r.to_dict() for r in records],
        'statistics': {
            'avg_systolic': round(stats.avg_systolic, 1) if stats.avg_systolic else None,
            'avg_diastolic': round(stats.avg_diastolic, 1) if stats.avg_diastolic else None,
            'total_count': stats.total_count
        }
    })


@nervestim_bp.route('/bloodpressure', methods=['POST'])
@token_required
def record_blood_pressure():
    """
    혈압 기록 추가
    
    POST /api/Wellsafer/v1/nervestim/bloodpressure
    {
        "bid": "467191213660619",
        "systolic": 135,
        "diastolic": 88,
        "pulse": 70,
        "measurement_type": "manual"
    }
    """
    data = request.get_json()
    
    if not data:
        return error_response('Request body is required', 400)
    
    required = ['bid', 'systolic', 'diastolic']
    for field in required:
        if field not in data:
            return error_response(f'{field} is required', 400)
    
    band = Band.query.filter_by(bid=data['bid'], is_active=True).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    record = BloodPressure(
        FK_bid=band.id,
        datetime=datetime.utcnow(),
        systolic=data['systolic'],
        diastolic=data['diastolic'],
        pulse=data.get('pulse'),
        measurement_type=data.get('measurement_type', 'manual'),
        session_id=data.get('session_id'),
        arm_position=data.get('arm_position'),
        posture=data.get('posture'),
        notes=data.get('notes')
    )
    
    db.session.add(record)
    db.session.commit()
    
    return success_response(record.to_dict(), status_code=201)


# ============================================================
# 자극 히스토리
# ============================================================

@nervestim_bp.route('/history', methods=['GET'])
@token_required
def get_stimulation_history():
    """
    자극 이력 조회
    
    GET /api/Wellsafer/v1/nervestim/history?bid=&page=1&per_page=20
    """
    bid = request.args.get('bid')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = NervestimulationHist.query
    
    if bid:
        band = Band.query.filter_by(bid=bid).first()
        if band:
            query = query.filter_by(FK_bid=band.id)
    
    query = query.order_by(NervestimulationHist.started_at.desc())
    result = paginate_query(query, page, per_page)
    
    history_list = []
    for h in result['items']:
        h_dict = h.to_dict()
        band = Band.query.get(h.FK_bid)
        if band:
            h_dict['bid'] = band.bid
            h_dict['wearer_name'] = band.wearer_name
        history_list.append(h_dict)
    
    return success_response({
        'data': history_list,
        'pagination': {
            'page': result['page'],
            'per_page': result['per_page'],
            'total': result['total'],
            'pages': result['pages']
        }
    })
