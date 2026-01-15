# -*- coding: utf-8 -*-
"""
Flask 애플리케이션 팩토리 모듈
MQTT, SocketIO, SQLAlchemy 등 확장 모듈 초기화
"""

from flask import Flask
from flask_cors import CORS
from flask_mqtt import Mqtt
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy

from .server_configuration.appConfig import config

# 전역 인스턴스 (싱글톤)
db = SQLAlchemy()
mqtt = Mqtt()
socketio = SocketIO()


def create_app(config_name='development'):
    """
    Flask 애플리케이션 팩토리 함수
    
    Args:
        config_name: 환경 설정 이름 ('development', 'production', 'testing')
    
    Returns:
        Flask: 초기화된 Flask 애플리케이션 인스턴스
    """
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # CORS 설정 (Cross-Origin Resource Sharing)
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config.get('CORS_ORIGINS', '*'),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # SQLAlchemy 초기화
    db.init_app(app)
    
    # MQTT 초기화 (production 환경에서만)
    if config_name != 'testing':
        try:
            mqtt.init_app(app)
        except Exception as e:
            app.logger.warning(f"MQTT 초기화 실패: {e}")
    
    # SocketIO 초기화
    socketio.init_app(
        app,
        cors_allowed_origins=app.config.get('CORS_ORIGINS', '*'),
        async_mode='eventlet',
        logger=True,
        engineio_logger=True
    )
    
    # 데이터베이스 테이블 생성
    with app.app_context():
        from .db.table import table_band, table_nervestim
        db.create_all()
    
    # Blueprint 등록
    register_blueprints(app)
    
    # MQTT 핸들러 등록
    if config_name != 'testing':
        register_mqtt_handlers(app)
    
    # Socket 핸들러 등록
    register_socket_handlers(app)
    
    # 백그라운드 스레드 시작
    if config_name != 'testing':
        start_background_threads(app)
    
    return app


def register_blueprints(app):
    """API Blueprint 등록"""
    from .api.api_band import band_bp
    from .api.api_nervestim import nervestim_bp
    from .api.api_create import create_api_blueprints
    
    # 커스텀 API
    app.register_blueprint(band_bp, url_prefix='/api/Wellsafer/v1')
    app.register_blueprint(nervestim_bp, url_prefix='/api/Wellsafer/v1')
    
    # Flask-Restless 자동 생성 API
    create_api_blueprints(app)


def register_mqtt_handlers(app):
    """MQTT 핸들러 등록"""
    from .api import mqtt as mqtt_handler
    from .api import mqtt_nervestim
    
    mqtt_handler.register_handlers(mqtt, socketio, app)
    mqtt_nervestim.register_handlers(mqtt, socketio, app)


def register_socket_handlers(app):
    """SocketIO 핸들러 등록"""
    from .api import socket
    socket.register_handlers(socketio, app)


def start_background_threads(app):
    """백그라운드 스레드 시작"""
    from .api import thread
    thread.start_threads(app, socketio)
