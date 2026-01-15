# -*- coding: utf-8 -*-
"""
공통 유틸리티 함수 모듈
"""

import re
import hashlib
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g
import jwt


def generate_session_id():
    """
    고유한 세션 ID 생성
    
    Returns:
        str: 세션 ID (예: STIM-20250115-ABC123)
    """
    date_str = datetime.now().strftime('%Y%m%d')
    random_str = secrets.token_hex(3).upper()
    return f"STIM-{date_str}-{random_str}"


def generate_token(length=32):
    """
    랜덤 토큰 생성
    
    Args:
        length: 토큰 길이
        
    Returns:
        str: 랜덤 토큰
    """
    return secrets.token_urlsafe(length)


def hash_password(password):
    """
    비밀번호 해싱 (bcrypt)
    
    Args:
        password: 평문 비밀번호
        
    Returns:
        str: 해싱된 비밀번호
    """
    import bcrypt
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password, hashed):
    """
    비밀번호 검증

    Args:
        password: 평문 비밀번호
        hashed: 해싱된 비밀번호

    Returns:
        bool: 일치 여부
    """
    from werkzeug.security import check_password_hash
    return check_password_hash(hashed, password)


def create_jwt_token(user_id, secret_key, expires_hours=24):
    """
    JWT 토큰 생성
    
    Args:
        user_id: 사용자 ID
        secret_key: 시크릿 키
        expires_hours: 만료 시간 (시간)
        
    Returns:
        str: JWT 토큰
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=expires_hours),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, secret_key, algorithm='HS256')


def decode_jwt_token(token, secret_key):
    """
    JWT 토큰 디코딩
    
    Args:
        token: JWT 토큰
        secret_key: 시크릿 키
        
    Returns:
        dict: 페이로드 또는 None
    """
    try:
        return jwt.decode(token, secret_key, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """
    JWT 토큰 검증 데코레이터
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import current_app
        from backend.db.models import User
        
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
            
        payload = decode_jwt_token(token, current_app.config['JWT_SECRET_KEY'])
        
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
            
        user = User.query.get(payload['user_id'])
        
        if not user or not user.is_active:
            return jsonify({'error': 'User not found'}), 401
            
        g.current_user = user
        
        return f(*args, **kwargs)
        
    return decorated


def admin_required(f):
    """
    관리자 권한 필요 데코레이터
    """
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if g.current_user.level > 1:
            return jsonify({'error': 'Admin permission required'}), 403
        return f(*args, **kwargs)
    return decorated


# ============================================================
# 데이터 변환 유틸리티
# ============================================================

def parse_datetime(dt_string, default=None):
    """
    문자열을 datetime으로 파싱
    
    Args:
        dt_string: 날짜/시간 문자열
        default: 기본값
        
    Returns:
        datetime: 파싱된 datetime
    """
    if not dt_string:
        return default
        
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%Y-%m-%d',
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(dt_string, fmt)
        except ValueError:
            continue
            
    return default


def format_datetime(dt, fmt='%Y-%m-%d %H:%M:%S'):
    """
    datetime을 문자열로 포맷
    
    Args:
        dt: datetime 객체
        fmt: 포맷 문자열
        
    Returns:
        str: 포맷된 문자열
    """
    if not dt:
        return None
    return dt.strftime(fmt)


def safe_int(value, default=0):
    """안전한 int 변환"""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_float(value, default=0.0):
    """안전한 float 변환"""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


# ============================================================
# 검증 유틸리티
# ============================================================

def validate_phone(phone):
    """
    전화번호 유효성 검사
    
    Args:
        phone: 전화번호
        
    Returns:
        bool: 유효 여부
    """
    if not phone:
        return False
    digits = re.sub(r'[^\d]', '', phone)
    return len(digits) in [10, 11] and digits.startswith('01')


def validate_email(email):
    """
    이메일 유효성 검사
    
    Args:
        email: 이메일 주소
        
    Returns:
        bool: 유효 여부
    """
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_bid(bid):
    """
    밴드 ID (IMEI) 유효성 검사
    
    Args:
        bid: 밴드 ID
        
    Returns:
        bool: 유효 여부
    """
    if not bid:
        return False
    return len(bid) == 15 and bid.isdigit()


def validate_stim_level(level):
    """
    자극 강도 유효성 검사
    
    Args:
        level: 자극 강도
        
    Returns:
        bool: 유효 여부
    """
    try:
        level = int(level)
        return 1 <= level <= 10
    except (ValueError, TypeError):
        return False


# ============================================================
# 페이지네이션 유틸리티
# ============================================================

def paginate_query(query, page=1, per_page=20, max_per_page=100):
    """
    쿼리 페이지네이션
    
    Args:
        query: SQLAlchemy 쿼리
        page: 페이지 번호
        per_page: 페이지당 항목 수
        max_per_page: 최대 페이지당 항목 수
        
    Returns:
        dict: 페이지네이션 결과
    """
    page = max(1, safe_int(page, 1))
    per_page = min(max_per_page, max(1, safe_int(per_page, 20)))
    
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        'items': items,
        'page': page,
        'per_page': per_page,
        'total': total,
        'pages': (total + per_page - 1) // per_page,
        'has_prev': page > 1,
        'has_next': page * per_page < total
    }


def get_pagination_params():
    """
    요청에서 페이지네이션 파라미터 추출
    
    Returns:
        tuple: (page, per_page)
    """
    page = safe_int(request.args.get('page'), 1)
    per_page = safe_int(request.args.get('per_page'), 20)
    return page, per_page


# ============================================================
# 응답 유틸리티
# ============================================================

def success_response(data=None, message=None, status_code=200):
    """
    성공 응답 생성
    
    Args:
        data: 응답 데이터
        message: 메시지
        status_code: HTTP 상태 코드
        
    Returns:
        tuple: (Response, status_code)
    """
    response = {'success': True}
    
    if data is not None:
        response['data'] = data
    if message:
        response['message'] = message
        
    return jsonify(response), status_code


def error_response(message, status_code=400, error_code=None):
    """
    에러 응답 생성
    
    Args:
        message: 에러 메시지
        status_code: HTTP 상태 코드
        error_code: 에러 코드
        
    Returns:
        tuple: (Response, status_code)
    """
    response = {
        'success': False,
        'error': message
    }
    
    if error_code:
        response['error_code'] = error_code
        
    return jsonify(response), status_code


# ============================================================
# 위치 관련 유틸리티
# ============================================================

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    두 좌표 간 거리 계산 (미터)
    
    Args:
        lat1, lon1: 좌표 1
        lat2, lon2: 좌표 2
        
    Returns:
        float: 거리 (미터)
    """
    import math
    
    R = 6371000  # 지구 반경 (미터)
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def is_in_geofence(lat, lon, fence_lat, fence_lon, radius):
    """
    지오펜스 내 위치 여부 확인
    
    Args:
        lat, lon: 현재 위치
        fence_lat, fence_lon: 지오펜스 중심
        radius: 지오펜스 반경 (미터)
        
    Returns:
        bool: 펜스 내 위치 여부
    """
    distance = calculate_distance(lat, lon, fence_lat, fence_lon)
    return distance <= radius
