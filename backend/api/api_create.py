# -*- coding: utf-8 -*-
"""
Flask-Restless 기반 자동 CRUD API 생성 모듈
ORM 모델로부터 RESTful API 자동 생성
"""

from flask_restless import APIManager
from backend import db
from backend.db.table import User, Group, Band, SensorData, Event


def create_api_blueprints(app):
    """
    Flask-Restless를 사용하여 CRUD API 자동 생성
    
    생성되는 API:
        GET /api/Wellsafer/v1/{resource}       - 목록 조회
        GET /api/Wellsafer/v1/{resource}/{id}  - 단건 조회
        POST /api/Wellsafer/v1/{resource}      - 생성
        PUT /api/Wellsafer/v1/{resource}/{id}  - 수정
        DELETE /api/Wellsafer/v1/{resource}/{id} - 삭제
    """
    manager = APIManager(app, flask_sqlalchemy_db=db)
    
    # 공통 전처리기
    def auth_preprocessor(instance_id=None, **kwargs):
        """인증 확인 전처리기"""
        # 실제로는 JWT 토큰 검증 로직
        pass
    
    def validate_input(data=None, **kwargs):
        """입력값 검증 전처리기"""
        # 필수 필드 검증 등
        pass
    
    # 밴드 API (전체 CRUD)
    manager.create_api(
        Band,
        url_prefix='/api/Wellsafer/v1',
        collection_name='bands',
        methods=['GET', 'POST', 'PUT', 'DELETE'],
        preprocessors={
            'GET_SINGLE': [auth_preprocessor],
            'GET_MANY': [auth_preprocessor],
            'POST': [auth_preprocessor, validate_input],
            'PUT_SINGLE': [auth_preprocessor],
            'DELETE_SINGLE': [auth_preprocessor]
        },
        exclude_columns=['password'] if hasattr(Band, 'password') else []
    )
    
    # 사용자 API (전체 CRUD)
    manager.create_api(
        User,
        url_prefix='/api/Wellsafer/v1',
        collection_name='users',
        methods=['GET', 'POST', 'PUT', 'DELETE'],
        preprocessors={
            'GET_SINGLE': [auth_preprocessor],
            'GET_MANY': [auth_preprocessor],
            'POST': [auth_preprocessor, validate_input],
            'PUT_SINGLE': [auth_preprocessor],
            'DELETE_SINGLE': [auth_preprocessor]
        },
        exclude_columns=['password']
    )
    
    # 그룹 API (전체 CRUD)
    manager.create_api(
        Group,
        url_prefix='/api/Wellsafer/v1',
        collection_name='groups',
        methods=['GET', 'POST', 'PUT', 'DELETE'],
        preprocessors={
            'GET_SINGLE': [auth_preprocessor],
            'GET_MANY': [auth_preprocessor],
            'POST': [auth_preprocessor],
            'PUT_SINGLE': [auth_preprocessor],
            'DELETE_SINGLE': [auth_preprocessor]
        }
    )
    
    # 센서데이터 API (읽기 전용)
    manager.create_api(
        SensorData,
        url_prefix='/api/Wellsafer/v1',
        collection_name='sensordata',
        methods=['GET'],  # 읽기만 허용
        preprocessors={
            'GET_SINGLE': [auth_preprocessor],
            'GET_MANY': [auth_preprocessor]
        }
    )
    
    # 이벤트 API (읽기 전용)
    manager.create_api(
        Event,
        url_prefix='/api/Wellsafer/v1',
        collection_name='events',
        methods=['GET'],  # 읽기만 허용
        preprocessors={
            'GET_SINGLE': [auth_preprocessor],
            'GET_MANY': [auth_preprocessor]
        }
    )
    
    return manager
