# -*- coding: utf-8 -*-
"""
밴드 API 테스트
"""

import pytest
import json


class TestBandAPI:
    """밴드 API 테스트"""
    
    def test_get_band_list(self, app, client, auth_headers):
        """밴드 목록 조회 테스트"""
        from api.bands import bands_bp
        if 'bands' not in [bp.name for bp in app.blueprints.values()]:
            app.register_blueprint(bands_bp, url_prefix='/api/Wellsafer/v1/bands')
        
        response = client.get(
            '/api/Wellsafer/v1/bands/list',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert isinstance(data['data'], list)
        assert len(data['data']) >= 2  # 테스트 데이터에 2개의 밴드가 있음
    
    def test_get_band_list_online_only(self, app, client, auth_headers):
        """온라인 밴드만 조회 테스트"""
        from api.bands import bands_bp
        if 'bands' not in [bp.name for bp in app.blueprints.values()]:
            app.register_blueprint(bands_bp, url_prefix='/api/Wellsafer/v1/bands')
        
        response = client.get(
            '/api/Wellsafer/v1/bands/list?include_offline=false',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        # 온라인 밴드만 반환
        for band in data['data']:
            assert band['connect_state'] == 1
    
    def test_get_band_detail(self, app, client, auth_headers):
        """밴드 상세 조회 테스트"""
        from api.bands import bands_bp
        if 'bands' not in [bp.name for bp in app.blueprints.values()]:
            app.register_blueprint(bands_bp, url_prefix='/api/Wellsafer/v1/bands')
        
        response = client.get(
            '/api/Wellsafer/v1/bands/467191213660619/detail',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['band']['bid'] == '467191213660619'
        assert data['data']['band']['wearer_name'] == '홍길동'
    
    def test_get_band_detail_not_found(self, app, client, auth_headers):
        """존재하지 않는 밴드 조회 테스트"""
        from api.bands import bands_bp
        if 'bands' not in [bp.name for bp in app.blueprints.values()]:
            app.register_blueprint(bands_bp, url_prefix='/api/Wellsafer/v1/bands')
        
        response = client.get(
            '/api/Wellsafer/v1/bands/999999999999999/detail',
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    def test_get_band_location(self, app, client, auth_headers):
        """밴드 위치 조회 테스트"""
        from api.bands import bands_bp
        if 'bands' not in [bp.name for bp in app.blueprints.values()]:
            app.register_blueprint(bands_bp, url_prefix='/api/Wellsafer/v1/bands')
        
        response = client.get(
            '/api/Wellsafer/v1/bands/467191213660619/location',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'bid' in data['data']
