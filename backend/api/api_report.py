# -*- coding: utf-8 -*-
from flask import make_response, jsonify, request, json
from backend import app
from backend.db.database import DBManager
from backend.db.table.table_band import Bands
from backend.db.table.table_health import HealthReports
from datetime import datetime, timedelta, date
from pytz import timezone
from sqlalchemy import func, desc

print("module [backend.api_report] loaded")

db = DBManager.db


@app.route('/api/efwb/v1/reports', methods=['GET'])
def get_health_reports():
    """건강 리포트 목록 조회"""
    try:
        reports = db.session.query(HealthReports)\
            .order_by(desc(HealthReports.created_at))\
            .limit(100).all()
        
        # 통계 계산
        total_count = db.session.query(func.count(HealthReports.id)).scalar() or 0
        
        # 이번 주 리포트 수
        today = datetime.now(timezone('Asia/Seoul')).date()
        week_start = today - timedelta(days=today.weekday())
        this_week = db.session.query(func.count(HealthReports.id))\
            .filter(func.date(HealthReports.created_at) >= week_start).scalar() or 0
        
        # 대상 사용자 수 (밴드 연결된 리포트)
        target_users = db.session.query(func.count(func.distinct(HealthReports.FK_bid)))\
            .filter(HealthReports.FK_bid.isnot(None)).scalar() or 0
        
        # 총 다운로드 수
        total_downloads = db.session.query(func.sum(HealthReports.download_count)).scalar() or 0
        
        # 유형별 통계
        type_stats = db.session.query(
            HealthReports.report_type,
            func.count(HealthReports.id).label('count')
        ).group_by(HealthReports.report_type).all()
        
        type_counts = {t.report_type: t.count for t in type_stats}
        
        result = {
            'status': True,
            'stats': {
                'totalCount': total_count,
                'thisWeek': this_week,
                'targetUsers': target_users,
                'totalDownloads': int(total_downloads)
            },
            'typeCounts': {
                '종합': type_counts.get('종합', 0),
                '혈압': type_counts.get('혈압', 0),
                '신경자극': type_counts.get('신경자극', 0),
                '활동량': type_counts.get('활동량', 0)
            },
            'reports': [r.serialize() for r in reports]
        }
        return make_response(jsonify(result), 200)
    except Exception as e:
        print(f"Error in get_health_reports: {e}")
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/reports/<int:report_id>', methods=['GET'])
def get_health_report_detail(report_id):
    """건강 리포트 상세 조회"""
    try:
        report = db.session.query(HealthReports).get(report_id)
        if not report:
            return make_response(jsonify({'status': False, 'error': 'Report not found'}), 404)
        
        return make_response(jsonify({
            'status': True,
            'report': report.serialize()
        }), 200)
    except Exception as e:
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/reports', methods=['POST'])
def create_health_report():
    """건강 리포트 생성"""
    try:
        data = json.loads(request.data)
        
        new_report = HealthReports()
        new_report.FK_bid = data.get('bandId')
        new_report.report_type = data.get('type', '종합')
        new_report.report_name = data.get('name')
        
        # 기간 설정
        period_start = data.get('periodStart')
        period_end = data.get('periodEnd')
        
        if period_start:
            new_report.period_start = datetime.strptime(period_start, '%Y-%m-%d').date()
        else:
            new_report.period_start = (datetime.now() - timedelta(days=30)).date()
            
        if period_end:
            new_report.period_end = datetime.strptime(period_end, '%Y-%m-%d').date()
        else:
            new_report.period_end = datetime.now().date()
        
        new_report.created_at = datetime.now(timezone('Asia/Seoul'))
        
        db.session.add(new_report)
        db.session.commit()
        
        return make_response(jsonify({
            'status': True,
            'report': new_report.serialize()
        }), 201)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/reports/<int:report_id>/download', methods=['POST'])
def download_health_report(report_id):
    """건강 리포트 다운로드 카운트 증가"""
    try:
        report = db.session.query(HealthReports).get(report_id)
        if not report:
            return make_response(jsonify({'status': False, 'error': 'Report not found'}), 404)
        
        report.download_count = (report.download_count or 0) + 1
        db.session.commit()
        
        return make_response(jsonify({
            'status': True,
            'downloadCount': report.download_count,
            'filePath': report.file_path
        }), 200)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/reports/<int:report_id>', methods=['DELETE'])
def delete_health_report(report_id):
    """건강 리포트 삭제"""
    try:
        report = db.session.query(HealthReports).get(report_id)
        if not report:
            return make_response(jsonify({'status': False, 'error': 'Report not found'}), 404)
        
        db.session.delete(report)
        db.session.commit()
        
        return make_response(jsonify({'status': True}), 200)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)
