# -*- coding: utf-8 -*-
"""
Pytest 설정 및 공통 fixture
"""

import pytest
import os
import sys

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from db.models import db, User, Band


@pytest.fixture(scope='session')
def app():
    """테스트용 Flask 애플리케이션"""
    app = Flask(__name__)
    
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # 테스트 데이터 생성
        _create_test_data()
        
    yield app
    
    with app.app_context():
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """테스트 클라이언트"""
    return app.test_client()


@pytest.fixture(scope='function')
def auth_headers(app, client):
    """인증된 헤더"""
    from utils import create_jwt_token
    
    with app.app_context():
        user = User.query.filter_by(user_id='admin').first()
        token = create_jwt_token(user.id, app.config['JWT_SECRET_KEY'])
        
    return {'Authorization': f'Bearer {token}'}


def _create_test_data():
    """테스트 데이터 생성"""
    from utils import hash_password
    
    # 테스트 사용자
    admin = User(
        user_id='admin',
        password=hash_password('admin1234'),
        name='관리자',
        email='admin@test.com',
        level=0
    )
    db.session.add(admin)
    
    user = User(
        user_id='user1',
        password=hash_password('user1234'),
        name='테스트유저',
        email='user1@test.com',
        level=2
    )
    db.session.add(user)
    
    # 테스트 밴드
    band1 = Band(
        bid='467191213660619',
        wearer_name='홍길동',
        wearer_phone='01012345678',
        guardian_phone='01087654321',
        connect_state=1,
        battery=85
    )
    db.session.add(band1)
    
    band2 = Band(
        bid='467191213660620',
        wearer_name='김영희',
        wearer_phone='01011112222',
        connect_state=0,
        battery=45
    )
    db.session.add(band2)
    
    db.session.commit()
