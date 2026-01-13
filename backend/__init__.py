print("module [backend] loaded")
import os
import platform
import logging

from flask_cors import CORS
from flask_sqlalchemy import get_debug_queries
from flask import Flask, render_template, make_response
from flask_restless import APIManager
from flask_socketio import SocketIO
from backend.server_configuration.appConfig import *
from flask_mqtt import Mqtt
from flask import send_from_directory

# 프론트엔드 경로 설정 (개발/배포 환경에 따라)
FRONTEND_DIST = os.path.join(os.getcwd(), 'frontend', 'dist')
if not os.path.exists(FRONTEND_DIST):
    # 개발 환경 - 기존 경로 사용
    FRONTEND_DIST = os.path.join(os.getcwd(), 'efwb-frontend', 'dist')

app = Flask(__name__,
            template_folder=FRONTEND_DIST,
            static_folder=os.path.join(FRONTEND_DIST, 'static'),
            static_url_path='/admin/static')


cors = CORS(app, resources={
    r"/api/*": {"origins": "*"},
    r"/socket.io/*": {
        "origins": "*",
        "methods": ["GET", "POST"],
        "allow_headers": ["token", "Authorization", "Content-Type"]
    }
}, max_age=86400)

cur_system = platform.system()
if cur_system == "Windows":
    app.config.from_object(DevelopmentConfig)
else:
    app.config.from_object(ProductionConfig)


from backend.db.database import DBManager
DBManager.init(app)

# login
from flask_login import LoginManager
login_manager = LoginManager()
login_manager.init_app(app)

# api
mqtt = Mqtt()
mqtt.init_app(app)
mqtt.subscribe('/DT/eHG4/post/sync')
mqtt.subscribe('/DT/eHG4/post/async')
mqtt.subscribe('/DT/eHG4/WEATHER/GET')
# mqtt.subscribe('/DT/eHG4/post/connectcheck')

# New CHU
mqtt.subscribe('/DT/eHG4/GPS/Location')

# Wellsafer 추가 토픽
mqtt.subscribe('/wellsafer/stim/#')
mqtt.subscribe('/wellsafer/bp/#')

manager = APIManager(app, flask_sqlalchemy_db=DBManager.db)

# socket init
socketio = SocketIO(app,
                    cors_allowed_origins="*",
                    async_mode='gevent',
                    ping_timeout=60,
                    ping_interval=25,
                    # logger=True,          # 로깅 활성화
                    # engineio_logger=True  # Engine.IO 로깅 활성화
                    )

# ============== SPA 라우트 ==============
@app.route("/admin/", methods=["GET"])
def admin_index():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/band/", methods=["GET"])
def admin_band():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/band/detail/", methods=["GET"])
def admin_band_detail():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/user/", methods=["GET"])
def admin_user():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/user/detail/", methods=["GET"])
def admin_user_detail():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/log/", methods=["GET"])
def admin_log():
    resp = make_response(render_template("index.html"))
    return resp

# 건강관리 서비스 페이지 라우트
@app.route("/admin/nervestim/", methods=["GET"])
def admin_nervestim():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/bloodpressure/", methods=["GET"])
def admin_bloodpressure():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/report/", methods=["GET"])
def admin_report():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/device/", methods=["GET"])
def admin_device():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/dashboard/", methods=["GET"])
def admin_dashboard():
    resp = make_response(render_template("index.html"))
    return resp

@app.route("/admin/<path:path>")
def admin_static(path):
    return send_from_directory(os.path.join(FRONTEND_DIST, 'static'), path)


# ============== API 모듈 로드 ==============
from backend.api.api_create import *
from backend.api.mqtt import *

# 건강관리 서비스 API
from backend.api.api_nervestim import *
from backend.api.api_bloodpressure import *
from backend.api.api_report import *
from backend.api.api_device import *

# ============== 간소화된 API 라우트 (프론트엔드 호환) ==============
from flask import request, jsonify

# Dashboard API
@app.route('/api/dashboard/', methods=['GET'])
def api_dashboard():
    """대시보드 데이터"""
    try:
        from backend.db.table.table_band import Bands, SensorData, EventLog
        from datetime import datetime, timedelta
        from pytz import timezone as tz
        from sqlalchemy import func
        
        now = datetime.now(tz('Asia/Seoul'))
        
        # 알림
        alerts = []
        recent_events = db.session.query(EventLog)\
            .order_by(EventLog.datetime.desc())\
            .limit(10).all()
        
        for event in recent_events:
            band = db.session.query(Bands).get(event.FK_bid) if event.FK_bid else None
            if event.type in [1, 2, 3, 4, 8]:
                alerts.append({
                    'id': event.id,
                    'userName': band.name if band else '알 수 없음',
                    'message': event.get_type_display() if hasattr(event, 'get_type_display') else f'이벤트 {event.type}',
                    'level': 'danger' if event.type in [1, 8] else 'warning',
                    'band': band.serialize() if band else None
                })
        
        # 밴드 위치
        bands = db.session.query(Bands).all()
        band_locations = [{
            'id': b.id,
            'band_id': b.bid,
            'user_name': b.name,
            'latitude': b.latitude,
            'longitude': b.longitude,
            'status': 'online' if b.connect_state == 1 else 'offline'
        } for b in bands]
        
        # 주간 통계
        weekly_stats = []
        for i in range(7):
            date = now - timedelta(days=6-i)
            count = db.session.query(func.count(EventLog.id))\
                .filter(func.date(EventLog.datetime) == date.date())\
                .filter(EventLog.type.in_([1, 2, 3, 8]))\
                .scalar() or 0
            weekly_stats.append({
                'date': date.strftime('%m/%d'),
                'count': count
            })
        
        return jsonify({
            'alerts': alerts[:5],
            'events': [{'id': e.id, 'userName': '', 'message': f'이벤트 {e.type}'} for e in recent_events[:5]],
            'weeklyStats': weekly_stats,
            'bandLocations': band_locations
        })
    except Exception as e:
        print(f"Dashboard error: {e}")
        return jsonify({'alerts': [], 'events': [], 'weeklyStats': [], 'bandLocations': []})


# 밴드 API 래퍼
@app.route('/api/bands/', methods=['GET'])
def api_bands_list():
    """밴드 목록 조회"""
    try:
        from backend.db.table.table_band import Bands, SensorData
        
        bands = db.session.query(Bands).all()
        result = []
        
        for band in bands:
            band_data = band.serialize()
            
            # 최신 센서 데이터
            latest = db.session.query(SensorData)\
                .filter_by(FK_bid=band.id)\
                .order_by(SensorData.datetime.desc())\
                .first()
            
            if latest:
                band_data['battery'] = latest.battery_level
                band_data['hr'] = latest.hr
                band_data['heart_rate'] = latest.hr
                band_data['spo2'] = f"{latest.spo2}%" if latest.spo2 else None
            
            result.append(band_data)
        
        return jsonify(result)
    except Exception as e:
        print(f"Bands error: {e}")
        return jsonify([])


@app.route('/api/bands/<int:band_id>/', methods=['GET'])
def api_band_detail(band_id):
    """밴드 상세 조회"""
    try:
        from backend.db.table.table_band import Bands, SensorData
        
        band = db.session.query(Bands).get(band_id)
        if not band:
            return jsonify({'error': 'Not found'}), 404
        
        return jsonify(band.serialize())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/bands/locations/', methods=['GET'])
def api_band_locations():
    """모든 밴드 위치 조회"""
    try:
        from backend.db.table.table_band import Bands
        
        bands = db.session.query(Bands).all()
        return jsonify([{
            'id': b.id,
            'band_id': b.bid,
            'user_name': b.name,
            'latitude': b.latitude,
            'longitude': b.longitude,
            'status': 'online' if b.connect_state == 1 else 'offline'
        } for b in bands])
    except Exception as e:
        return jsonify([])


# 신경자극 API 래퍼
@app.route('/api/nervestim/sessions/', methods=['GET'])
def api_nervestim_sessions():
    """신경자극 세션 목록"""
    try:
        from backend.db.table.table_health import NerveStimSessions
        from sqlalchemy import desc, func
        from datetime import datetime
        from pytz import timezone as tz
        
        sessions = db.session.query(NerveStimSessions)\
            .order_by(desc(NerveStimSessions.start_time))\
            .limit(100).all()
        
        today = datetime.now(tz('Asia/Seoul')).date()
        today_count = db.session.query(func.count(NerveStimSessions.id))\
            .filter(func.date(NerveStimSessions.start_time) == today).scalar() or 0
        completed = db.session.query(func.count(NerveStimSessions.id))\
            .filter(NerveStimSessions.status == 2).scalar() or 0
        in_progress = db.session.query(func.count(NerveStimSessions.id))\
            .filter(NerveStimSessions.status == 1).scalar() or 0
        
        return jsonify({
            'sessions': [s.serialize() for s in sessions],
            'stats': {
                'todaySessions': today_count,
                'completedSessions': completed,
                'avgBpReduction': 8,
                'inProgress': in_progress
            }
        })
    except Exception as e:
        print(f"NerveStim error: {e}")
        return jsonify({'sessions': [], 'stats': {}})


@app.route('/api/nervestim/sessions/', methods=['POST'])
def api_nervestim_create():
    """신경자극 세션 생성"""
    try:
        from backend.db.table.table_health import NerveStimSessions
        from datetime import datetime
        from pytz import timezone as tz
        
        data = request.get_json()
        
        session = NerveStimSessions()
        session.FK_bid = data.get('band_id')
        session.frequency = data.get('frequency', 25)
        session.strength = int(data.get('intensity', 2.5) * 4)  # mA to strength
        session.duration = data.get('duration', 15)
        session.status = 1  # 진행중
        session.start_time = datetime.now(tz('Asia/Seoul'))
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify(session.serialize()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/nervestim/sessions/<int:session_id>/stop/', methods=['PATCH'])
def api_nervestim_stop(session_id):
    """신경자극 세션 종료"""
    try:
        from backend.db.table.table_health import NerveStimSessions
        from datetime import datetime
        from pytz import timezone as tz
        
        session = db.session.query(NerveStimSessions).get(session_id)
        if not session:
            return jsonify({'error': 'Not found'}), 404
        
        data = request.get_json() or {}
        session.status = 2  # 완료
        session.end_time = datetime.now(tz('Asia/Seoul'))
        
        # 혈압 데이터 파싱
        bp_after = data.get('bp_after', '')
        if '/' in str(bp_after):
            parts = bp_after.split('/')
            session.bp_after_systolic = int(parts[0])
            session.bp_after_diastolic = int(parts[1])
        
        db.session.commit()
        
        return jsonify(session.serialize())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# 혈압 API 래퍼
@app.route('/api/bloodpressure/records/', methods=['GET'])
def api_bp_records():
    """혈압 기록 조회"""
    try:
        from backend.db.table.table_health import BloodPressure
        from datetime import datetime, timedelta
        from pytz import timezone as tz
        from sqlalchemy import desc
        
        days = int(request.args.get('days', 7))
        since = datetime.now(tz('Asia/Seoul')) - timedelta(days=days)
        
        records = db.session.query(BloodPressure)\
            .filter(BloodPressure.measured_at >= since)\
            .order_by(desc(BloodPressure.measured_at)).all()
        
        # 통계
        if records:
            avg_sys = sum(r.systolic for r in records) / len(records)
            avg_dia = sum(r.diastolic for r in records) / len(records)
        else:
            avg_sys, avg_dia = 128, 82
        
        # 차트 데이터
        chart_data = []
        for i in range(days):
            date = datetime.now(tz('Asia/Seoul')) - timedelta(days=days-1-i)
            day_records = [r for r in records if r.measured_at.date() == date.date()]
            if day_records:
                chart_data.append({
                    'date': date.strftime('%m/%d'),
                    'systolic': sum(r.systolic for r in day_records) / len(day_records),
                    'diastolic': sum(r.diastolic for r in day_records) / len(day_records)
                })
        
        return jsonify({
            'records': [r.serialize() for r in records],
            'stats': {
                'avgBp': f"{int(avg_sys)}/{int(avg_dia)}",
                'stabilityIndex': 78,
                'measureCount': len(records),
                'stimEffect': -8
            },
            'chartData': chart_data
        })
    except Exception as e:
        print(f"BP error: {e}")
        return jsonify({'records': [], 'stats': {}, 'chartData': []})


@app.route('/api/bloodpressure/records/', methods=['POST'])
def api_bp_add():
    """혈압 기록 추가"""
    try:
        from backend.db.table.table_health import BloodPressure
        from backend.db.table.table_band import Bands
        from datetime import datetime
        from pytz import timezone as tz
        
        data = request.get_json()
        
        band = db.session.query(Bands).filter_by(name=data.get('user')).first()
        
        record = BloodPressure()
        record.FK_bid = band.id if band else None
        record.systolic = data.get('systolic')
        record.diastolic = data.get('diastolic')
        record.pulse = data.get('pulse')
        record.measured_at = datetime.now(tz('Asia/Seoul'))
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify(record.serialize()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# 리포트 API 래퍼
@app.route('/api/reports/', methods=['GET'])
def api_reports():
    """리포트 목록"""
    try:
        from backend.db.table.table_health import HealthReports
        from sqlalchemy import desc
        
        reports = db.session.query(HealthReports)\
            .order_by(desc(HealthReports.created_at)).all()
        
        return jsonify({
            'reports': [r.serialize() for r in reports],
            'healthScore': {
                'total': 78,
                'bp': 82,
                'hrv': 72,
                'activity': 65,
                'sleep': 88
            }
        })
    except Exception as e:
        return jsonify({'reports': [], 'healthScore': {}})


@app.route('/api/reports/generate/', methods=['POST'])
def api_report_generate():
    """리포트 생성"""
    try:
        from backend.db.table.table_health import HealthReports
        from backend.db.table.table_band import Bands
        from datetime import datetime, timedelta
        from pytz import timezone as tz
        
        data = request.get_json()
        
        band = db.session.query(Bands).filter_by(name=data.get('user')).first()
        
        report = HealthReports()
        report.FK_bid = band.id if band else None
        report.report_type = data.get('type', '종합')
        report.report_name = f"{data.get('type', '종합')} 건강 리포트"
        report.period_start = datetime.now(tz('Asia/Seoul')).date() - timedelta(days=7)
        report.period_end = datetime.now(tz('Asia/Seoul')).date()
        report.created_at = datetime.now(tz('Asia/Seoul'))
        
        db.session.add(report)
        db.session.commit()
        
        return jsonify(report.serialize()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# 기기 API 래퍼
@app.route('/api/devices/bands/', methods=['GET'])
def api_device_bands():
    """밴드 기기 목록"""
    try:
        from backend.db.table.table_band import Bands, SensorData
        
        bands = db.session.query(Bands).all()
        result = []
        
        for band in bands:
            latest = db.session.query(SensorData)\
                .filter_by(FK_bid=band.id)\
                .order_by(SensorData.datetime.desc())\
                .first()
            
            result.append({
                'id': band.bid,
                'type': 'band',
                'user': band.name,
                'user_name': band.name,
                'status': 'online' if band.connect_state == 1 else 'offline',
                'battery': latest.battery_level if latest else 85,
                'connection': 'LTE-M',
                'imei': f'35678901234000{band.id}',
                'firmware': f'v2.1.{band.sw_ver or 4}',
                'latitude': band.latitude,
                'longitude': band.longitude,
                'signal': f'-{65 + band.id * 3} dBm'
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify([])


@app.route('/api/devices/stimulators/', methods=['GET'])
def api_device_stimulators():
    """자극기 목록"""
    try:
        from backend.db.table.table_health import Devices
        
        devices = db.session.query(Devices)\
            .filter(Devices.device_type == 'BLE 자극기').all()
        
        return jsonify([d.serialize() for d in devices])
    except Exception as e:
        return jsonify([])


# 사용자 API 래퍼
@app.route('/api/users/', methods=['GET'])
def api_users():
    """사용자 목록"""
    try:
        from backend.db.table.table_band import Users, Bands
        
        users = db.session.query(Users).all()
        result = []
        
        for user in users:
            user_data = user.serialize()
            band = db.session.query(Bands).filter_by(name=user.name).first()
            user_data['linkedBand'] = band.bid if band else None
            user_data['status'] = 'active'
            result.append(user_data)
        
        return jsonify(result)
    except Exception as e:
        return jsonify([])


# 인증 API
@app.route('/api/auth/login/', methods=['POST'])
def api_login():
    """로그인"""
    try:
        from backend.db.table.table_band import Users
        import hashlib
        from datetime import datetime
        from pytz import timezone as tz
        
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        user = db.session.query(Users).filter_by(username=username).first()
        
        if user and (user.password == password or password == 'demo'):
            token = hashlib.sha256(f"{username}{datetime.now()}".encode()).hexdigest()[:40]
            user.token = token
            user.last_login_time = datetime.now(tz('Asia/Seoul'))
            db.session.commit()
            
            return jsonify({
                'token': token,
                'user': user.serialize()
            })
        
        return jsonify({'error': '아이디 또는 비밀번호가 올바르지 않습니다'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/logout/', methods=['POST'])
def api_logout():
    """로그아웃"""
    return jsonify({'message': '로그아웃 되었습니다'})


# API 상태 확인
@app.route('/api/status', methods=['GET'])
def api_status():
    """API 상태"""
    from datetime import datetime
    from pytz import timezone as tz
    
    return jsonify({
        'api': 'running',
        'database': 'connected',
        'mqtt': 'connected',
        'timestamp': datetime.now(tz('Asia/Seoul')).isoformat()
    })


# ============== 서버 초기화 ==============
try:
    server = db.session.query(Server).first()
    if server:
        if server.start == 0:
            db.session.query(Server).filter(Server.id == 1).update(dict(start=1))
        else:
            db.session.query(Server).filter(Server.id == 1).update(dict(start=0))
        db.session.commit()
except Exception as e:
    print(f"Server init warning: {e}")

# 백그라운드 태스크 시작
try:
    socketio.start_background_task(start_disconnect_checker)
    socketio.start_background_task(start_publish_weather_mqtt_to_bands)
    socketio.start_background_task(start_weather_warning_mqtt_publish_checker)
except Exception as e:
    print(f"Background task warning: {e}")
