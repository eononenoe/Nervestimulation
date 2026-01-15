# -*- coding: utf-8 -*-
"""
MQTT 메시지 핸들러 모듈
스마트밴드에서 전송되는 생체신호, GPS, 이벤트 데이터 처리
"""

import json
from datetime import datetime
from flask import current_app

from backend.db.service import query, select
from backend.db.table import EventType
from backend.sms import send_sms


# 구독 토픽 목록
SUBSCRIBE_TOPICS = [
    '/DT/eHG4/SensorData/#',      # 생체신호 데이터
    '/DT/eHG4/Location/#',        # GPS/RF 위치 데이터
    '/DT/eHG4/Event/#',           # 이벤트 (낙상, SOS 등)
    '/DT/eHG4/Status/#',          # 디바이스 상태
]


def register_handlers(mqtt, socketio, app):
    """MQTT 핸들러 등록"""
    
    @mqtt.on_connect()
    def on_connect(client, userdata, flags, rc):
        """MQTT 브로커 연결 시"""
        if rc == 0:
            app.logger.info("MQTT connected successfully")
            # 토픽 구독
            for topic in SUBSCRIBE_TOPICS:
                mqtt.subscribe(topic)
                app.logger.info(f"Subscribed to {topic}")
        else:
            app.logger.error(f"MQTT connection failed with code {rc}")
    
    @mqtt.on_disconnect()
    def on_disconnect(client, userdata, rc):
        """MQTT 연결 해제 시"""
        app.logger.warning(f"MQTT disconnected with code {rc}")
    
    @mqtt.on_message()
    def on_message(client, userdata, message):
        """MQTT 메시지 수신 시"""
        topic = message.topic
        
        try:
            payload = json.loads(message.payload.decode('utf-8'))
        except json.JSONDecodeError:
            app.logger.error(f"Invalid JSON payload on topic {topic}")
            return
        
        with app.app_context():
            try:
                # 토픽에 따른 처리 분기
                if '/SensorData/' in topic:
                    handle_sensor_data(payload, socketio, app)
                elif '/Location/' in topic:
                    handle_location_data(payload, socketio, app)
                elif '/Event/' in topic:
                    handle_event_data(payload, socketio, app)
                elif '/Status/' in topic:
                    handle_status_data(payload, socketio, app)
            except Exception as e:
                app.logger.error(f"Error handling message: {e}")


def handle_sensor_data(payload, socketio, app):
    """
    생체신호 데이터 처리
    
    Payload:
        bid: 밴드 ID
        timestamp: Unix timestamp (ms)
        hr: 심박수
        spo2: 산소포화도
        hrv_sdnn: HRV SDNN
        hrv_rmssd: HRV RMSSD
        skin_temp: 피부온도
        steps: 걸음수
        ...
    """
    bid = payload.get('bid')
    if not bid:
        return
    
    # 밴드 확인
    band = select.get_band_by_bid(bid)
    if not band:
        app.logger.warning(f"Unknown band: {bid}")
        return
    
    # timestamp 변환
    timestamp = payload.get('timestamp')
    if timestamp:
        dt = datetime.fromtimestamp(timestamp / 1000)
    else:
        dt = datetime.utcnow()
    
    # 센서 데이터 저장
    sensor_data = {
        'datetime': dt,
        'hr': payload.get('hr'),
        'spo2': payload.get('spo2'),
        'hrv_sdnn': payload.get('hrv_sdnn'),
        'hrv_rmssd': payload.get('hrv_rmssd'),
        'skin_temp': payload.get('skin_temp'),
        'acc_x': payload.get('acc_x'),
        'acc_y': payload.get('acc_y'),
        'acc_z': payload.get('acc_z'),
        'gyro_x': payload.get('gyro_x'),
        'gyro_y': payload.get('gyro_y'),
        'gyro_z': payload.get('gyro_z'),
        'steps': payload.get('steps'),
        'activity_type': payload.get('activity_type'),
        'calories': payload.get('calories')
    }
    
    query.insert_sensordata(band.id, sensor_data)
    query.update_band_last_data(bid)
    
    # 이상치 감지 및 이벤트 생성
    check_vital_alerts(band, payload, socketio, app)
    
    # WebSocket으로 실시간 전송
    socketio.emit('sensor_update', {
        'bid': bid,
        'datetime': dt.isoformat(),
        **{k: v for k, v in sensor_data.items() if v is not None and k != 'datetime'}
    })


def handle_location_data(payload, socketio, app):
    """
    위치 데이터 처리
    
    Payload:
        bid: 밴드 ID
        latitude: 위도
        longitude: 경도
        accuracy: 정확도 (m)
        location_type: GPS/RF
        address: 주소 (선택)
    """
    bid = payload.get('bid')
    if not bid:
        return
    
    lat = payload.get('latitude')
    lng = payload.get('longitude')
    
    if lat is None or lng is None:
        return
    
    # 위치 업데이트
    query.update_band_location(
        bid,
        lat,
        lng,
        payload.get('address'),
        payload.get('location_type', 'GPS')
    )
    
    # WebSocket으로 실시간 전송
    socketio.emit('location_update', {
        'bid': bid,
        'latitude': lat,
        'longitude': lng,
        'location_type': payload.get('location_type', 'GPS')
    })


def handle_event_data(payload, socketio, app):
    """
    이벤트 데이터 처리 (낙상, SOS 버튼 등)
    
    Payload:
        bid: 밴드 ID
        event_type: 이벤트 유형
        event_level: 심각도
        value: 관련 수치
        latitude: 위도
        longitude: 경도
    """
    bid = payload.get('bid')
    event_type = payload.get('event_type')
    
    if not bid or not event_type:
        return
    
    band = select.get_band_by_bid(bid)
    if not band:
        return
    
    event_level = payload.get('event_level', 2)
    value = payload.get('value')
    
    # 이벤트 메시지 생성
    message = _generate_event_message(event_type, band.wearer_name, value)
    
    # 이벤트 저장
    event_id = query.insert_event(
        band.id,
        event_type,
        event_level,
        value,
        message,
        payload.get('latitude'),
        payload.get('longitude')
    )
    
    # WebSocket 알림
    socketio.emit('alert_new', {
        'id': event_id,
        'bid': bid,
        'type': event_type,
        'level': event_level,
        'message': message,
        'datetime': datetime.utcnow().isoformat()
    })
    
    # 긴급 이벤트는 SMS 발송
    if event_level >= 3 and band.guardian_phone:
        try:
            send_sms.send_alert_sms(
                band.guardian_phone,
                message,
                event_type
            )
            query.update_event_sms_sent(event_id)
        except Exception as e:
            app.logger.error(f"SMS send failed: {e}")


def handle_status_data(payload, socketio, app):
    """
    디바이스 상태 데이터 처리
    
    Payload:
        bid: 밴드 ID
        battery: 배터리 잔량
        connect_state: 연결 상태
        firmware_version: 펌웨어 버전
    """
    bid = payload.get('bid')
    if not bid:
        return
    
    update_data = {}
    
    if 'battery' in payload:
        update_data['battery'] = payload['battery']
        
        # 배터리 부족 알림
        if payload['battery'] < 10:
            band = select.get_band_by_bid(bid)
            if band:
                query.insert_event(
                    band.id,
                    EventType.BATTERY_LOW,
                    1,  # 정보 레벨
                    payload['battery'],
                    f"{band.wearer_name}님 밴드 배터리 {payload['battery']}%"
                )
    
    if 'connect_state' in payload:
        update_data['connect_state'] = payload['connect_state']
    
    if 'firmware_version' in payload:
        update_data['firmware_version'] = payload['firmware_version']
    
    if update_data:
        query.update_band_status(bid, **update_data)
        
        # WebSocket 알림
        socketio.emit('band_status', {
            'bid': bid,
            'status': 'online' if update_data.get('connect_state') == 1 else 'offline',
            **update_data
        })


def check_vital_alerts(band, data, socketio, app):
    """생체신호 이상치 감지"""
    hr = data.get('hr')
    spo2 = data.get('spo2')
    
    # 심박수 이상
    if hr:
        if hr > 150:
            _create_vital_alert(band, EventType.HR_HIGH, 3, hr, 
                               f"{band.wearer_name}님 심박수 높음 ({hr}bpm)", socketio)
        elif hr < 40:
            _create_vital_alert(band, EventType.HR_LOW, 3, hr,
                               f"{band.wearer_name}님 심박수 낮음 ({hr}bpm)", socketio)
    
    # 산소포화도 이상
    if spo2 and spo2 < 90:
        _create_vital_alert(band, EventType.SPO2_LOW, 3, spo2,
                           f"{band.wearer_name}님 산소포화도 저하 ({spo2}%)", socketio)


def _create_vital_alert(band, event_type, level, value, message, socketio):
    """생체신호 이상 이벤트 생성"""
    event_id = query.insert_event(band.id, event_type, level, value, message)
    
    socketio.emit('alert_new', {
        'id': event_id,
        'bid': band.bid,
        'type': event_type,
        'level': level,
        'message': message,
        'datetime': datetime.utcnow().isoformat()
    })
    
    # SMS 발송
    if band.guardian_phone:
        try:
            send_sms.send_alert_sms(band.guardian_phone, message, event_type)
            query.update_event_sms_sent(event_id)
        except:
            pass


def _generate_event_message(event_type, wearer_name, value=None):
    """이벤트 유형별 메시지 생성"""
    messages = {
        EventType.FALL_DETECTED: f"[긴급] {wearer_name}님 낙상 감지",
        EventType.HR_HIGH: f"[주의] {wearer_name}님 심박수 높음 ({value}bpm)",
        EventType.HR_LOW: f"[주의] {wearer_name}님 심박수 낮음 ({value}bpm)",
        EventType.SPO2_LOW: f"[주의] {wearer_name}님 산소포화도 저하 ({value}%)",
        EventType.BATTERY_LOW: f"[알림] {wearer_name}님 밴드 배터리 부족 ({value}%)",
        EventType.SOS_BUTTON: f"[긴급] {wearer_name}님 SOS 버튼 누름",
        EventType.GEOFENCE_EXIT: f"[주의] {wearer_name}님 안전 구역 이탈",
    }
    return messages.get(event_type, f"[알림] {wearer_name}님 이벤트 발생")
