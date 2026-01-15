# -*- coding: utf-8 -*-
"""
인증 API 모듈
로그인, 로그아웃, 사용자 관리
"""

from flask import Blueprint, jsonify, request, g, current_app
from datetime import datetime
from backend.db.models import db, User
from backend.utils import (
    token_required, admin_required,
    verify_password, hash_password,
    create_jwt_token, success_response, error_response
)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    사용자 로그인
    
    POST /api/Wellsafer/v1/auth/login
    {
        "user_id": "admin",
        "password": "admin1234"
    }
    """
    data = request.get_json()

    if not data:
        return error_response('Request body is required', 400)

    # username 또는 user_id 둘 다 지원
    user_id = data.get('username') or data.get('user_id')
    password = data.get('password')

    if not user_id or not password:
        return error_response('username and password are required', 400)
    
    # 사용자 조회
    user = User.query.filter_by(username=user_id).first()
    
    if not user:
        return error_response('Invalid credentials', 401)
    
    if not user.is_active:
        return error_response('Account is disabled', 401)
    
    # 비밀번호 검증
    if not verify_password(password, user.password):
        return error_response('Invalid credentials', 401)
    
    # JWT 토큰 생성
    token = create_jwt_token(
        user.id,
        current_app.config['JWT_SECRET_KEY'],
        expires_hours=24
    )
    
    # 로그인 시간 업데이트 (last_logon_time 컬럼 사용)
    user.last_logon_time = datetime.utcnow()
    db.session.commit()
    
    return success_response({
        'token': token,
        'user': {
            'id': user.id,
            'user_id': user.user_id,
            'name': user.name,
            'email': user.email,
            'level': user.level
        }
    })


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    """
    사용자 로그아웃
    
    POST /api/Wellsafer/v1/auth/logout
    """
    # JWT는 stateless이므로 서버에서 특별히 할 일은 없음
    # 필요시 토큰 블랙리스트 구현 가능
    return success_response(message='Logged out successfully')


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    """
    현재 로그인 사용자 정보
    
    GET /api/Wellsafer/v1/auth/me
    """
    user = g.current_user
    
    return success_response({
        'user': {
            'id': user.id,
            'user_id': user.user_id,
            'name': user.name,
            'email': user.email,
            'phone': user.phone,
            'level': user.level,
            'created_at': user.created_at.isoformat() if user.created_at else None
        }
    })


@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    """
    비밀번호 변경
    
    POST /api/Wellsafer/v1/auth/change-password
    {
        "current_password": "old_password",
        "new_password": "new_password"
    }
    """
    data = request.get_json()
    
    if not data:
        return error_response('Request body is required', 400)
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return error_response('current_password and new_password are required', 400)
    
    if len(new_password) < 8:
        return error_response('Password must be at least 8 characters', 400)
    
    user = g.current_user
    
    # 현재 비밀번호 검증
    if not verify_password(current_password, user.password):
        return error_response('Current password is incorrect', 401)
    
    # 새 비밀번호 설정
    user.password = hash_password(new_password)
    user.updated_at = datetime.utcnow()
    db.session.commit()
    
    return success_response(message='Password changed successfully')


@auth_bp.route('/update-profile', methods=['PUT'])
@token_required
def update_profile():
    """
    프로필 수정
    
    PUT /api/Wellsafer/v1/auth/update-profile
    {
        "name": "새 이름",
        "email": "new@email.com",
        "phone": "01012345678"
    }
    """
    data = request.get_json()
    
    if not data:
        return error_response('Request body is required', 400)
    
    user = g.current_user
    
    if 'name' in data:
        user.name = data['name']
    if 'email' in data:
        user.email = data['email']
    if 'phone' in data:
        user.phone = data['phone']
    
    user.updated_at = datetime.utcnow()
    db.session.commit()
    
    return success_response({
        'user': {
            'id': user.id,
            'user_id': user.user_id,
            'name': user.name,
            'email': user.email,
            'phone': user.phone,
            'level': user.level
        }
    })


# ============================================================
# 관리자 전용 API
# ============================================================

@auth_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """
    사용자 목록 (관리자 전용)
    
    GET /api/Wellsafer/v1/auth/users
    """
    users = User.query.filter_by(is_active=True).all()
    
    return success_response([
        {
            'id': u.id,
            'user_id': u.user_id,
            'name': u.name,
            'email': u.email,
            'phone': u.phone,
            'level': u.level,
            'created_at': u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ])


@auth_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """
    사용자 생성 (관리자 전용)
    
    POST /api/Wellsafer/v1/auth/users
    {
        "user_id": "newuser",
        "password": "password123",
        "name": "새 사용자",
        "email": "new@email.com",
        "level": 2
    }
    """
    data = request.get_json()
    
    if not data:
        return error_response('Request body is required', 400)
    
    required_fields = ['user_id', 'password', 'name']
    for field in required_fields:
        if field not in data:
            return error_response(f'{field} is required', 400)
    
    # 중복 확인
    if User.query.filter_by(username=data['user_id']).first():
        return error_response('user_id already exists', 400)

    # 비밀번호 길이 검증
    if len(data['password']) < 8:
        return error_response('Password must be at least 8 characters', 400)

    user = User(
        username=data['user_id'],
        password=hash_password(data['password']),
        name=data['name'],
        email=data.get('email'),
        phone=data.get('phone'),
        level=data.get('level', 2)
    )
    
    db.session.add(user)
    db.session.commit()
    
    return success_response({
        'id': user.id,
        'user_id': user.user_id,
        'name': user.name
    }, status_code=201)


@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """
    사용자 수정 (관리자 전용)
    
    PUT /api/Wellsafer/v1/auth/users/<user_id>
    """
    user = User.query.get(user_id)
    
    if not user:
        return error_response('User not found', 404)
    
    data = request.get_json()
    
    if 'name' in data:
        user.name = data['name']
    if 'email' in data:
        user.email = data['email']
    if 'phone' in data:
        user.phone = data['phone']
    if 'level' in data:
        user.level = data['level']
    if 'password' in data and len(data['password']) >= 8:
        user.password = hash_password(data['password'])
    
    user.updated_at = datetime.utcnow()
    db.session.commit()
    
    return success_response({
        'id': user.id,
        'user_id': user.user_id,
        'name': user.name,
        'level': user.level
    })


@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """
    사용자 삭제 (비활성화, 관리자 전용)
    
    DELETE /api/Wellsafer/v1/auth/users/<user_id>
    """
    user = User.query.get(user_id)
    
    if not user:
        return error_response('User not found', 404)
    
    # 자기 자신은 삭제 불가
    if user.id == g.current_user.id:
        return error_response('Cannot delete yourself', 400)
    
    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.session.commit()
    
    return success_response(message='User deleted successfully')
