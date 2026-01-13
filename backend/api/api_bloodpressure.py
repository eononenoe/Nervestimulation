# -*- coding: utf-8 -*-
from flask import make_response, jsonify, request, json
from backend import app
from backend.db.database import DBManager
from backend.db.table.table_band import Bands
from backend.db.table.table_health import BloodPressure, NerveStimSessions
from datetime import datetime, timedelta
from pytz import timezone
from sqlalchemy import func, desc, and_

print("module [backend.api_bloodpressure] loaded")

db = DBManager.db


@app.route('/api/efwb/v1/bloodpressure/summary', methods=['GET'])
def get_bloodpressure_summary():
    """혈압 요약 정보 조회"""
    try:
        # 기간 파라미터 처리
        period = request.args.get('period', '7')  # 기본 7일
        days = int(period)
        start_date = datetime.now(timezone('Asia/Seoul')) - timedelta(days=days)
        
        # 기간 내 혈압 데이터
        bp_data = db.session.query(BloodPressure)\
            .filter(BloodPressure.measured_at >= start_date)\
            .order_by(desc(BloodPressure.measured_at)).all()
        
        if bp_data:
            avg_systolic = round(sum(bp.systolic for bp in bp_data) / len(bp_data), 1)
            avg_diastolic = round(sum(bp.diastolic for bp in bp_data) / len(bp_data), 1)
            
            # 자극 전후 변화 계산
            before_stim = [bp for bp in bp_data if not bp.is_after_stim]
            after_stim = [bp for bp in bp_data if bp.is_after_stim]
            
            change = 0
            if before_stim and after_stim:
                avg_before = sum(bp.systolic for bp in before_stim) / len(before_stim)
                avg_after = sum(bp.systolic for bp in after_stim) / len(after_stim)
                change = round(avg_after - avg_before, 1)
            
            # 정상 비율 계산
            normal_count = len([bp for bp in bp_data if bp.get_status() == '정상'])
            caution_count = len([bp for bp in bp_data if bp.get_status() == '주의'])
            danger_count = len([bp for bp in bp_data if bp.get_status() == '위험'])
            total = len(bp_data)
            
            normal_rate = round(normal_count / total * 100) if total > 0 else 0
            caution_rate = round(caution_count / total * 100) if total > 0 else 0
            danger_rate = round(danger_count / total * 100) if total > 0 else 0
        else:
            avg_systolic = 0
            avg_diastolic = 0
            change = 0
            normal_rate = 0
            caution_rate = 0
            danger_rate = 0
        
        # 사용자별 최신 혈압 데이터
        subquery = db.session.query(
            BloodPressure.FK_bid,
            func.max(BloodPressure.measured_at).label('max_measured')
        ).group_by(BloodPressure.FK_bid).subquery()
        
        latest_bp = db.session.query(BloodPressure)\
            .join(subquery, and_(
                BloodPressure.FK_bid == subquery.c.FK_bid,
                BloodPressure.measured_at == subquery.c.max_measured
            )).all()
        
        # 트렌드 계산 (최근 3회 측정 기준)
        user_data = []
        for bp in latest_bp:
            recent_3 = db.session.query(BloodPressure)\
                .filter(BloodPressure.FK_bid == bp.FK_bid)\
                .order_by(desc(BloodPressure.measured_at))\
                .limit(3).all()
            
            trend = 'stable'
            if len(recent_3) >= 2:
                if recent_3[0].systolic > recent_3[-1].systolic + 5:
                    trend = 'up'
                elif recent_3[0].systolic < recent_3[-1].systolic - 5:
                    trend = 'down'
            
            data = bp.serialize()
            data['trend'] = trend
            user_data.append(data)
        
        result = {
            'status': True,
            'stats': {
                'avgSystolic': avg_systolic,
                'avgDiastolic': avg_diastolic,
                'change': change,
                'normalRate': normal_rate,
                'cautionRate': caution_rate,
                'dangerRate': danger_rate
            },
            'distribution': {
                'normal': normal_rate,
                'caution': caution_rate,
                'danger': danger_rate
            },
            'users': user_data
        }
        return make_response(jsonify(result), 200)
    except Exception as e:
        print(f"Error in get_bloodpressure_summary: {e}")
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/bloodpressure/history/<int:band_id>', methods=['GET'])
def get_bloodpressure_history(band_id):
    """특정 밴드의 혈압 히스토리 조회"""
    try:
        period = request.args.get('period', '7')
        days = int(period)
        start_date = datetime.now(timezone('Asia/Seoul')) - timedelta(days=days)
        
        bp_data = db.session.query(BloodPressure)\
            .filter(BloodPressure.FK_bid == band_id)\
            .filter(BloodPressure.measured_at >= start_date)\
            .order_by(desc(BloodPressure.measured_at)).all()
        
        return make_response(jsonify({
            'status': True,
            'history': [bp.serialize() for bp in bp_data]
        }), 200)
    except Exception as e:
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/bloodpressure/trend', methods=['GET'])
def get_bloodpressure_trend():
    """혈압 추이 데이터 (차트용)"""
    try:
        period = request.args.get('period', '7')
        days = int(period)
        start_date = datetime.now(timezone('Asia/Seoul')) - timedelta(days=days)
        
        # 일별 평균 데이터
        daily_data = db.session.query(
            func.date(BloodPressure.measured_at).label('date'),
            func.avg(BloodPressure.systolic).label('avg_systolic'),
            func.avg(BloodPressure.diastolic).label('avg_diastolic'),
            func.avg(BloodPressure.pulse).label('avg_pulse')
        ).filter(BloodPressure.measured_at >= start_date)\
        .group_by(func.date(BloodPressure.measured_at))\
        .order_by(func.date(BloodPressure.measured_at)).all()
        
        trend_data = [{
            'date': str(d.date),
            'systolic': round(d.avg_systolic, 1) if d.avg_systolic else 0,
            'diastolic': round(d.avg_diastolic, 1) if d.avg_diastolic else 0,
            'pulse': round(d.avg_pulse, 1) if d.avg_pulse else 0
        } for d in daily_data]
        
        return make_response(jsonify({
            'status': True,
            'trend': trend_data
        }), 200)
    except Exception as e:
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/bloodpressure', methods=['POST'])
def add_bloodpressure():
    """혈압 데이터 추가"""
    try:
        data = json.loads(request.data)
        
        new_bp = BloodPressure()
        new_bp.FK_bid = data.get('bandId')
        new_bp.systolic = data.get('systolic')
        new_bp.diastolic = data.get('diastolic')
        new_bp.pulse = data.get('pulse')
        new_bp.is_after_stim = data.get('isAfterStim', False)
        new_bp.FK_session_id = data.get('sessionId')
        new_bp.measured_at = datetime.now(timezone('Asia/Seoul'))
        
        db.session.add(new_bp)
        db.session.commit()
        
        return make_response(jsonify({
            'status': True,
            'bloodPressure': new_bp.serialize()
        }), 201)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)
