# -*- coding: utf-8 -*-
"""
신경자극 세션 관리 API
세션 생성, 시작, 종료, 강도 변경 등
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import json

from backend import db, mqtt, socketio
from backend.db.table import (
    NerveStimSession, NerveStimHistory, BloodPressure, Band,
    SessionStatus, EndReason
)
from backend.db.service import query, select
from backend.api.api_band import token_required

nervestim_bp = Blueprint('nervestim', __name__)


# ============================================================
# 신경자극 세션 API
# ============================================================

@nervestim_bp.route('/nervestim/sessions', methods=['GET'])
@token_required
def get_sessions():
    """
    신경자극 세션 목록 조회
    
    Query Params:
        bid: 밴드 ID (선택)
        status: 상태 필터 (선택)
        limit: 조회 개수 (기본 20)
    """
    bid = request.args.get('bid')
    status = request.args.get('status', type=int)
    limit = request.args.get('limit', 20, type=int)
    
    query_obj = NerveStimSession.query
    
    if bid:
        band = select.get_band_by_bid(bid)
        if band:
            query_obj = query_obj.filter_by(FK_bid=band.id)
    
    if status is not None:
        query_obj = query_obj.filter_by(status=status)
    
    sessions = query_obj.order_by(NerveStimSession.created_at.desc()).limit(limit).all()
    
    return jsonify({
        'success': True,
        'data': [s.to_dict() for s in sessions]
    })


@nervestim_bp.route('/nervestim/sessions', methods=['POST'])
@token_required
def create_session():
    """
    신경자극 세션 생성
    
    Request Body:
        bid: 밴드 ID
        stim_level: 자극 강도 (1-10)
        frequency: 주파수 (Hz)
        duration: 자극 시간 (분)
        stim_mode: 자극 모드 (manual/auto/scheduled)
        target_nerve: 대상 신경 (median/ulnar/both)
        scheduled_at: 예약 시간 (선택)
    """
    data = request.get_json()
    bid = data.get('bid')
    
    if not bid:
        return jsonify({'error': 'bid is required'}), 400
    
    band = select.get_band_by_bid(bid)
    if not band:
        return jsonify({'error': 'Band not found'}), 404
    
    # 진행중인 세션 확인
    active = select.get_active_session_by_band(band.id)
    if active:
        return jsonify({
            'error': 'Active session exists',
            'session_id': active.session_id
        }), 409
    
    # 신경자극기 연결 확인
    if not band.stimulator_connected:
        return jsonify({'error': 'Stimulator not connected'}), 400
    
    # 세션 생성
    session_data = {
        'stimulator_id': band.stimulator_id,
        'stim_level': data.get('stim_level', 1),
        'frequency': data.get('frequency', 10.0),
        'pulse_width': data.get('pulse_width', 200),
        'duration': data.get('duration', 20),
        'stim_mode': data.get('stim_mode', 'manual'),
        'target_nerve': data.get('target_nerve', 'median'),
        'scheduled_at': data.get('scheduled_at')
    }
    
    session_id = query.insert_nervestim_session(band.id, session_data)
    
    # WebSocket 알림
    socketio.emit('stim_session_created', {
        'session_id': session_id,
        'bid': bid
    })
    
    return jsonify({
        'success': True,
        'session_id': session_id
    }), 201


@nervestim_bp.route('/nervestim/sessions/<session_id>', methods=['GET'])
@token_required
def get_session(session_id):
    """세션 상세 조회"""
    session = select.get_nervestim_session(session_id)
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    # 혈압 정보 포함
    bp_before = BloodPressure.query.get(session.bp_before_id) if session.bp_before_id else None
    bp_after = BloodPressure.query.get(session.bp_after_id) if session.bp_after_id else None
    
    result = session.to_dict()
    result['bp_before'] = bp_before.to_dict() if bp_before else None
    result['bp_after'] = bp_after.to_dict() if bp_after else None
    
    return jsonify({'success': True, 'data': result})


@nervestim_bp.route('/nervestim/sessions/<session_id>/start', methods=['POST'])
@token_required
def start_session(session_id):
    """
    신경자극 시작
    
    MQTT로 디바이스에 시작 명령 전송
    """
    session = select.get_nervestim_session(session_id)
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    if session.status != SessionStatus.PENDING:
        return jsonify({'error': 'Session is not in pending state'}), 400
    
    # 밴드 정보 조회
    band = Band.query.get(session.FK_bid)
    if not band or not band.stimulator_connected:
        return jsonify({'error': 'Stimulator not connected'}), 400
    
    # 자극 전 혈압 기록 (요청 바디에 포함된 경우)
    data = request.get_json() or {}
    if 'systolic' in data and 'diastolic' in data:
        bp_id = query.insert_bloodpressure(
            band.id,
            data['systolic'],
            data['diastolic'],
            data.get('pulse'),
            'pre_stim',
            session_id
        )
        session.bp_before_id = bp_id
    
    # MQTT 명령 발행
    mqtt_topic = f'/DT/eHG4/NerveStim/Start'
    mqtt_payload = {
        'bid': band.bid,
        'session_id': session_id,
        'stimulator_id': session.stimulator_id,
        'level': session.stim_level,
        'frequency': session.frequency,
        'pulse_width': session.pulse_width,
        'duration': session.duration,
        'target_nerve': session.target_nerve,
        'timestamp': int(datetime.utcnow().timestamp() * 1000)
    }
    
    try:
        mqtt.publish(mqtt_topic, json.dumps(mqtt_payload))
    except Exception as e:
        current_app.logger.error(f"MQTT publish failed: {e}")
        return jsonify({'error': 'Failed to send command to device'}), 500
    
    # 상태 업데이트
    query.update_nervestim_status(
        session_id,
        SessionStatus.RUNNING,
        started_at=datetime.utcnow()
    )
    
    # WebSocket 알림
    socketio.emit('stim_session_update', {
        'session_id': session_id,
        'status': SessionStatus.RUNNING,
        'status_text': '진행중'
    })
    
    return jsonify({'success': True, 'message': 'Stimulation started'})


@nervestim_bp.route('/nervestim/sessions/<session_id>/stop', methods=['POST'])
@token_required
def stop_session(session_id):
    """신경자극 중지"""
    session = select.get_nervestim_session(session_id)
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    if session.status != SessionStatus.RUNNING:
        return jsonify({'error': 'Session is not running'}), 400
    
    band = Band.query.get(session.FK_bid)
    
    # MQTT 중지 명령
    mqtt_topic = f'/DT/eHG4/NerveStim/Stop'
    mqtt_payload = {
        'bid': band.bid,
        'session_id': session_id,
        'stimulator_id': session.stimulator_id,
        'timestamp': int(datetime.utcnow().timestamp() * 1000)
    }
    
    try:
        mqtt.publish(mqtt_topic, json.dumps(mqtt_payload))
    except Exception as e:
        current_app.logger.error(f"MQTT publish failed: {e}")
    
    # 자극 후 혈압 기록
    data = request.get_json() or {}
    if 'systolic' in data and 'diastolic' in data:
        bp_id = query.insert_bloodpressure(
            band.id,
            data['systolic'],
            data['diastolic'],
            data.get('pulse'),
            'post_stim',
            session_id
        )
        session.bp_after_id = bp_id
    
    # 상태 업데이트
    query.update_nervestim_status(
        session_id,
        SessionStatus.STOPPED,
        ended_at=datetime.utcnow(),
        end_reason=EndReason.USER_STOP
    )
    
    # 이력 저장
    _save_session_history(session)
    
    # WebSocket 알림
    socketio.emit('stim_session_update', {
        'session_id': session_id,
        'status': SessionStatus.STOPPED,
        'status_text': '중단됨'
    })
    
    return jsonify({'success': True, 'message': 'Stimulation stopped'})


@nervestim_bp.route('/nervestim/sessions/<session_id>/level', methods=['PUT'])
@token_required
def change_level(session_id):
    """자극 강도 변경"""
    session = select.get_nervestim_session(session_id)
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    if session.status != SessionStatus.RUNNING:
        return jsonify({'error': 'Session is not running'}), 400
    
    data = request.get_json()
    new_level = data.get('level')
    
    if not new_level or not (1 <= new_level <= 10):
        return jsonify({'error': 'Invalid level (must be 1-10)'}), 400
    
    band = Band.query.get(session.FK_bid)
    
    # MQTT 강도 변경 명령
    mqtt_topic = f'/DT/eHG4/NerveStim/ChangeLevel'
    mqtt_payload = {
        'bid': band.bid,
        'session_id': session_id,
        'stimulator_id': session.stimulator_id,
        'level': new_level,
        'timestamp': int(datetime.utcnow().timestamp() * 1000)
    }
    
    try:
        mqtt.publish(mqtt_topic, json.dumps(mqtt_payload))
    except Exception as e:
        current_app.logger.error(f"MQTT publish failed: {e}")
        return jsonify({'error': 'Failed to send command'}), 500
    
    # DB 업데이트
    query.update_nervestim_level(session_id, new_level)
    
    # WebSocket 알림
    socketio.emit('stim_level_changed', {
        'session_id': session_id,
        'level': new_level
    })
    
    return jsonify({'success': True, 'level': new_level})


# ============================================================
# 혈압 API
# ============================================================

@nervestim_bp.route('/nervestim/bloodpressure', methods=['GET'])
@token_required
def get_bloodpressure():
    """혈압 기록 조회"""
    bid = request.args.get('bid')
    limit = request.args.get('limit', 50, type=int)
    
    if not bid:
        return jsonify({'error': 'bid is required'}), 400
    
    records = select.get_bloodpressure_by_band(bid, limit=limit)
    stats = select.get_bloodpressure_statistics(bid, days=30)
    
    return jsonify({
        'success': True,
        'data': [r.to_dict() for r in records],
        'statistics': stats
    })


@nervestim_bp.route('/nervestim/bloodpressure', methods=['POST'])
@token_required
def record_bloodpressure():
    """혈압 기록 저장"""
    data = request.get_json()
    
    bid = data.get('bid')
    systolic = data.get('systolic')
    diastolic = data.get('diastolic')
    
    if not all([bid, systolic, diastolic]):
        return jsonify({'error': 'bid, systolic, diastolic are required'}), 400
    
    band = select.get_band_by_bid(bid)
    if not band:
        return jsonify({'error': 'Band not found'}), 404
    
    record_id = query.insert_bloodpressure(
        band.id,
        systolic,
        diastolic,
        data.get('pulse'),
        data.get('measurement_type', 'manual'),
        data.get('session_id')
    )
    
    return jsonify({'success': True, 'id': record_id}), 201


# ============================================================
# 이력 API
# ============================================================

@nervestim_bp.route('/nervestim/history', methods=['GET'])
@token_required
def get_history():
    """신경자극 이력 조회"""
    bid = request.args.get('bid')
    start = request.args.get('start')
    end = request.args.get('end')
    limit = request.args.get('limit', 100, type=int)
    
    if not bid:
        return jsonify({'error': 'bid is required'}), 400
    
    start_dt = datetime.fromisoformat(start) if start else None
    end_dt = datetime.fromisoformat(end) if end else None
    
    history = select.get_session_history(bid, start_dt, end_dt, limit)
    
    return jsonify({
        'success': True,
        'data': [h.to_dict() for h in history]
    })


# ============================================================
# Helper Functions
# ============================================================

def _save_session_history(session):
    """세션 완료 시 이력 저장"""
    bp_before = BloodPressure.query.get(session.bp_before_id) if session.bp_before_id else None
    bp_after = BloodPressure.query.get(session.bp_after_id) if session.bp_after_id else None
    
    # 실제 자극 시간 계산
    duration_actual = 0
    if session.started_at and session.ended_at:
        duration_actual = int((session.ended_at - session.started_at).total_seconds() / 60)
    
    # 혈압 변화량 계산
    bp_change = None
    if bp_before and bp_after:
        bp_change = bp_after.systolic - bp_before.systolic
    
    history = NerveStimHistory(
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
