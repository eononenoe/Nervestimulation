# -*- coding: utf-8 -*-
"""
신경자극 MQTT 핸들러 모듈
신경자극기 연결/해제, 자극 상태 변경 등 처리
"""

import json
from datetime import datetime
from flask import current_app

from backend.db.service import query, select
from backend.db.table import SessionStatus, EndReason, EventType


# 구독 토픽 목록
SUBSCRIBE_TOPICS = [
    '/DT/eHG4/NerveStim/Connect',      # 신경자극기 연결
    '/DT/eHG4/NerveStim/Disconnect',   # 신경자극기 연결 해제
    '/DT/eHG4/NerveStim/Status',       # 자극 상태 변경
    '/DT/eHG4/NerveStim/Complete',     # 자극 완료
    '/DT/eHG4/NerveStim/Error',        # 오류 발생
]


def register_handlers(mqtt, socketio, app):
    """신경자극 MQTT 핸들러 등록"""
    
    # 추가 토픽 구독
    @mqtt.on_connect()
    def on_nervestim_connect(client, userdata, flags, rc):
        if rc == 0:
            for topic in SUBSCRIBE_TOPICS:
                mqtt.subscribe(topic)
                app.logger.info(f"NerveStim subscribed to {topic}")
    
    @mqtt.on_topic('/DT/eHG4/NerveStim/Connect')
    def on_stimulator_connect(client, userdata, message):
        """신경자극기 BLE 연결 처리"""
        try:
            payload = json.loads(message.payload.decode('utf-8'))
        except:
            return
        
        with app.app_context():
            handle_stimulator_connect(payload, socketio, app)
    
    @mqtt.on_topic('/DT/eHG4/NerveStim/Disconnect')
    def on_stimulator_disconnect(client, userdata, message):
        """신경자극기 BLE 연결 해제 처리"""
        try:
            payload = json.loads(message.payload.decode('utf-8'))
        except:
            return
        
        with app.app_context():
            handle_stimulator_disconnect(payload, socketio, app)
    
    @mqtt.on_topic('/DT/eHG4/NerveStim/Status')
    def on_stim_status(client, userdata, message):
        """자극 상태 변경 처리"""
        try:
            payload = json.loads(message.payload.decode('utf-8'))
        except:
            return
        
        with app.app_context():
            handle_stim_status(payload, socketio, app)
    
    @mqtt.on_topic('/DT/eHG4/NerveStim/Complete')
    def on_stim_complete(client, userdata, message):
        """자극 완료 처리"""
        try:
            payload = json.loads(message.payload.decode('utf-8'))
        except:
            return
        
        with app.app_context():
            handle_stim_complete(payload, socketio, app)
    
    @mqtt.on_topic('/DT/eHG4/NerveStim/Error')
    def on_stim_error(client, userdata, message):
        """자극 오류 처리"""
        try:
            payload = json.loads(message.payload.decode('utf-8'))
        except:
            return
        
        with app.app_context():
            handle_stim_error(payload, socketio, app)


def handle_stimulator_connect(payload, socketio, app):
    """
    신경자극기 연결 처리
    
    Payload:
        bid: 밴드 ID
        stimulator_id: 신경자극기 ID
        rssi: BLE 신호 강도
        firmware_version: 펌웨어 버전
        battery_level: 배터리 잔량
    """
    bid = payload.get('bid')
    stimulator_id = payload.get('stimulator_id')
    
    if not bid or not stimulator_id:
        return
    
    # 밴드 상태 업데이트
    query.update_band_stimulator_connection(bid, True, stimulator_id)
    
    app.logger.info(f"Stimulator {stimulator_id} connected to band {bid}")
    
    # WebSocket 알림
    socketio.emit('stimulator_connected', {
        'bid': bid,
        'stimulator_id': stimulator_id,
        'rssi': payload.get('rssi'),
        'battery_level': payload.get('battery_level'),
        'timestamp': datetime.utcnow().isoformat()
    })


def handle_stimulator_disconnect(payload, socketio, app):
    """
    신경자극기 연결 해제 처리
    
    Payload:
        bid: 밴드 ID
        stimulator_id: 신경자극기 ID
        reason: 해제 사유
        last_session_id: 마지막 세션 ID (진행 중이었던 경우)
    """
    bid = payload.get('bid')
    stimulator_id = payload.get('stimulator_id')
    reason = payload.get('reason', 'UNKNOWN')
    last_session_id = payload.get('last_session_id')
    
    if not bid:
        return
    
    # 밴드 상태 업데이트
    query.update_band_stimulator_connection(bid, False)
    
    app.logger.info(f"Stimulator {stimulator_id} disconnected from band {bid}, reason: {reason}")
    
    # 진행 중인 세션이 있었다면 중단 처리
    if last_session_id:
        query.update_nervestim_status(
            last_session_id,
            SessionStatus.STOPPED,
            ended_at=datetime.utcnow(),
            end_reason=EndReason.DISCONNECTED
        )
        
        # 이벤트 생성
        band = select.get_band_by_bid(bid)
        if band:
            query.insert_event(
                band.id,
                EventType.STIMULATOR_DISCONNECTED,
                2,  # 주의 레벨
                None,
                f"자극 중 신경자극기 연결 끊김 (사유: {reason})"
            )
    
    # WebSocket 알림
    socketio.emit('stimulator_disconnected', {
        'bid': bid,
        'stimulator_id': stimulator_id,
        'reason': reason,
        'last_session_id': last_session_id,
        'timestamp': datetime.utcnow().isoformat()
    })


def handle_stim_status(payload, socketio, app):
    """
    자극 상태 변경 처리 (디바이스에서 보고)
    
    Payload:
        bid: 밴드 ID
        session_id: 세션 ID
        status: 상태 코드
        current_level: 현재 강도
        elapsed_time: 경과 시간 (초)
    """
    session_id = payload.get('session_id')
    status = payload.get('status')
    
    if not session_id:
        return
    
    # WebSocket으로 상태 전송
    socketio.emit('stim_status_update', {
        'session_id': session_id,
        'bid': payload.get('bid'),
        'status': status,
        'current_level': payload.get('current_level'),
        'elapsed_time': payload.get('elapsed_time'),
        'timestamp': datetime.utcnow().isoformat()
    })


def handle_stim_complete(payload, socketio, app):
    """
    자극 완료 처리
    
    Payload:
        bid: 밴드 ID
        session_id: 세션 ID
        total_duration: 총 자극 시간 (초)
    """
    session_id = payload.get('session_id')
    
    if not session_id:
        return
    
    # 세션 상태 업데이트
    query.update_nervestim_status(
        session_id,
        SessionStatus.COMPLETED,
        ended_at=datetime.utcnow(),
        end_reason=EndReason.COMPLETED
    )
    
    app.logger.info(f"Stimulation session {session_id} completed")
    
    # WebSocket 알림
    socketio.emit('stim_session_update', {
        'session_id': session_id,
        'bid': payload.get('bid'),
        'status': SessionStatus.COMPLETED,
        'status_text': '완료',
        'total_duration': payload.get('total_duration'),
        'timestamp': datetime.utcnow().isoformat()
    })


def handle_stim_error(payload, socketio, app):
    """
    자극 오류 처리
    
    Payload:
        bid: 밴드 ID
        session_id: 세션 ID
        error_code: 오류 코드
        error_message: 오류 메시지
    """
    session_id = payload.get('session_id')
    error_code = payload.get('error_code')
    error_message = payload.get('error_message', 'Unknown error')
    
    if not session_id:
        return
    
    # 세션 상태 업데이트
    query.update_nervestim_status(
        session_id,
        SessionStatus.STOPPED,
        ended_at=datetime.utcnow(),
        end_reason=EndReason.ERROR
    )
    
    app.logger.error(f"Stimulation error in session {session_id}: {error_code} - {error_message}")
    
    # 이벤트 생성
    bid = payload.get('bid')
    if bid:
        band = select.get_band_by_bid(bid)
        if band:
            query.insert_event(
                band.id,
                'stim_error',
                3,  # 경고 레벨
                error_code,
                f"신경자극 오류: {error_message}"
            )
    
    # WebSocket 알림
    socketio.emit('stim_error', {
        'session_id': session_id,
        'bid': bid,
        'error_code': error_code,
        'error_message': error_message,
        'timestamp': datetime.utcnow().isoformat()
    })
