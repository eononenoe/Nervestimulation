# -*- coding: utf-8 -*-
"""
기상청 API 크롤링 모듈
날씨 정보 수집 및 기상 특보 확인
"""

import requests
from datetime import datetime
from flask import current_app


# 기상청 API 설정
KMA_API_KEY = ''  # 환경변수로 관리
KMA_BASE_URL = 'http://apis.data.go.kr/1360000'


class WeatherService:
    """기상청 API 서비스"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or current_app.config.get('KMA_API_KEY', KMA_API_KEY)
    
    def get_current_weather(self, nx, ny):
        """
        초단기실황 조회
        
        Args:
            nx: 격자 X 좌표
            ny: 격자 Y 좌표
        
        Returns:
            dict: 현재 날씨 정보
        """
        url = f'{KMA_BASE_URL}/VilageFcstInfoService_2.0/getUltraSrtNcst'
        
        now = datetime.now()
        base_date = now.strftime('%Y%m%d')
        base_time = now.strftime('%H00')
        
        params = {
            'serviceKey': self.api_key,
            'numOfRows': 10,
            'pageNo': 1,
            'dataType': 'JSON',
            'base_date': base_date,
            'base_time': base_time,
            'nx': nx,
            'ny': ny,
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if response.status_code == 200:
                items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
                return self._parse_weather_data(items)
            else:
                current_app.logger.error(f"Weather API error: {data}")
                return None
                
        except Exception as e:
            current_app.logger.error(f"Weather API request failed: {e}")
            return None
    
    def _parse_weather_data(self, items):
        """API 응답 파싱"""
        weather = {}
        
        category_map = {
            'T1H': 'temperature',      # 기온 (℃)
            'RN1': 'rainfall',         # 1시간 강수량 (mm)
            'REH': 'humidity',         # 습도 (%)
            'WSD': 'wind_speed',       # 풍속 (m/s)
            'PTY': 'precipitation',    # 강수 형태
        }
        
        for item in items:
            category = item.get('category')
            if category in category_map:
                weather[category_map[category]] = item.get('obsrValue')
        
        return weather
    
    def get_weather_alerts(self, region_code='L1100000'):
        """
        기상 특보 조회
        
        Args:
            region_code: 지역 코드 (기본값: 서울)
        
        Returns:
            list: 발효 중인 특보 목록
        """
        url = f'{KMA_BASE_URL}/WthrWrnInfoService/getWthrWrnList'
        
        params = {
            'serviceKey': self.api_key,
            'numOfRows': 10,
            'pageNo': 1,
            'dataType': 'JSON',
            'stnId': region_code,
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if response.status_code == 200:
                items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
                return self._parse_alert_data(items)
            else:
                return []
                
        except Exception as e:
            current_app.logger.error(f"Weather alert API failed: {e}")
            return []
    
    def _parse_alert_data(self, items):
        """특보 데이터 파싱"""
        alerts = []
        
        for item in items:
            alert = {
                'title': item.get('title'),
                'announcement_time': item.get('tmFc'),
                'effective_time': item.get('tmEf'),
                'content': item.get('other'),
            }
            alerts.append(alert)
        
        return alerts
    
    def check_extreme_weather(self, lat, lng):
        """
        위험 기상 상황 확인
        
        Args:
            lat: 위도
            lng: 경도
        
        Returns:
            dict: 위험 상황 정보
        """
        # 위경도 → 격자 좌표 변환 (간략화)
        nx, ny = self._convert_to_grid(lat, lng)
        
        weather = self.get_current_weather(nx, ny)
        alerts = self.get_weather_alerts()
        
        warnings = []
        
        if weather:
            # 폭염 확인 (33도 이상)
            temp = float(weather.get('temperature', 0))
            if temp >= 33:
                warnings.append({
                    'type': 'heat_wave',
                    'level': 'warning' if temp >= 35 else 'advisory',
                    'value': temp,
                    'message': f'폭염 주의: 현재 기온 {temp}°C'
                })
            
            # 한파 확인 (-12도 이하)
            if temp <= -12:
                warnings.append({
                    'type': 'cold_wave',
                    'level': 'warning' if temp <= -15 else 'advisory',
                    'value': temp,
                    'message': f'한파 주의: 현재 기온 {temp}°C'
                })
        
        # 특보 확인
        for alert in alerts:
            if '폭염' in alert.get('title', ''):
                warnings.append({
                    'type': 'heat_wave_alert',
                    'level': 'alert',
                    'message': alert.get('title')
                })
            elif '한파' in alert.get('title', ''):
                warnings.append({
                    'type': 'cold_wave_alert',
                    'level': 'alert',
                    'message': alert.get('title')
                })
        
        return {
            'weather': weather,
            'warnings': warnings,
            'has_warning': len(warnings) > 0
        }
    
    def _convert_to_grid(self, lat, lng):
        """
        위경도 → 기상청 격자 좌표 변환 (간략화된 버전)
        실제로는 복잡한 Lambert Conformal Conic 투영 사용
        """
        # 간략화된 변환 (서울 기준 근사값)
        nx = int((lng - 124.0) * 10 + 1)
        ny = int((lat - 33.0) * 10 + 1)
        return nx, ny


# 전역 인스턴스
weather_service = WeatherService()


def get_weather_for_location(lat, lng):
    """특정 위치의 날씨 정보 조회"""
    return weather_service.check_extreme_weather(lat, lng)


def check_weather_alerts():
    """기상 특보 확인 (스케줄러용)"""
    alerts = weather_service.get_weather_alerts()
    
    if alerts:
        current_app.logger.info(f"Active weather alerts: {len(alerts)}")
    
    return alerts
