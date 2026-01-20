# -*- coding: utf-8 -*-
"""
밴드/사용자 관련 커스텀 API
대시보드, 인증, 위치 조회 등 복잡한 비즈니스 로직 처리
"""

from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import bcrypt
from datetime import datetime, timedelta

from backend import db
from backend.db.table import User, Band, SensorData, Event
from backend.db.service import query, select

band_bp = Blueprint('band', __name__)


# ============================================================
# 인증 데코레이터
# ============================================================

def token_required(f):
    """JWT 토큰 인증 데코레이터"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    
    return decorated


def admin_required(f):
    """관리자 권한 체크 데코레이터"""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if request.current_user.get('level', 99) > 1:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    
    return decorated


# ============================================================
# 인증 API
# ============================================================

@band_bp.route('/auth/login', methods=['POST'])
def login():
    """
    로그인 API
    
    Request Body:
        user_id: 사용자 ID
        password: 비밀번호
    
    Response:
        token: JWT 액세스 토큰
        user: 사용자 정보
    """
    data = request.get_json()
    # 'user_id' 또는 'username' 모두 허용
    user_id = data.get('user_id') or data.get('username')
    password = data.get('password')

    if not user_id or not password:
        return jsonify({'error': 'user_id and password required'}), 400

    # 데이터베이스 스키마는 'username' 컬럼 사용
    user = User.query.filter_by(username=user_id).first()
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # 비밀번호 검증
    if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # JWT 토큰 생성
    payload = {
        'user_id': user.id,
        'user_name': user.name,
        'level': user.permission if hasattr(user, 'permission') else 2,
        'exp': datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
    }

    token = jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )

    # 사용자 정보 응답
    user_data = {
        'id': user.id,
        'username': user.username,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'permission': user.permission if hasattr(user, 'permission') else 2
    }

    return jsonify({
        'success': True,
        'token': token,
        'user': user_data
    })


@band_bp.route('/auth/logout', methods=['POST'])
@token_required
def logout():
    """로그아웃 API"""
    # 토큰 무효화는 클라이언트에서 처리 (토큰 삭제)
    # 서버에서 블랙리스트 관리 필요시 별도 구현
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@band_bp.route('/auth/me', methods=['GET'])
@token_required
def get_current_user():
    """현재 로그인 사용자 정보 조회"""
    user = select.get_user_by_pk(request.current_user['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'success': True, 'user': user.to_dict()})


# ============================================================
# 대시보드 API
# ============================================================

@band_bp.route('/dashboard', methods=['GET'])
@token_required
def get_dashboard():
    """
    대시보드 통계 API
    
    Response:
        total_bands: 전체 밴드 수
        online_bands: 온라인 밴드 수
        unread_events: 읽지 않은 이벤트 수
        urgent_events: 긴급 이벤트 수
        today_sessions: 오늘 자극 세션 수
        active_sessions: 진행중 세션 수
    """
    stats = select.get_dashboard_statistics()
    return jsonify({'success': True, 'data': stats})


@band_bp.route('/dashboard/events', methods=['GET'])
@token_required
def get_dashboard_events():
    """대시보드용 최근 이벤트 목록"""
    limit = request.args.get('limit', 20, type=int)
    level = request.args.get('level', None, type=int)

    events = select.get_recent_events(limit=limit, event_level=level)

    # 각 이벤트에 밴드 정보 추가
    result = []
    for event in events:
        event_dict = event.to_dict()
        # relationship backref를 사용하여 밴드 정보 가져오기
        band = event.band
        if band:
            event_dict['bid'] = band.bid
            event_dict['wearer_name'] = band.wearer_name
        else:
            # 밴드를 찾을 수 없는 경우 FK_bid를 bid로 사용
            event_dict['bid'] = event.FK_bid
            event_dict['wearer_name'] = f'Band #{event.FK_bid}' if event.FK_bid else 'Unknown'
        result.append(event_dict)

    return jsonify({
        'success': True,
        'data': result
    })


# ============================================================
# 밴드 API
# ============================================================

@band_bp.route('/bands/list', methods=['GET'])
@token_required
def get_bands_list():
    """밴드 목록 조회"""
    include_offline = request.args.get('include_offline', 'true').lower() == 'true'

    if include_offline:
        bands = select.get_all_bands()
    else:
        bands = select.get_online_bands()

    # 각 밴드에 최신 센서 데이터 추가
    result = []
    for band in bands:
        band_dict = band.to_dict()

        # 최신 센서 데이터 조회
        latest_sensor = SensorData.query.filter_by(FK_bid=band.id)\
            .order_by(SensorData.datetime.desc()).first()

        if latest_sensor:
            band_dict['latest_hr'] = latest_sensor.hr
            band_dict['latest_spo2'] = latest_sensor.spo2
            band_dict['battery'] = latest_sensor.battery_level or 0
            current_app.logger.info(f"Band {band.bid} - HR: {latest_sensor.hr}, SpO2: {latest_sensor.spo2}, Battery: {latest_sensor.battery_level}")
        else:
            band_dict['latest_hr'] = 0
            band_dict['latest_spo2'] = 0
            band_dict['battery'] = 0

        result.append(band_dict)

    return jsonify({
        'success': True,
        'data': result,
        'total': len(result)
    })


@band_bp.route('/bands/<bid>/detail', methods=['GET'])
@token_required
def get_band_detail(bid):
    """밴드 상세 정보 조회"""
    band = select.get_band_by_bid(bid)
    
    if not band:
        return jsonify({'error': 'Band not found'}), 404
    
    # 최신 센서 데이터
    latest_data = select.get_latest_sensordata(band.id, limit=1)
    
    # 통계
    stats = select.get_sensordata_statistics(band.id, hours=24)
    
    # 최근 이벤트
    events = select.get_events_by_band(band.id, limit=10)
    
    return jsonify({
        'success': True,
        'data': {
            'band': band.to_dict(),
            'latest_sensor': latest_data[0].to_dict() if latest_data else None,
            'statistics': stats,
            'recent_events': [e.to_dict() for e in events]
        }
    })


@band_bp.route('/bands/<bid>/sensor-data', methods=['GET'])
@token_required
def get_band_sensor_data(bid):
    """밴드 센서 데이터 조회"""
    band = select.get_band_by_bid(bid)
    
    if not band:
        return jsonify({'error': 'Band not found'}), 404
    
    # 쿼리 파라미터
    limit = request.args.get('limit', 100, type=int)
    start = request.args.get('start')  # ISO format
    end = request.args.get('end')
    
    if start and end:
        start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
        data = select.get_sensordata_range(band.id, start_dt, end_dt)
    else:
        data = select.get_latest_sensordata(band.id, limit=limit)
    
    return jsonify({
        'success': True,
        'data': [d.to_dict() for d in data]
    })


@band_bp.route('/bands/<bid>/location', methods=['GET'])
@token_required
def get_band_location(bid):
    """밴드 현재 위치 조회"""
    band = select.get_band_by_bid(bid)
    
    if not band:
        return jsonify({'error': 'Band not found'}), 404
    
    return jsonify({
        'success': True,
        'data': {
            'bid': band.bid,
            'latitude': band.latitude,
            'longitude': band.longitude,
            'address': band.address,
            'location_type': band.location_type,
            'updated_at': band.updated_at.isoformat() if band.updated_at else None
        }
    })


@band_bp.route('/bands/<bid>/events', methods=['GET'])
@token_required
def get_band_events(bid):
    """밴드 이벤트 목록 조회"""
    band = select.get_band_by_bid(bid)
    
    if not band:
        return jsonify({'error': 'Band not found'}), 404
    
    limit = request.args.get('limit', 50, type=int)
    unresolved = request.args.get('unresolved', 'false').lower() == 'true'
    
    events = select.get_events_by_band(band.id, limit=limit, unresolved_only=unresolved)
    
    return jsonify({
        'success': True,
        'data': [e.to_dict() for e in events]
    })


# ============================================================
# 이벤트 처리 API
# ============================================================

@band_bp.route('/events/<int:event_id>/resolve', methods=['POST'])
@token_required
def resolve_event(event_id):
    """이벤트 해결 처리"""
    user_id = request.current_user['user_id']
    
    result = query.update_event_resolved(event_id, user_id)
    
    if result:
        return jsonify({'success': True, 'message': 'Event resolved'})
    else:
        return jsonify({'error': 'Event not found'}), 404


@band_bp.route('/events/<int:event_id>/read', methods=['POST'])
@token_required
def mark_event_read(event_id):
    """이벤트 읽음 처리"""
    event = Event.query.get(event_id)
    
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    event.is_read = True
    db.session.commit()
    
    return jsonify({'success': True})
