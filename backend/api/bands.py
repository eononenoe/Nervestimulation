# -*- coding: utf-8 -*-
"""
밴드(디바이스) 관리 API 모듈
스마트밴드 정보 조회, 관리
"""

from flask import Blueprint, jsonify, request, g, current_app
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from backend.db.models import db, Band, SensorData, Event, NervestimulationStatus
from backend.utils import token_required, admin_required, success_response, error_response, paginate_query

bands_bp = Blueprint('bands', __name__)


@bands_bp.route('/list', methods=['GET'])
@token_required
def get_band_list():
    """
    밴드 목록 조회
    
    GET /api/Wellsafer/v1/bands/list?include_offline=true
    """
    include_offline = request.args.get('include_offline', 'true').lower() == 'true'

    query = Band.query  # is_active는 @property라서 필터링 제거

    if not include_offline:
        query = query.filter_by(connect_state=1)

    # wearer_name은 @property라서 name으로 정렬
    bands = query.order_by(Band.connect_state.desc(), Band.name).all()
    
    result = []
    for band in bands:
        # 최신 센서 데이터
        latest_sensor = SensorData.query.filter_by(FK_bid=band.id)\
            .order_by(SensorData.datetime.desc()).first()

        band_dict = band.to_dict()

        if latest_sensor:
            band_dict['latest_hr'] = latest_sensor.hr
            band_dict['latest_spo2'] = latest_sensor.spo2
            band_dict['battery'] = latest_sensor.battery_level or 0
            band_dict['last_data_at'] = latest_sensor.datetime.isoformat()
            current_app.logger.info(f"Band {band.bid} - Found sensor data: hr={latest_sensor.hr}, spo2={latest_sensor.spo2}, battery={latest_sensor.battery_level}")
        else:
            band_dict['latest_hr'] = 0
            band_dict['latest_spo2'] = 0
            band_dict['battery'] = 0
            current_app.logger.info(f"Band {band.bid} (id={band.id}) - No sensor data found")

        result.append(band_dict)
    
    return success_response(result)


@bands_bp.route('/<bid>/detail', methods=['GET'])
@token_required
def get_band_detail(bid):
    """
    밴드 상세 정보 조회
    
    GET /api/Wellsafer/v1/bands/<bid>/detail
    """
    band = Band.query.filter_by(bid=bid, is_active=True).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    # 최신 센서 데이터
    latest_sensor = SensorData.query.filter_by(FK_bid=band.id)\
        .order_by(SensorData.datetime.desc()).first()
    
    # 24시간 통계
    yesterday = datetime.utcnow() - timedelta(days=1)
    stats = db.session.query(
        func.avg(SensorData.hr).label('avg_hr'),
        func.min(SensorData.hr).label('min_hr'),
        func.max(SensorData.hr).label('max_hr'),
        func.avg(SensorData.spo2).label('avg_spo2'),
        func.sum(SensorData.steps).label('total_steps'),
        func.sum(SensorData.calories).label('total_calories')
    ).filter(
        SensorData.FK_bid == band.id,
        SensorData.datetime >= yesterday
    ).first()
    
    # 최근 이벤트
    recent_events = Event.query.filter_by(FK_bid=band.id)\
        .order_by(Event.datetime.desc()).limit(10).all()
    
    # 진행 중인 자극 세션
    active_stim = NervestimulationStatus.query.filter_by(
        FK_bid=band.id,
        status=1
    ).first()
    
    return success_response({
        'band': band.to_dict(),
        'latest_sensor': latest_sensor.to_dict() if latest_sensor else None,
        'statistics': {
            'avg_hr': round(stats.avg_hr, 1) if stats.avg_hr else None,
            'min_hr': stats.min_hr,
            'max_hr': stats.max_hr,
            'avg_spo2': round(stats.avg_spo2, 1) if stats.avg_spo2 else None,
            'total_steps': stats.total_steps or 0,
            'total_calories': round(stats.total_calories, 1) if stats.total_calories else 0
        },
        'recent_events': [e.to_dict() for e in recent_events],
        'active_stimulation': active_stim.to_dict() if active_stim else None
    })


@bands_bp.route('/<bid>/sensor-data', methods=['GET'])
@token_required
def get_sensor_data(bid):
    """
    센서 데이터 조회
    
    GET /api/Wellsafer/v1/bands/<bid>/sensor-data?limit=100&start=&end=
    """
    band = Band.query.filter_by(bid=bid, is_active=True).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    limit = request.args.get('limit', 100, type=int)
    limit = min(1000, max(1, limit))
    
    start = request.args.get('start')
    end = request.args.get('end')
    
    query = SensorData.query.filter_by(FK_bid=band.id)
    
    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            query = query.filter(SensorData.datetime >= start_dt)
        except ValueError:
            pass
    
    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
            query = query.filter(SensorData.datetime <= end_dt)
        except ValueError:
            pass
    
    data = query.order_by(SensorData.datetime.desc()).limit(limit).all()
    
    return success_response([d.to_dict() for d in data])


@bands_bp.route('/<bid>/location', methods=['GET'])
@token_required
def get_band_location(bid):
    """
    밴드 위치 정보 조회
    
    GET /api/Wellsafer/v1/bands/<bid>/location
    """
    band = Band.query.filter_by(bid=bid, is_active=True).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    return success_response({
        'bid': band.bid,
        'latitude': band.latitude,
        'longitude': band.longitude,
        'address': band.address,
        'location_type': band.location_type,
        'updated_at': band.updated_at.isoformat() if band.updated_at else None
    })


@bands_bp.route('/<bid>/events', methods=['GET'])
@token_required
def get_band_events(bid):
    """
    밴드 이벤트 목록 조회
    
    GET /api/Wellsafer/v1/bands/<bid>/events?page=1&per_page=20&level=
    """
    band = Band.query.filter_by(bid=bid, is_active=True).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    level = request.args.get('level', type=int)
    
    query = Event.query.filter_by(FK_bid=band.id)

    if level:
        # event_level is a property, map to actual type column
        if level == 4:  # SOS, fall
            query = query.filter(Event.type.in_([6, 7]))
        elif level == 3:  # Vital signs abnormal
            query = query.filter(Event.type.in_([8, 9, 10]))
        elif level == 1:  # Other
            query = query.filter(~Event.type.in_([6, 7, 8, 9, 10]))
    
    query = query.order_by(Event.datetime.desc())
    
    result = paginate_query(query, page, per_page)
    
    return success_response({
        'events': [e.to_dict() for e in result['items']],
        'pagination': {
            'page': result['page'],
            'per_page': result['per_page'],
            'total': result['total'],
            'pages': result['pages'],
            'has_prev': result['has_prev'],
            'has_next': result['has_next']
        }
    })


# ============================================================
# 밴드 관리 (관리자)
# ============================================================

@bands_bp.route('', methods=['POST'])
@admin_required
def create_band():
    """
    밴드 등록 (관리자 전용)
    
    POST /api/Wellsafer/v1/bands
    {
        "bid": "467191213660619",
        "wearer_name": "홍길동",
        "wearer_phone": "01012345678",
        "guardian_phone": "01087654321"
    }
    """
    data = request.get_json()
    
    if not data or 'bid' not in data:
        return error_response('bid is required', 400)
    
    bid = data['bid']
    
    # IMEI 형식 검증
    if len(bid) != 15 or not bid.isdigit():
        return error_response('Invalid bid format (15 digits required)', 400)
    
    # 중복 확인
    if Band.query.filter_by(bid=bid).first():
        return error_response('Band already exists', 400)
    
    band = Band(
        bid=bid,
        wearer_name=data.get('wearer_name'),
        wearer_phone=data.get('wearer_phone'),
        guardian_phone=data.get('guardian_phone')
    )
    
    db.session.add(band)
    db.session.commit()
    
    return success_response(band.to_dict(), status_code=201)


@bands_bp.route('/<bid>', methods=['PUT'])
@admin_required
def update_band(bid):
    """
    밴드 정보 수정 (관리자 전용)
    
    PUT /api/Wellsafer/v1/bands/<bid>
    """
    band = Band.query.filter_by(bid=bid).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    data = request.get_json()
    
    if 'wearer_name' in data:
        band.wearer_name = data['wearer_name']
    if 'wearer_phone' in data:
        band.wearer_phone = data['wearer_phone']
    if 'guardian_phone' in data:
        band.guardian_phone = data['guardian_phone']
    
    band.updated_at = datetime.utcnow()
    db.session.commit()
    
    return success_response(band.to_dict())


@bands_bp.route('/<bid>', methods=['DELETE'])
@admin_required
def delete_band(bid):
    """
    밴드 삭제 (비활성화, 관리자 전용)
    
    DELETE /api/Wellsafer/v1/bands/<bid>
    """
    band = Band.query.filter_by(bid=bid).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    band.is_active = False
    band.updated_at = datetime.utcnow()
    db.session.commit()
    
    return success_response(message='Band deleted successfully')


@bands_bp.route('/<bid>/command', methods=['POST'])
@token_required
def send_command(bid):
    """
    밴드에 명령 전송
    
    POST /api/Wellsafer/v1/bands/<bid>/command
    {
        "command": "get_location",
        "params": {}
    }
    """
    band = Band.query.filter_by(bid=bid, is_active=True).first()
    
    if not band:
        return error_response('Band not found', 404)
    
    data = request.get_json()
    command = data.get('command')
    params = data.get('params', {})
    
    if not command:
        return error_response('command is required', 400)
    
    # MQTT로 명령 전송
    from mqtt_client import send_band_command
    success = send_band_command(bid, command, params)
    
    if success:
        return success_response({'command_sent': True})
    else:
        return error_response('Failed to send command', 500)
