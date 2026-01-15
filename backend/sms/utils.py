# -*- coding: utf-8 -*-
"""
SMS 유틸리티 모듈
전화번호 형식화, 메시지 템플릿 관리
"""

import re


def format_phone_number(phone):
    """
    전화번호 형식 정규화
    
    다양한 형식의 전화번호를 하이픈 없는 형태로 변환
    예: '010-1234-5678' -> '01012345678'
        '+82-10-1234-5678' -> '01012345678'
    
    Args:
        phone: 원본 전화번호 문자열
    
    Returns:
        str: 정규화된 전화번호 (숫자만) 또는 None (유효하지 않은 경우)
    """
    if not phone:
        return None
    
    # 숫자만 추출
    digits = re.sub(r'[^\d]', '', phone)
    
    # 국제번호 처리 (+82 -> 0)
    if digits.startswith('82'):
        digits = '0' + digits[2:]
    
    # 유효성 검사 (한국 휴대폰 번호: 010, 011, 016, 017, 018, 019)
    if len(digits) == 10:
        # 구형 번호 (01X-XXX-XXXX)
        if digits.startswith(('011', '016', '017', '018', '019')):
            return digits
    elif len(digits) == 11:
        # 신형 번호 (010-XXXX-XXXX)
        if digits.startswith('010'):
            return digits
    
    # 유효하지 않은 번호
    return None


def format_display_phone(phone):
    """
    표시용 전화번호 형식화
    
    예: '01012345678' -> '010-1234-5678'
    
    Args:
        phone: 숫자만 있는 전화번호
    
    Returns:
        str: 하이픈이 포함된 전화번호
    """
    if not phone:
        return None
    
    digits = re.sub(r'[^\d]', '', phone)
    
    if len(digits) == 11:
        return f'{digits[:3]}-{digits[3:7]}-{digits[7:]}'
    elif len(digits) == 10:
        return f'{digits[:3]}-{digits[3:6]}-{digits[6:]}'
    
    return phone


# ============================================================
# 메시지 템플릿
# ============================================================

MESSAGE_TEMPLATES = {
    # 긴급 알림
    'fall_detected': '[긴급] {name}님 낙상이 감지되었습니다. 위치: {location}',
    'sos_button': '[긴급] {name}님이 SOS 버튼을 눌렀습니다. 위치: {location}',
    
    # 생체신호 이상
    'hr_high': '[주의] {name}님 심박수가 높습니다 ({value}bpm). 확인이 필요합니다.',
    'hr_low': '[주의] {name}님 심박수가 낮습니다 ({value}bpm). 확인이 필요합니다.',
    'spo2_low': '[주의] {name}님 산소포화도가 저하되었습니다 ({value}%). 확인이 필요합니다.',
    
    # 디바이스 알림
    'battery_low': '[알림] {name}님 밴드 배터리가 부족합니다 ({value}%). 충전이 필요합니다.',
    'device_offline': '[알림] {name}님 밴드 연결이 끊겼습니다. 확인이 필요합니다.',
    
    # 위치 알림
    'geofence_exit': '[주의] {name}님이 안전 구역을 벗어났습니다. 현재 위치: {location}',
    
    # 신경자극 관련
    'stim_complete': '[알림] {name}님 신경자극 세션이 완료되었습니다. 총 {duration}분 진행.',
    'stim_error': '[주의] {name}님 신경자극 중 오류가 발생했습니다. 확인이 필요합니다.',
    'stimulator_disconnected': '[알림] {name}님 신경자극기 연결이 해제되었습니다.',
    
    # 기본
    'default': '[Wellsafer] {message}'
}


def get_message_template(template_name, **kwargs):
    """
    템플릿 기반 메시지 생성
    
    Args:
        template_name: 템플릿 이름
        **kwargs: 템플릿 변수 (name, value, location 등)
    
    Returns:
        str: 완성된 메시지
    """
    template = MESSAGE_TEMPLATES.get(template_name, MESSAGE_TEMPLATES['default'])
    
    try:
        return template.format(**kwargs)
    except KeyError as e:
        # 누락된 변수가 있으면 기본값으로 대체
        return template.format(**{k: kwargs.get(k, '') for k in get_template_vars(template)})


def get_template_vars(template):
    """템플릿에서 변수 목록 추출"""
    import string
    formatter = string.Formatter()
    return [field_name for _, field_name, _, _ in formatter.parse(template) if field_name]


# ============================================================
# 메시지 유효성 검사
# ============================================================

MAX_SMS_LENGTH = 90  # 한글 기준 SMS 최대 길이
MAX_LMS_LENGTH = 2000  # LMS 최대 길이


def validate_message(message):
    """
    메시지 유효성 검사
    
    Args:
        message: 메시지 내용
    
    Returns:
        dict: {'valid': bool, 'type': 'SMS'/'LMS', 'length': int}
    """
    if not message:
        return {'valid': False, 'type': None, 'length': 0, 'error': 'Empty message'}
    
    length = len(message)
    
    if length > MAX_LMS_LENGTH:
        return {
            'valid': False,
            'type': 'LMS',
            'length': length,
            'error': f'Message too long (max {MAX_LMS_LENGTH} chars)'
        }
    
    msg_type = 'SMS' if length <= MAX_SMS_LENGTH else 'LMS'
    
    return {
        'valid': True,
        'type': msg_type,
        'length': length
    }


def truncate_message(message, max_length=MAX_SMS_LENGTH):
    """
    메시지 길이 제한
    
    Args:
        message: 원본 메시지
        max_length: 최대 길이
    
    Returns:
        str: 잘린 메시지 (말줄임표 포함)
    """
    if not message or len(message) <= max_length:
        return message
    
    return message[:max_length - 3] + '...'
