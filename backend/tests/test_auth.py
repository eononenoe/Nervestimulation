# -*- coding: utf-8 -*-
"""
인증 API 테스트
"""

import pytest
import json


class TestAuthAPI:
    """인증 API 테스트"""
    
    def test_login_success(self, app, client):
        """로그인 성공 테스트"""
        # API Blueprint 등록
        from api.auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/api/Wellsafer/v1/auth')
        
        response = client.post(
            '/api/Wellsafer/v1/auth/login',
            json={'user_id': 'admin', 'password': 'admin1234'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'token' in data['data']
        assert data['data']['user']['user_id'] == 'admin'
    
    def test_login_invalid_credentials(self, app, client):
        """잘못된 인증정보 테스트"""
        from api.auth import auth_bp
        if 'auth' not in [bp.name for bp in app.blueprints.values()]:
            app.register_blueprint(auth_bp, url_prefix='/api/Wellsafer/v1/auth')
        
        response = client.post(
            '/api/Wellsafer/v1/auth/login',
            json={'user_id': 'admin', 'password': 'wrongpassword'}
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['success'] is False
    
    def test_login_missing_fields(self, app, client):
        """필수 필드 누락 테스트"""
        from api.auth import auth_bp
        if 'auth' not in [bp.name for bp in app.blueprints.values()]:
            app.register_blueprint(auth_bp, url_prefix='/api/Wellsafer/v1/auth')
        
        response = client.post(
            '/api/Wellsafer/v1/auth/login',
            json={'user_id': 'admin'}
        )
        
        assert response.status_code == 400
    
    def test_get_current_user(self, app, client, auth_headers):
        """현재 사용자 조회 테스트"""
        from api.auth import auth_bp
        if 'auth' not in [bp.name for bp in app.blueprints.values()]:
            app.register_blueprint(auth_bp, url_prefix='/api/Wellsafer/v1/auth')
        
        response = client.get(
            '/api/Wellsafer/v1/auth/me',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['user']['user_id'] == 'admin'
    
    def test_unauthorized_access(self, app, client):
        """인증 없이 접근 테스트"""
        from api.auth import auth_bp
        if 'auth' not in [bp.name for bp in app.blueprints.values()]:
            app.register_blueprint(auth_bp, url_prefix='/api/Wellsafer/v1/auth')
        
        response = client.get('/api/Wellsafer/v1/auth/me')
        
        assert response.status_code == 401
