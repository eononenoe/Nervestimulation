# -*- coding: utf-8 -*-
"""
Socket.IO 이벤트 핸들러 모듈
실시간 데이터 스트리밍 및 클라이언트 통신
"""

from flask import request
from flask_socketio import emit, join_room, leave_room, rooms
from datetime import datetime


def register_socket_handlers(socketio, app):
    """
    Socket.IO 이벤트 핸들러 등록
    
    Args:
        socketio: Socket.IO 인스턴스
        app: Flask 애플리케이션
    """
    
    @socketio.on('connect')
    def handle_connect():
        """클라이언트 연결"""
        client_id = request.sid
        app.logger.info(f"Client connected: {client_id}")
        emit('connected', {'sid': client_id, 'timestamp': datetime.utcnow().isoformat()})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """클라이언트 연결 해제"""
        client_id = request.sid
        app.logger.info(f"Client disconnected: {client_id}")
    
    @socketio.on('subscribe_dashboard')
    def handle_subscribe_dashboard():
        """대시보드 구독 - 전체 요약 정보 수신"""
        join_room('dashboard')
        app.logger.debug(f"Client {request.sid} subscribed to dashboard")
        
        # 현재 대시보드 데이터 전송
        from api.dashboard import get_dashboard_summary
        with app.app_context():
            summary = get_dashboard_summary()
            emit('dashboard_data', summary)
    
    @socketio.on('unsubscribe_dashboard')
    def handle_unsubscribe_dashboard():
        """대시보드 구독 해제"""
        leave_room('dashboard')
    
    @socketio.on('subscribe_band')
    def handle_subscribe_band(data):
        """특정 밴드 데이터 구독"""
        bid = data.get('bid')
        if not bid:
            emit('error', {'message': 'bid is required'})
            return
            
        room = f'band_{bid}'
        join_room(room)
        app.logger.debug(f"Client {request.sid} subscribed to band {bid}")
        
        # 현재 밴드 상태 전송
        from backend.db.models import Band, SensorData
        with app.app_context():
            band = Band.query.filter_by(bid=bid).first()
            if band:
                # 최신 센서 데이터
                latest_sensor = SensorData.query.filter_by(FK_bid=band.id)\
                    .order_by(SensorData.datetime.desc()).first()
                
                emit('band_current_state', {
                    'bid': bid,
                    'band': band.to_dict(),
                    'latest_sensor': latest_sensor.to_dict() if latest_sensor else None
                })
    
    @socketio.on('unsubscribe_band')
    def handle_unsubscribe_band(data):
        """밴드 구독 해제"""
        bid = data.get('bid')
        if bid:
            room = f'band_{bid}'
            leave_room(room)
    
    @socketio.on('subscribe_nervestim')
    def handle_subscribe_nervestim(data):
        """신경자극 세션 구독"""
        session_id = data.get('session_id')
        if not session_id:
            emit('error', {'message': 'session_id is required'})
            return
            
        room = f'stim_{session_id}'
        join_room(room)
        app.logger.debug(f"Client {request.sid} subscribed to stimulation session {session_id}")
        
        # 현재 세션 상태 전송
        from backend.db.models import NervestimulationStatus
        with app.app_context():
            session = NervestimulationStatus.query.filter_by(session_id=session_id).first()
            if session:
                emit('stim_current_state', session.to_dict())
    
    @socketio.on('unsubscribe_nervestim')
    def handle_unsubscribe_nervestim(data):
        """신경자극 세션 구독 해제"""
        session_id = data.get('session_id')
        if session_id:
            room = f'stim_{session_id}'
            leave_room(room)
    
    @socketio.on('subscribe_alerts')
    def handle_subscribe_alerts():
        """알림 구독"""
        join_room('alerts')
        app.logger.debug(f"Client {request.sid} subscribed to alerts")
    
    @socketio.on('unsubscribe_alerts')
    def handle_unsubscribe_alerts():
        """알림 구독 해제"""
        leave_room('alerts')
    
    @socketio.on('get_band_list')
    def handle_get_band_list():
        """밴드 목록 요청"""
        from backend.db.models import Band
        with app.app_context():
            bands = Band.query.filter_by(is_active=True).all()
            emit('band_list', {
                'bands': [b.to_dict() for b in bands],
                'timestamp': datetime.utcnow().isoformat()
            })
    
    @socketio.on('ping_band')
    def handle_ping_band(data):
        """밴드 핑 요청"""
        bid = data.get('bid')
        if not bid:
            emit('error', {'message': 'bid is required'})
            return
            
        from mqtt_client import send_band_command
        success = send_band_command(bid, 'ping')
        
        emit('ping_result', {
            'bid': bid,
            'success': success,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    @socketio.on('request_location')
    def handle_request_location(data):
        """위치 정보 요청"""
        bid = data.get('bid')
        if not bid:
            emit('error', {'message': 'bid is required'})
            return
            
        from mqtt_client import send_band_command
        send_band_command(bid, 'get_location')
        
        emit('location_request_sent', {
            'bid': bid,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    # 신경자극 제어 이벤트
    @socketio.on('stim_start')
    def handle_stim_start(data):
        """신경자극 시작"""
        session_id = data.get('session_id')
        bid = data.get('bid')
        
        if not session_id or not bid:
            emit('error', {'message': 'session_id and bid are required'})
            return
            
        from mqtt_client import send_stim_control
        success = send_stim_control(bid, session_id, 'start')
        
        emit('stim_command_sent', {
            'session_id': session_id,
            'action': 'start',
            'success': success
        })
    
    @socketio.on('stim_stop')
    def handle_stim_stop(data):
        """신경자극 중지"""
        session_id = data.get('session_id')
        bid = data.get('bid')
        
        if not session_id or not bid:
            emit('error', {'message': 'session_id and bid are required'})
            return
            
        from mqtt_client import send_stim_control
        success = send_stim_control(bid, session_id, 'stop')
        
        emit('stim_command_sent', {
            'session_id': session_id,
            'action': 'stop',
            'success': success
        })
    
    @socketio.on('stim_set_level')
    def handle_stim_set_level(data):
        """신경자극 강도 변경"""
        session_id = data.get('session_id')
        bid = data.get('bid')
        level = data.get('level')
        
        if not session_id or not bid or level is None:
            emit('error', {'message': 'session_id, bid, and level are required'})
            return
            
        from utils import validate_stim_level
        if not validate_stim_level(level):
            emit('error', {'message': 'Invalid stimulation level (1-10)'})
            return
            
        from mqtt_client import send_stim_control
        success = send_stim_control(bid, session_id, 'set_level', level=level)
        
        emit('stim_command_sent', {
            'session_id': session_id,
            'action': 'set_level',
            'level': level,
            'success': success
        })


# ============================================================
# 서버에서 클라이언트로 브로드캐스트
# ============================================================

def broadcast_sensor_update(socketio, bid, sensor_data):
    """
    센서 데이터 브로드캐스트
    
    Args:
        socketio: Socket.IO 인스턴스
        bid: 밴드 ID
        sensor_data: 센서 데이터 dict
    """
    room = f'band_{bid}'
    socketio.emit('sensor_update', {
        'bid': bid,
        'datetime': datetime.utcnow().isoformat(),
        **sensor_data
    }, room=room)
    
    # 대시보드에도 요약 전송
    socketio.emit('sensor_summary', {
        'bid': bid,
        'hr': sensor_data.get('hr'),
        'spo2': sensor_data.get('spo2')
    }, room='dashboard')


def broadcast_location_update(socketio, bid, location_data):
    """
    위치 업데이트 브로드캐스트
    
    Args:
        socketio: Socket.IO 인스턴스
        bid: 밴드 ID
        location_data: 위치 데이터 dict
    """
    room = f'band_{bid}'
    socketio.emit('location_update', {
        'bid': bid,
        **location_data
    }, room=room)


def broadcast_band_status(socketio, bid, status, battery=None):
    """
    밴드 상태 브로드캐스트
    
    Args:
        socketio: Socket.IO 인스턴스
        bid: 밴드 ID
        status: 상태 (online/offline)
        battery: 배터리 잔량
    """
    data = {
        'bid': bid,
        'status': status,
        'timestamp': datetime.utcnow().isoformat()
    }
    if battery is not None:
        data['battery'] = battery
        
    socketio.emit('band_status', data, room='dashboard')
    socketio.emit('band_status', data, room=f'band_{bid}')


def broadcast_alert(socketio, alert_data):
    """
    새 알림 브로드캐스트
    
    Args:
        socketio: Socket.IO 인스턴스
        alert_data: 알림 데이터 dict
    """
    socketio.emit('alert_new', alert_data, room='alerts')
    socketio.emit('alert_new', alert_data, room='dashboard')
    
    # 해당 밴드 구독자에게도 전송
    bid = alert_data.get('bid')
    if bid:
        socketio.emit('alert_new', alert_data, room=f'band_{bid}')


def broadcast_stim_update(socketio, session_id, status_data):
    """
    신경자극 상태 업데이트 브로드캐스트
    
    Args:
        socketio: Socket.IO 인스턴스
        session_id: 세션 ID
        status_data: 상태 데이터 dict
    """
    room = f'stim_{session_id}'
    socketio.emit('stim_status_update', {
        'session_id': session_id,
        **status_data
    }, room=room)


def broadcast_stim_level_changed(socketio, session_id, bid, level):
    """
    신경자극 강도 변경 브로드캐스트
    
    Args:
        socketio: Socket.IO 인스턴스
        session_id: 세션 ID
        bid: 밴드 ID
        level: 새로운 강도
    """
    room = f'stim_{session_id}'
    socketio.emit('stim_level_changed', {
        'session_id': session_id,
        'bid': bid,
        'level': level,
        'timestamp': datetime.utcnow().isoformat()
    }, room=room)


def broadcast_stimulator_connected(socketio, bid, stimulator_id):
    """
    신경자극기 연결 브로드캐스트
    
    Args:
        socketio: Socket.IO 인스턴스
        bid: 밴드 ID
        stimulator_id: 자극기 ID
    """
    socketio.emit('stimulator_connected', {
        'bid': bid,
        'stimulator_id': stimulator_id,
        'timestamp': datetime.utcnow().isoformat()
    }, room='dashboard')
    socketio.emit('stimulator_connected', {
        'bid': bid,
        'stimulator_id': stimulator_id
    }, room=f'band_{bid}')


def broadcast_stimulator_disconnected(socketio, bid):
    """
    신경자극기 연결 해제 브로드캐스트
    
    Args:
        socketio: Socket.IO 인스턴스
        bid: 밴드 ID
    """
    socketio.emit('stimulator_disconnected', {
        'bid': bid,
        'timestamp': datetime.utcnow().isoformat()
    }, room='dashboard')
    socketio.emit('stimulator_disconnected', {
        'bid': bid
    }, room=f'band_{bid}')
