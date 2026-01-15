# -*- coding: utf-8 -*-
"""
Wellsafer Backend Main Application
스마트밴드 기반 신경자극 SaaS 플랫폼 백엔드 서버
"""

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 애플리케이션 생성
app = Flask(__name__)

# ============================================================
# 설정
# ============================================================

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')

# 데이터베이스
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'mysql+pymysql://dbadmin:p@ssw0rd@3.36.149.129:3306/naas?charset=utf8mb4'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_recycle': 3600,
    'pool_pre_ping': True
}

# MQTT
app.config['MQTT_BROKER_URL'] = os.environ.get('MQTT_BROKER_URL', 'localhost')
app.config['MQTT_BROKER_PORT'] = int(os.environ.get('MQTT_BROKER_PORT', 1883))
app.config['MQTT_USERNAME'] = os.environ.get('MQTT_USERNAME', '')
app.config['MQTT_PASSWORD'] = os.environ.get('MQTT_PASSWORD', '')

# SMS
app.config['SMS_API_KEY'] = os.environ.get('SMS_API_KEY', '')
app.config['SMS_SENDER_NUMBER'] = os.environ.get('SMS_SENDER_NUMBER', '')

# 기상청 API
app.config['KMA_API_KEY'] = os.environ.get('KMA_API_KEY', '')

# ============================================================
# CORS 설정
# ============================================================

cors_origins = os.environ.get('CORS_ORIGINS', '*')
if cors_origins == '*':
    CORS(app, supports_credentials=True)
else:
    CORS(app, origins=cors_origins.split(','), supports_credentials=True)

# ============================================================
# Socket.IO 설정
# ============================================================

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    logger=True,
    engineio_logger=True,
    ping_timeout=180,  # 3분으로 증가하여 모바일 연결 안정화
    ping_interval=60  # 1분으로 증가
)

# ============================================================
# 로깅 설정
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================
# 데이터베이스 초기화
# ============================================================

from backend.db.models import db

db.init_app(app)

with app.app_context():
    db.create_all()
    logger.info("Database tables created")

# ============================================================
# API Blueprint 등록
# ============================================================

from backend.api import register_blueprints
register_blueprints(app)

# ============================================================
# Socket.IO 핸들러 등록
# ============================================================

from backend.socket_handlers import register_socket_handlers
register_socket_handlers(socketio, app)

# ============================================================
# MQTT 클라이언트 초기화
# ============================================================

from backend.mqtt_client import init_mqtt

with app.app_context():
    try:
        init_mqtt(app, socketio)
        logger.info("MQTT client initialized")
    except Exception as e:
        logger.warning(f"MQTT initialization failed: {e}")

# ============================================================
# 에러 핸들러
# ============================================================

@app.errorhandler(400)
def bad_request(e):
    return jsonify({'success': False, 'error': 'Bad Request'}), 400


@app.errorhandler(401)
def unauthorized(e):
    return jsonify({'success': False, 'error': 'Unauthorized'}), 401


@app.errorhandler(403)
def forbidden(e):
    return jsonify({'success': False, 'error': 'Forbidden'}), 403


@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Not Found'}), 404


@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal error: {e}")
    return jsonify({'success': False, 'error': 'Internal Server Error'}), 500


# ============================================================
# 헬스체크 엔드포인트
# ============================================================

@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'service': 'Wellsafer Backend'
    })


@app.route('/api/Wellsafer/v1/health', methods=['GET'])
def api_health_check():
    """API 상태 확인"""
    from backend.db.models import Band

    try:
        # DB 연결 확인
        band_count = Band.query.count()
        db_status = 'connected'
    except Exception as e:
        band_count = 0
        db_status = f'error: {str(e)}'

    # MQTT 상태 확인
    from backend.mqtt_client import get_mqtt_client
    mqtt_client = get_mqtt_client()
    mqtt_status = 'connected' if mqtt_client else 'disconnected'

    return jsonify({
        'status': 'healthy',
        'database': db_status,
        'mqtt': mqtt_status,
        'bands_count': band_count
    })


@app.route('/api/test/alert', methods=['POST'])
def test_alert():
    """테스트용 알림 전송"""
    import datetime

    alert_data = {
        'id': 99999,
        'FK_bid': 178,
        'datetime': datetime.datetime.now().isoformat(),
        'event_type': 'sos',
        'event_level': 4,
        'value': 1,
        'message': 'TEST SOS 알림',
        'latitude': None,
        'longitude': None,
        'is_read': False,
        'is_resolved': False,
        'resolved_at': None,
        'sms_sent': False,
        'bid': '467191218473044',
        'wearer_name': 'TEST USER'
    }

    # Socket.IO로 알림 전송
    socketio.emit('alert_new', alert_data, room='alerts')
    socketio.emit('alert_new', alert_data, room='dashboard')

    logger.info(f"Test alert sent via Socket.IO")

    return jsonify({
        'success': True,
        'message': 'Test alert sent',
        'data': alert_data
    })


# ============================================================
# 메인 실행
# ============================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    
    logger.info(f"Starting Wellsafer Backend on port {port}")
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug
    )
