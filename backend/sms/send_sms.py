# -*- coding: utf-8 -*-
"""
SMS 발송 모듈
긴급 상황 발생 시 보호자/관리자에게 SMS 발송
"""

from flask import current_app
from .soap_request import send_soap_request
from .utils import format_phone_number, get_message_template


def send_alert_sms(phone_number, message, alert_type='default'):
    """
    알림 SMS 발송
    
    Args:
        phone_number: 수신자 전화번호
        message: 발송할 메시지
        alert_type: 알림 유형 (fall_detected, hr_high 등)
    
    Returns:
        bool: 발송 성공 여부
    """
    # 전화번호 형식 정규화
    formatted_number = format_phone_number(phone_number)
    
    if not formatted_number:
        current_app.logger.error(f"Invalid phone number: {phone_number}")
        return False
    
    # API 키 확인
    api_key = current_app.config.get('SMS_API_KEY')
    sender = current_app.config.get('SMS_SENDER_NUMBER')
    
    if not api_key or not sender:
        current_app.logger.warning("SMS API not configured")
        return False
    
    try:
        # SOAP API 호출
        result = send_soap_request(
            receiver=formatted_number,
            sender=sender,
            message=message,
            api_key=api_key
        )
        
        if result.get('success'):
            current_app.logger.info(f"SMS sent to {formatted_number}")
            return True
        else:
            current_app.logger.error(f"SMS send failed: {result.get('error')}")
            return False
            
    except Exception as e:
        current_app.logger.error(f"SMS send error: {e}")
        return False


def send_bulk_sms(phone_numbers, message):
    """
    다수의 수신자에게 SMS 일괄 발송
    
    Args:
        phone_numbers: 수신자 전화번호 목록
        message: 발송할 메시지
    
    Returns:
        dict: {'success': 성공 수, 'failed': 실패 수}
    """
    success_count = 0
    failed_count = 0
    
    for phone in phone_numbers:
        if send_alert_sms(phone, message):
            success_count += 1
        else:
            failed_count += 1
    
    return {'success': success_count, 'failed': failed_count}


def send_templated_sms(phone_number, template_name, **kwargs):
    """
    템플릿 기반 SMS 발송
    
    Args:
        phone_number: 수신자 전화번호
        template_name: 템플릿 이름
        **kwargs: 템플릿 변수
    
    Returns:
        bool: 발송 성공 여부
    """
    message = get_message_template(template_name, **kwargs)
    return send_alert_sms(phone_number, message, template_name)
