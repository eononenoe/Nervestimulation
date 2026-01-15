# -*- coding: utf-8 -*-
"""
API 모듈 초기화
Blueprint 등록
"""

# 기존 모듈 (레거시 호환)
from . import api_band
from . import api_nervestim
# from . import api_create  # SQLAlchemy 2.0 호환 문제로 비활성화
from . import mqtt
from . import mqtt_nervestim
from . import socket
from . import thread

# 새로운 Blueprint 기반 API
from .auth import auth_bp
from .dashboard import dashboard_bp
from .bands import bands_bp
from .nervestim import nervestim_bp
from .events import events_bp


def register_blueprints(app):
    """
    Flask 애플리케이션에 Blueprint 등록
    
    Args:
        app: Flask 애플리케이션
    """
    api_prefix = '/api/Wellsafer/v1'
    
    app.register_blueprint(auth_bp, url_prefix=f'{api_prefix}/auth')
    app.register_blueprint(dashboard_bp, url_prefix=f'{api_prefix}/dashboard')
    app.register_blueprint(bands_bp, url_prefix=f'{api_prefix}/bands')
    app.register_blueprint(nervestim_bp, url_prefix=f'{api_prefix}/nervestim')
    app.register_blueprint(events_bp, url_prefix=f'{api_prefix}/events')
    
    app.logger.info(f"API blueprints registered with prefix: {api_prefix}")
