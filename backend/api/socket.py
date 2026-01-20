# -*- coding: utf-8 -*-
"""
SocketIO 이벤트 핸들러 모듈
웹 클라이언트와의 실시간 양방향 통신
"""

from flask_socketio import emit, join_room, leave_room
from flask import request


def register_handlers(socketio, app):
    """SocketIO 핸들러 등록"""
    
    @socketio.on('connect')
    def on_connect():
        """클라이언트 연결"""
        client_id = request.sid
        app.logger.info(f"Client connected: {client_id}")
        emit('connected', {'sid': client_id})
    
    @socketio.on('disconnect')
    def on_disconnect():
        """클라이언트 연결 해제"""
        client_id = request.sid
        app.logger.info(f"Client disconnected: {client_id}")
    
    @socketio.on('subscribe_band')
    def on_subscribe_band(data):
        """
        특정 밴드 구독
        해당 밴드의 데이터만 수신하도록 Room 참가
        
        Args:
            data: {'bid': 밴드 ID}
        """
        bid = data.get('bid')
        if bid:
            room_name = f"band_{bid}"
            join_room(room_name)
            app.logger.info(f"Client {request.sid} subscribed to band {bid}")
            emit('subscribed', {'bid': bid, 'room': room_name})
    
    @socketio.on('unsubscribe_band')
    def on_unsubscribe_band(data):
        """
        밴드 구독 해제
        
        Args:
            data: {'bid': 밴드 ID}
        """
        bid = data.get('bid')
        if bid:
            room_name = f"band_{bid}"
            leave_room(room_name)
            app.logger.info(f"Client {request.sid} unsubscribed from band {bid}")
            emit('unsubscribed', {'bid': bid})
    
    @socketio.on('subscribe_dashboard')
    def on_subscribe_dashboard():
        """대시보드 구독 (전체 알림 수신)"""
        join_room('dashboard')
        app.logger.info(f"Client {request.sid} subscribed to dashboard")
        emit('subscribed', {'room': 'dashboard'})

    @socketio.on('subscribe_alerts')
    def on_subscribe_alerts():
        """알림 구독 (전체 알림 수신)"""
        join_room('alerts')
        app.logger.info(f"Client {request.sid} subscribed to alerts")
        emit('subscribed', {'room': 'alerts'})

    @socketio.on('subscribe_nervestim')
    def on_subscribe_nervestim(data):
        """
        신경자극 세션 구독
        
        Args:
            data: {'session_id': 세션 ID}
        """
        session_id = data.get('session_id')
        if session_id:
            room_name = f"stim_{session_id}"
            join_room(room_name)
            app.logger.info(f"Client {request.sid} subscribed to session {session_id}")
            emit('subscribed', {'session_id': session_id, 'room': room_name})
    
    @socketio.on('unsubscribe_nervestim')
    def on_unsubscribe_nervestim(data):
        """신경자극 세션 구독 해제"""
        session_id = data.get('session_id')
        if session_id:
            room_name = f"stim_{session_id}"
            leave_room(room_name)
            emit('unsubscribed', {'session_id': session_id})
    
    @socketio.on('ping')
    def on_ping():
        """연결 확인용 ping"""
        emit('pong', {'timestamp': __import__('datetime').datetime.utcnow().isoformat()})


# ============================================================
# 서버에서 클라이언트로 이벤트 발송 헬퍼 함수
# ============================================================

def emit_to_band(socketio, bid, event, data):
    """특정 밴드를 구독한 클라이언트에게 이벤트 발송"""
    room_name = f"band_{bid}"
    socketio.emit(event, data, room=room_name)


def emit_to_dashboard(socketio, event, data):
    """대시보드 구독자에게 이벤트 발송"""
    socketio.emit(event, data, room='dashboard')


def emit_to_session(socketio, session_id, event, data):
    """특정 세션을 구독한 클라이언트에게 이벤트 발송"""
    room_name = f"stim_{session_id}"
    socketio.emit(event, data, room=room_name)


def broadcast_alert(socketio, alert_data):
    """전체 클라이언트에게 알림 브로드캐스트"""
    socketio.emit('alert_new', alert_data)
