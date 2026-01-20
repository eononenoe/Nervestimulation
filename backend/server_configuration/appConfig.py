# -*- coding: utf-8 -*-
"""
환경별 설정 모듈
Development, Production, Testing 환경에 따른 설정 관리
"""

import os
from datetime import timedelta


class Config:
    """기본 설정 클래스"""
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'wellsafer-secret-key-change-in-production')
    BIND_PORT = int(os.environ.get('BIND_PORT', 5000))
    
    # SQLAlchemy
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_POOL_SIZE = 10
    SQLALCHEMY_MAX_OVERFLOW = 20
    SQLALCHEMY_POOL_TIMEOUT = 30
    SQLALCHEMY_POOL_RECYCLE = 3600
    SQLALCHEMY_POOL_PRE_PING = True
    
    # MQTT (원격 브로커)
    MQTT_BROKER_URL = os.environ.get('MQTT_BROKER_URL', '3.36.149.129')
    MQTT_BROKER_PORT = int(os.environ.get('MQTT_BROKER_PORT', 18831))
    MQTT_USERNAME = os.environ.get('MQTT_USERNAME', 'admin_user')
    MQTT_PASSWORD = os.environ.get('MQTT_PASSWORD', 'Psalms23##cross')
    MQTT_KEEPALIVE = 60
    MQTT_TLS_ENABLED = False
    
    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # CORS
    CORS_ORIGINS = '*'
    
    # SMS
    SMS_API_KEY = os.environ.get('SMS_API_KEY', '')
    SMS_SENDER_NUMBER = os.environ.get('SMS_SENDER_NUMBER', '')


class DevelopmentConfig(Config):
    """개발 환경 설정"""
    DEBUG = True
    TESTING = False

    # Database (원격 서버)
    # 비밀번호의 @ 기호를 %40으로 URL 인코딩
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://dbadmin:p%40ssw0rd@3.36.149.129:3306/naas?charset=utf8mb4'
    )

    # MQTT (원격 브로커)
    MQTT_BROKER_URL = '3.36.149.129'
    MQTT_BROKER_PORT = 18831


class ProductionConfig(Config):
    """운영 환경 설정"""
    DEBUG = False
    TESTING = False
    
    # Database (AWS RDS)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    
    # MQTT (EC2)
    MQTT_BROKER_URL = os.environ.get('MQTT_BROKER_URL')
    MQTT_BROKER_PORT = int(os.environ.get('MQTT_BROKER_PORT', 18831))
    MQTT_TLS_ENABLED = True
    
    # CORS (특정 도메인만 허용)
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'https://wellsafer.com')


class TestingConfig(Config):
    """테스트 환경 설정"""
    DEBUG = False
    TESTING = True
    
    # Database (테스트용 SQLite)
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # MQTT 비활성화
    MQTT_BROKER_URL = None


# 설정 매핑
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
