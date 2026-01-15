# -*- coding: utf-8 -*-
"""
SOAP API 요청 처리 모듈
SMS 게이트웨이와 SOAP 프로토콜 통신
"""

import requests
from xml.etree import ElementTree as ET


# SMS 게이트웨이 URL (예시)
SMS_GATEWAY_URL = "https://sms.example.com/soap/v1"


def send_soap_request(receiver, sender, message, api_key):
    """
    SOAP API로 SMS 발송 요청
    
    Args:
        receiver: 수신자 전화번호
        sender: 발신자 전화번호
        message: 메시지 내용
        api_key: API 인증키
    
    Returns:
        dict: {'success': bool, 'message_id': str, 'error': str}
    """
    # SOAP 요청 XML 생성
    soap_envelope = f'''<?xml version="1.0" encoding="UTF-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:sms="http://sms.example.com/api">
        <soap:Header>
            <sms:AuthHeader>
                <sms:ApiKey>{api_key}</sms:ApiKey>
            </sms:AuthHeader>
        </soap:Header>
        <soap:Body>
            <sms:SendSMS>
                <sms:Receiver>{receiver}</sms:Receiver>
                <sms:Sender>{sender}</sms:Sender>
                <sms:Message>{escape_xml(message)}</sms:Message>
                <sms:MessageType>SMS</sms:MessageType>
            </sms:SendSMS>
        </soap:Body>
    </soap:Envelope>'''
    
    headers = {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://sms.example.com/api/SendSMS'
    }
    
    try:
        response = requests.post(
            SMS_GATEWAY_URL,
            data=soap_envelope.encode('utf-8'),
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            return parse_soap_response(response.text)
        else:
            return {
                'success': False,
                'error': f'HTTP {response.status_code}: {response.text}'
            }
            
    except requests.Timeout:
        return {'success': False, 'error': 'Request timeout'}
    except requests.RequestException as e:
        return {'success': False, 'error': str(e)}


def parse_soap_response(xml_text):
    """
    SOAP 응답 XML 파싱
    
    Args:
        xml_text: 응답 XML 문자열
    
    Returns:
        dict: 파싱된 결과
    """
    try:
        root = ET.fromstring(xml_text)
        
        # 네임스페이스 처리
        namespaces = {
            'soap': 'http://schemas.xmlsoap.org/soap/envelope/',
            'sms': 'http://sms.example.com/api'
        }
        
        # 결과 코드 확인
        result_code = root.find('.//sms:ResultCode', namespaces)
        message_id = root.find('.//sms:MessageId', namespaces)
        
        if result_code is not None and result_code.text == '0':
            return {
                'success': True,
                'message_id': message_id.text if message_id is not None else None
            }
        else:
            error_msg = root.find('.//sms:ErrorMessage', namespaces)
            return {
                'success': False,
                'error': error_msg.text if error_msg is not None else 'Unknown error'
            }
            
    except ET.ParseError as e:
        return {'success': False, 'error': f'XML parse error: {e}'}


def escape_xml(text):
    """XML 특수문자 이스케이프"""
    if text is None:
        return ''
    
    escape_map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
    }
    
    for char, escape in escape_map.items():
        text = text.replace(char, escape)
    
    return text


# ============================================================
# 대체 구현 (zeep 라이브러리 사용)
# ============================================================

def send_soap_request_zeep(receiver, sender, message, api_key):
    """
    zeep 라이브러리를 사용한 SOAP 요청 (대체 구현)
    
    실제 WSDL URL이 있는 경우 사용
    """
    try:
        from zeep import Client
        from zeep.wsse.username import UsernameToken
        
        # WSDL 클라이언트 생성
        wsdl_url = "https://sms.example.com/soap/v1?wsdl"
        client = Client(wsdl_url)
        
        # API 호출
        result = client.service.SendSMS(
            Receiver=receiver,
            Sender=sender,
            Message=message,
            ApiKey=api_key
        )
        
        return {
            'success': result.ResultCode == 0,
            'message_id': result.MessageId,
            'error': result.ErrorMessage if result.ResultCode != 0 else None
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
