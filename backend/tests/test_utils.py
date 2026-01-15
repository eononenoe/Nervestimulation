# -*- coding: utf-8 -*-
"""
유틸리티 함수 테스트
"""

import pytest
from utils import (
    validate_phone, validate_email, validate_bid, validate_stim_level,
    generate_session_id, safe_int, safe_float,
    calculate_distance, is_in_geofence
)


class TestValidation:
    """유효성 검사 테스트"""
    
    def test_validate_phone_valid(self):
        """유효한 전화번호"""
        assert validate_phone('01012345678') is True
        assert validate_phone('010-1234-5678') is True
        assert validate_phone('0101234567') is True  # 10자리
    
    def test_validate_phone_invalid(self):
        """유효하지 않은 전화번호"""
        assert validate_phone('') is False
        assert validate_phone(None) is False
        assert validate_phone('0212345678') is False  # 01로 시작하지 않음
        assert validate_phone('123456') is False  # 너무 짧음
    
    def test_validate_email_valid(self):
        """유효한 이메일"""
        assert validate_email('test@example.com') is True
        assert validate_email('user.name@domain.co.kr') is True
    
    def test_validate_email_invalid(self):
        """유효하지 않은 이메일"""
        assert validate_email('') is False
        assert validate_email(None) is False
        assert validate_email('invalid') is False
        assert validate_email('missing@domain') is False
    
    def test_validate_bid_valid(self):
        """유효한 밴드 ID (IMEI)"""
        assert validate_bid('467191213660619') is True
        assert validate_bid('123456789012345') is True
    
    def test_validate_bid_invalid(self):
        """유효하지 않은 밴드 ID"""
        assert validate_bid('') is False
        assert validate_bid(None) is False
        assert validate_bid('12345') is False  # 너무 짧음
        assert validate_bid('46719121366061a') is False  # 문자 포함
    
    def test_validate_stim_level_valid(self):
        """유효한 자극 강도"""
        assert validate_stim_level(1) is True
        assert validate_stim_level(5) is True
        assert validate_stim_level(10) is True
        assert validate_stim_level('5') is True  # 문자열도 허용
    
    def test_validate_stim_level_invalid(self):
        """유효하지 않은 자극 강도"""
        assert validate_stim_level(0) is False
        assert validate_stim_level(11) is False
        assert validate_stim_level(-1) is False
        assert validate_stim_level('abc') is False


class TestGeneration:
    """생성 함수 테스트"""
    
    def test_generate_session_id(self):
        """세션 ID 생성"""
        session_id = generate_session_id()
        assert session_id.startswith('STIM-')
        assert len(session_id) == 20  # STIM-YYYYMMDD-XXXXXX
        
        # 고유성 테스트
        session_id2 = generate_session_id()
        assert session_id != session_id2


class TestSafeConversion:
    """안전한 타입 변환 테스트"""
    
    def test_safe_int(self):
        """안전한 int 변환"""
        assert safe_int('123') == 123
        assert safe_int(123) == 123
        assert safe_int('abc', 0) == 0
        assert safe_int(None, -1) == -1
        assert safe_int('', 99) == 99
    
    def test_safe_float(self):
        """안전한 float 변환"""
        assert safe_float('3.14') == 3.14
        assert safe_float(3.14) == 3.14
        assert safe_float('abc', 0.0) == 0.0
        assert safe_float(None, -1.0) == -1.0


class TestGeo:
    """지리 관련 함수 테스트"""
    
    def test_calculate_distance(self):
        """거리 계산"""
        # 서울시청 -> 광화문 (약 600m)
        distance = calculate_distance(
            37.5665, 126.9780,  # 서울시청
            37.5759, 126.9769   # 광화문
        )
        assert 900 < distance < 1100  # 대략 1km
    
    def test_is_in_geofence(self):
        """지오펜스 내 위치 확인"""
        # 중심점에서 100m 반경
        center_lat, center_lon = 37.5665, 126.9780
        radius = 100
        
        # 중심점 = 펜스 내
        assert is_in_geofence(center_lat, center_lon, center_lat, center_lon, radius) is True
        
        # 먼 위치 = 펜스 밖
        far_lat, far_lon = 37.5700, 126.9900
        assert is_in_geofence(far_lat, far_lon, center_lat, center_lon, radius) is False
