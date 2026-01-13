# -*- coding: utf-8 -*-
from flask import make_response, jsonify, request, json
from backend import app
from backend.db.database import DBManager
from backend.db.table.table_band import Bands
from backend.db.table.table_health import NerveStimSessions, BloodPressure
from datetime import datetime, timedelta
from pytz import timezone
from sqlalchemy import func, desc

print("module [backend.api_nervestim] loaded")

db = DBManager.db


@app.route('/api/efwb/v1/nervestim/sessions', methods=['GET'])
def get_nervestim_sessions():
    """신경자극 세션 목록 조회"""
    try:
        sessions = db.session.query(NerveStimSessions)\
            .order_by(desc(NerveStimSessions.start_time))\
            .limit(100).all()
        
        # 통계 계산
        today = datetime.now(timezone('Asia/Seoul')).date()
        active_count = db.session.query(func.count(NerveStimSessions.id))\
            .filter(NerveStimSessions.status == 1).scalar() or 0
        completed_today = db.session.query(func.count(NerveStimSessions.id))\
            .filter(NerveStimSessions.status == 2)\
            .filter(func.date(NerveStimSessions.end_time) == today).scalar() or 0
        
        # 평균 효과 계산 (혈압 변화)
        sessions_with_bp = db.session.query(NerveStimSessions)\
            .filter(NerveStimSessions.bp_before_systolic.isnot(None))\
            .filter(NerveStimSessions.bp_after_systolic.isnot(None))\
            .all()
        
        avg_effect = 0
        if sessions_with_bp:
            total_effect = sum([
                (s.bp_before_systolic - s.bp_after_systolic) / s.bp_before_systolic * 100 
                for s in sessions_with_bp if s.bp_before_systolic > 0
            ])
            avg_effect = round(total_effect / len(sessions_with_bp), 1)
        
        result = {
            'status': True,
            'stats': {
                'activeCount': active_count,
                'completedToday': completed_today,
                'avgEffect': avg_effect
            },
            'sessions': [s.serialize() for s in sessions]
        }
        return make_response(jsonify(result), 200)
    except Exception as e:
        print(f"Error in get_nervestim_sessions: {e}")
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/nervestim/sessions/<int:session_id>', methods=['GET'])
def get_nervestim_session_detail(session_id):
    """신경자극 세션 상세 조회"""
    try:
        session = db.session.query(NerveStimSessions).get(session_id)
        if not session:
            return make_response(jsonify({'status': False, 'error': 'Session not found'}), 404)
        
        return make_response(jsonify({
            'status': True,
            'session': session.serialize()
        }), 200)
    except Exception as e:
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/nervestim/sessions', methods=['POST'])
def create_nervestim_session():
    """신경자극 세션 생성"""
    try:
        data = json.loads(request.data)
        
        new_session = NerveStimSessions()
        new_session.FK_bid = data.get('bandId')
        new_session.frequency = data.get('frequency', 80)
        new_session.strength = data.get('strength', 10)
        new_session.duration = data.get('duration', 15)
        new_session.status = 0  # 대기
        new_session.start_time = datetime.now(timezone('Asia/Seoul'))
        
        db.session.add(new_session)
        db.session.commit()
        
        return make_response(jsonify({
            'status': True,
            'session': new_session.serialize()
        }), 201)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/nervestim/sessions/<int:session_id>/start', methods=['POST'])
def start_nervestim_session(session_id):
    """신경자극 세션 시작"""
    try:
        session = db.session.query(NerveStimSessions).get(session_id)
        if not session:
            return make_response(jsonify({'status': False, 'error': 'Session not found'}), 404)
        
        session.status = 1  # 진행중
        session.start_time = datetime.now(timezone('Asia/Seoul'))
        db.session.commit()
        
        return make_response(jsonify({
            'status': True,
            'session': session.serialize()
        }), 200)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/nervestim/sessions/<int:session_id>/stop', methods=['POST'])
def stop_nervestim_session(session_id):
    """신경자극 세션 종료"""
    try:
        session = db.session.query(NerveStimSessions).get(session_id)
        if not session:
            return make_response(jsonify({'status': False, 'error': 'Session not found'}), 404)
        
        session.status = 2  # 완료
        session.end_time = datetime.now(timezone('Asia/Seoul'))
        db.session.commit()
        
        return make_response(jsonify({
            'status': True,
            'session': session.serialize()
        }), 200)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)
