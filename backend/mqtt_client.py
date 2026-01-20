# -*- coding: utf-8 -*-
"""
MQTT 클라이언트 모듈
스마트밴드 및 신경자극기와의 MQTT 통신 처리
"""

import json
import threading
from datetime import datetime
from flask import current_app
import paho.mqtt.client as mqtt

# backend 모듈 import (db 디렉토리와 구분하기 위해)
import backend as backend_module

# MQTT 클라이언트 인스턴스
_mqtt_client = None
_mqtt_lock = threading.Lock()

# 토픽 정의
class Topics:
    # 밴드 → 서버 (수신)
    BAND_SENSOR = "wellsafer/band/{bid}/sensor"
    BAND_LOCATION = "wellsafer/band/{bid}/location"
    BAND_STATUS = "wellsafer/band/{bid}/status"
    BAND_EVENT = "wellsafer/band/{bid}/event"
    
    # 신경자극기 → 서버 (수신)
    STIM_STATUS = "wellsafer/stim/{bid}/status"
    STIM_CONNECTED = "wellsafer/stim/{bid}/connected"
    STIM_DISCONNECTED = "wellsafer/stim/{bid}/disconnected"
    STIM_FEEDBACK = "wellsafer/stim/{bid}/feedback"
    
    # 서버 → 밴드/자극기 (송신)
    BAND_COMMAND = "wellsafer/band/{bid}/command"
    STIM_COMMAND = "wellsafer/stim/{bid}/command"
    STIM_CONTROL = "wellsafer/stim/{bid}/control"
    
    # 와일드카드 구독
    BAND_ALL = "wellsafer/band/+/#"
    STIM_ALL = "wellsafer/stim/+/#"


class MQTTHandler:
    """MQTT 메시지 핸들러"""
    
    def __init__(self, app=None, socketio=None):
        self.app = app
        self.socketio = socketio
        self.handlers = {}
        
    def register_handler(self, topic_pattern, handler):
        """토픽 패턴에 대한 핸들러 등록"""
        self.handlers[topic_pattern] = handler
        
    def handle_message(self, topic, payload):
        """메시지 처리"""
        for pattern, handler in self.handlers.items():
            if self._match_topic(pattern, topic):
                try:
                    handler(topic, payload)
                except Exception as e:
                    if self.app:
                        self.app.logger.error(f"MQTT handler error: {e}")
                        
    def _match_topic(self, pattern, topic):
        """토픽 패턴 매칭"""
        pattern_parts = pattern.split('/')
        topic_parts = topic.split('/')
        
        if len(pattern_parts) != len(topic_parts):
            if '#' not in pattern_parts:
                return False
                
        for i, part in enumerate(pattern_parts):
            if part == '#':
                return True
            if part == '+':
                continue
            if i >= len(topic_parts) or part != topic_parts[i]:
                return False
                
        return True


# 전역 핸들러 인스턴스
mqtt_handler = MQTTHandler()


def get_mqtt_client():
    """MQTT 클라이언트 인스턴스 반환"""
    global _mqtt_client
    return _mqtt_client


def init_mqtt(app, socketio=None):
    """
    MQTT 클라이언트 초기화
    
    Args:
        app: Flask 애플리케이션
        socketio: Socket.IO 인스턴스
    """
    global _mqtt_client, mqtt_handler
    
    with _mqtt_lock:
        if _mqtt_client is not None:
            return _mqtt_client
            
        mqtt_handler.app = app
        mqtt_handler.socketio = socketio
        
        broker_url = app.config.get('MQTT_BROKER_URL', 'localhost')
        broker_port = app.config.get('MQTT_BROKER_PORT', 1883)
        username = app.config.get('MQTT_USERNAME')
        password = app.config.get('MQTT_PASSWORD')
        
        client_id = f"wellsafer-server-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        _mqtt_client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)
        
        # 인증 설정
        if username and password:
            _mqtt_client.username_pw_set(username, password)
            
        # 콜백 등록
        _mqtt_client.on_connect = _on_connect
        _mqtt_client.on_disconnect = _on_disconnect
        _mqtt_client.on_message = _on_message
        
        # 연결
        try:
            _mqtt_client.connect(broker_url, broker_port, keepalive=60)
            _mqtt_client.loop_start()
            app.logger.info(f"MQTT connected to {broker_url}:{broker_port}")
        except Exception as e:
            app.logger.error(f"MQTT connection failed: {e}")
            _mqtt_client = None
            
        # 기본 핸들러 등록
        _register_default_handlers(app, socketio)
        
        return _mqtt_client


def _on_connect(client, userdata, flags, rc):
    """연결 콜백"""
    if rc == 0:
        print("MQTT Connected successfully")
        # 토픽 구독
        client.subscribe(Topics.BAND_ALL, qos=1)
        client.subscribe(Topics.STIM_ALL, qos=1)
        # 구 백엔드 토픽 구독
        client.subscribe("/DT/eHG4/naas/post/async", qos=1)
        client.subscribe("/DT/eHG4/naas/post/sync", qos=1)
        print("Subscribed to legacy topics: /DT/eHG4/naas/post/async, /DT/eHG4/naas/post/sync")
    else:
        print(f"MQTT Connection failed with code {rc}")


def _on_disconnect(client, userdata, rc):
    """연결 해제 콜백"""
    print(f"MQTT Disconnected with code {rc}")
    if rc != 0:
        # 비정상 종료 시 재연결 시도
        print("Attempting to reconnect...")


def _on_message(client, userdata, msg):
    """메시지 수신 콜백"""
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode('utf-8'))
        mqtt_handler.handle_message(topic, payload)
    except json.JSONDecodeError:
        print(f"Invalid JSON in MQTT message: {msg.topic}")
    except Exception as e:
        print(f"MQTT message handling error: {e}")


def _register_default_handlers(app, socketio):
    """기본 메시지 핸들러 등록"""

    def handle_sensor_data(topic, payload):
        """센서 데이터 처리"""
        parts = topic.split('/')
        if len(parts) >= 4:
            bid = parts[2]
            _process_sensor_data(app, socketio, bid, payload)

    def handle_location_data(topic, payload):
        """위치 데이터 처리"""
        parts = topic.split('/')
        if len(parts) >= 4:
            bid = parts[2]
            _process_location_data(app, socketio, bid, payload)

    def handle_band_status(topic, payload):
        """밴드 상태 처리"""
        parts = topic.split('/')
        if len(parts) >= 4:
            bid = parts[2]
            _process_band_status(app, socketio, bid, payload)

    def handle_band_event(topic, payload):
        """밴드 이벤트 처리"""
        parts = topic.split('/')
        if len(parts) >= 4:
            bid = parts[2]
            _process_band_event(app, socketio, bid, payload)

    def handle_stim_status(topic, payload):
        """신경자극기 상태 처리"""
        parts = topic.split('/')
        if len(parts) >= 4:
            bid = parts[2]
            _process_stim_status(app, socketio, bid, payload)

    def handle_stim_connected(topic, payload):
        """신경자극기 연결 처리"""
        parts = topic.split('/')
        if len(parts) >= 4:
            bid = parts[2]
            _process_stim_connected(app, socketio, bid, payload)

    def handle_stim_disconnected(topic, payload):
        """신경자극기 연결 해제 처리"""
        parts = topic.split('/')
        if len(parts) >= 4:
            bid = parts[2]
            _process_stim_disconnected(app, socketio, bid, payload)

    def handle_legacy_async(topic, payload):
        """구 백엔드 async 토픽 처리"""
        _process_legacy_message(app, socketio, payload, is_sync=False)

    def handle_legacy_sync(topic, payload):
        """구 백엔드 sync 토픽 처리"""
        _process_legacy_message(app, socketio, payload, is_sync=True)

    mqtt_handler.register_handler("wellsafer/band/+/sensor", handle_sensor_data)
    mqtt_handler.register_handler("wellsafer/band/+/location", handle_location_data)
    mqtt_handler.register_handler("wellsafer/band/+/status", handle_band_status)
    mqtt_handler.register_handler("wellsafer/band/+/event", handle_band_event)
    mqtt_handler.register_handler("wellsafer/stim/+/status", handle_stim_status)
    mqtt_handler.register_handler("wellsafer/stim/+/connected", handle_stim_connected)
    mqtt_handler.register_handler("wellsafer/stim/+/disconnected", handle_stim_disconnected)
    mqtt_handler.register_handler("/DT/eHG4/naas/post/async", handle_legacy_async)
    mqtt_handler.register_handler("/DT/eHG4/naas/post/sync", handle_legacy_sync)


def _process_sensor_data(app, socketio, bid, payload):
    """센서 데이터 처리 및 저장"""
    from flask_sqlalchemy import SQLAlchemy
    from backend.db import models as db_models
    Band = db_models.Band
    SensorData = db_models.SensorData

    with app.app_context():
        db = app.extensions['sqlalchemy']
        band = Band.query.filter_by(bid=bid).first()
        if not band:
            return
            
        # 센서 데이터 저장 (실제 DB 컬럼 사용)
        sensor = SensorData(
            FK_bid=band.id,
            datetime=datetime.utcnow(),
            battery_level=payload.get('battery_level'),
            hr=payload.get('hr'),
            spo2=payload.get('spo2'),
            skin_temp=payload.get('skin_temp'),
            x=payload.get('x'),
            y=payload.get('y'),
            z=payload.get('z'),
            walk_steps=payload.get('walk_steps'),
            run_steps=payload.get('run_steps'),
            activity=payload.get('activity'),
            motionFlag=payload.get('motionFlag'),
            scdState=payload.get('scdState')
        )
        db.session.add(sensor)

        # 밴드 연결 상태 업데이트
        # scdState (Skin Contact Detection): 0=벗음, 1=착용
        scd_state = payload.get('scdState')
        if scd_state == 0:
            # 밴드를 벗으면 즉시 오프라인
            band.connect_state = 0
            app.logger.info(f"Band {bid} removed (scdState=0), setting offline")
        else:
            # 착용 중이면 온라인
            band.connect_state = 1
        band.connect_time = datetime.utcnow()

        db.session.commit()
        
        # Socket.IO로 실시간 전송
        if socketio:
            socketio.emit('sensor_update', {
                'bid': bid,
                'datetime': datetime.utcnow().isoformat(),
                **payload
            }, room=f'band_{bid}')
            
        # 이상치 감지
        _check_vital_anomaly(app, socketio, band, payload)


def _process_location_data(app, socketio, bid, payload):
    """위치 데이터 처리"""
    from backend.db import models as db_models
    Band = db_models.Band

    with app.app_context():
        db = app.extensions['sqlalchemy']
        band = Band.query.filter_by(bid=bid).first()
        if not band:
            return
            
        band.latitude = payload.get('latitude')
        band.longitude = payload.get('longitude')
        band.address = payload.get('address', '')
        band.location_type = payload.get('location_type', 'GPS')
        
        db.session.commit()
        
        if socketio:
            socketio.emit('location_update', {
                'bid': bid,
                'latitude': band.latitude,
                'longitude': band.longitude,
                'address': band.address,
                'location_type': band.location_type
            }, room=f'band_{bid}')


def _process_band_status(app, socketio, bid, payload):
    """밴드 상태 처리"""
    db = backend_module.db
    from backend.db import models as db_models
    Band = db_models.Band
    
    with app.app_context():
        band = Band.query.filter_by(bid=bid).first()
        if not band:
            return
            
        status = payload.get('status', 'offline')
        band.connect_state = 1 if status == 'online' else 0
        band.battery = payload.get('battery', band.battery)
        band.firmware_version = payload.get('firmware_version', band.firmware_version)
        
        db.session.commit()
        
        if socketio:
            socketio.emit('band_status', {
                'bid': bid,
                'status': status,
                'battery': band.battery
            })


def _process_band_event(app, socketio, bid, payload):
    """밴드 이벤트 처리"""
    from backend.db import models as db_models
    Band = db_models.Band
    Event = db_models.Event

    with app.app_context():
        db = app.extensions['sqlalchemy']
        band = Band.query.filter_by(bid=bid).first()
        if not band:
            return

        # event_type 문자열을 type 숫자로 변환
        event_type_to_int = {
            'sos': 6,
            'fall': 7,
            'hr_high': 8,
            'hr_low': 9,
            'spo2_low': 10,
        }
        event_type_str = payload.get('event_type', 'unknown')
        event_type_int = event_type_to_int.get(event_type_str, 0)

        event = Event(
            FK_bid=band.id,
            datetime=datetime.utcnow(),
            type=event_type_int,
            value=payload.get('value'),
            action_status=0,
            action_note=payload.get('message', f'{event_type_str} 이벤트')
        )
        db.session.add(event)
        db.session.commit()

        if socketio:
            event_dict = event.to_dict()
            event_dict['bid'] = bid
            event_dict['wearer_name'] = band.wearer_name
            # 알림은 alerts, dashboard, 그리고 해당 밴드 룸에 전송
            socketio.emit('alert_new', event_dict, room='alerts')
            socketio.emit('alert_new', event_dict, room='dashboard')
            socketio.emit('alert_new', event_dict, room=f'band_{bid}')

        # 긴급 이벤트 SMS 발송
        if event.event_level >= 3:
            _send_emergency_sms(app, band, event)


def _process_stim_status(app, socketio, bid, payload):
    """신경자극기 상태 처리"""
    from backend.db import models as db_models
    NervestimulationStatus = db_models.NervestimulationStatus

    with app.app_context():
        db = app.extensions['sqlalchemy']
        session_id = payload.get('session_id')
        if not session_id:
            return
            
        session = NervestimulationStatus.query.filter_by(session_id=session_id).first()
        if not session:
            return
            
        session.stim_level = payload.get('stim_level', session.stim_level)
        session.status = payload.get('status', session.status)
        
        db.session.commit()
        
        if socketio:
            socketio.emit('stim_status_update', {
                'session_id': session_id,
                'bid': bid,
                'status': session.status,
                'stim_level': session.stim_level
            }, room=f'stim_{session_id}')


def _process_stim_connected(app, socketio, bid, payload):
    """신경자극기 BLE 연결 처리"""
    db = backend_module.db
    from backend.db import models as db_models
    Band = db_models.Band
    
    with app.app_context():
        band = Band.query.filter_by(bid=bid).first()
        if not band:
            return
            
        band.stimulator_connected = True
        band.stimulator_id = payload.get('stimulator_id')
        
        db.session.commit()
        
        if socketio:
            socketio.emit('stimulator_connected', {
                'bid': bid,
                'stimulator_id': band.stimulator_id
            })


def _process_stim_disconnected(app, socketio, bid, payload):
    """신경자극기 BLE 연결 해제 처리"""
    db = backend_module.db
    from backend.db import models as db_models
    Band = db_models.Band
    
    with app.app_context():
        band = Band.query.filter_by(bid=bid).first()
        if not band:
            return
            
        band.stimulator_connected = False
        
        db.session.commit()
        
        if socketio:
            socketio.emit('stimulator_disconnected', {
                'bid': bid
            })


def _check_vital_anomaly(app, socketio, band, payload):
    """생체신호 이상치 감지"""
    from backend.db import models as db_models
    Event = db_models.Event
    db = app.extensions['sqlalchemy']

    hr = payload.get('hr')
    spo2 = payload.get('spo2')

    events = []

    # 심박수 이상
    if hr:
        if hr > 120:
            events.append({
                'type': 8,  # hr_high
                'value': hr,
                'action_note': f'심박수가 높습니다 ({hr}bpm)'
            })
        elif hr < 50:
            events.append({
                'type': 9,  # hr_low
                'value': hr,
                'action_note': f'심박수가 낮습니다 ({hr}bpm)'
            })

    # 산소포화도 이상
    if spo2 and spo2 < 95:
        events.append({
            'type': 10,  # spo2_low
            'value': spo2,
            'action_note': f'산소포화도가 저하되었습니다 ({spo2}%)'
        })
        
    # 이벤트 저장 및 알림
    for event_data in events:
        event = Event(
            FK_bid=band.id,
            datetime=datetime.utcnow(),
            action_status=0,
            **event_data
        )
        db.session.add(event)
        db.session.commit()

        if socketio:
            event_dict = event.to_dict()
            event_dict['bid'] = band.bid
            event_dict['wearer_name'] = band.wearer_name
            # 알림은 alerts, dashboard, 그리고 해당 밴드 룸에 전송
            socketio.emit('alert_new', event_dict, room='alerts')
            socketio.emit('alert_new', event_dict, room='dashboard')
            socketio.emit('alert_new', event_dict, room=f'band_{band.bid}')

        if event.event_level >= 3:
            _send_emergency_sms(app, band, event)


def _send_emergency_sms(app, band, event):
    """긴급 SMS 발송"""
    try:
        from backend.sms.send_sms import send_sms
        from backend.sms.utils import get_message_template
    except ImportError:
        app.logger.warning("SMS module not available")
        return
    
    if not band.guardian_phone:
        return
        
    try:
        message = get_message_template(
            event.event_type,
            name=band.wearer_name or '착용자',
            value=event.value,
            location=band.address or '위치 정보 없음'
        )
        
        send_sms(band.guardian_phone, message)
        
        event.sms_sent = True
        event.sms_sent_at = datetime.utcnow()

        db = app.extensions['sqlalchemy']
        db.session.commit()
        
    except Exception as e:
        app.logger.error(f"SMS sending failed: {e}")


# ============================================================
# 명령 발송 함수
# ============================================================

def send_band_command(bid, command, params=None):
    """
    밴드에 명령 전송
    
    Args:
        bid: 밴드 ID
        command: 명령어
        params: 추가 파라미터
    """
    global _mqtt_client
    
    if not _mqtt_client:
        return False
        
    topic = Topics.BAND_COMMAND.format(bid=bid)
    payload = {
        'command': command,
        'params': params or {},
        'timestamp': datetime.utcnow().isoformat()
    }
    
    try:
        _mqtt_client.publish(topic, json.dumps(payload), qos=1)
        return True
    except Exception as e:
        print(f"Failed to send band command: {e}")
        return False


def send_stim_command(bid, command, params=None):
    """
    신경자극기에 명령 전송
    
    Args:
        bid: 밴드 ID
        command: 명령어 (start, stop, set_level 등)
        params: 추가 파라미터
    """
    global _mqtt_client
    
    if not _mqtt_client:
        return False
        
    topic = Topics.STIM_COMMAND.format(bid=bid)
    payload = {
        'command': command,
        'params': params or {},
        'timestamp': datetime.utcnow().isoformat()
    }
    
    try:
        _mqtt_client.publish(topic, json.dumps(payload), qos=1)
        return True
    except Exception as e:
        print(f"Failed to send stim command: {e}")
        return False


def send_stim_control(bid, session_id, action, level=None):
    """
    신경자극 제어 명령 전송
    
    Args:
        bid: 밴드 ID
        session_id: 세션 ID
        action: 동작 (start, stop, pause, resume)
        level: 자극 강도 (1-10)
    """
    params = {
        'session_id': session_id,
        'action': action
    }
    
    if level is not None:
        params['level'] = level
        
    return send_stim_command(bid, 'control', params)


def _process_legacy_message(app, socketio, payload, is_sync=False):
    """
    구 백엔드 메시지 형식 처리

    {"extAddress": {"low": 1855883348, "high": 108776}, "type": 6, "value": 1, "bandData": {...}}
    """
    from backend.db import models as db_models
    Band = db_models.Band
    Event = db_models.Event

    with app.app_context():
        db = app.extensions['sqlalchemy']
        try:
            # extAddress를 bid로 변환
            ext_addr = payload.get('extAddress', {})
            low = ext_addr.get('low', 0)
            high = ext_addr.get('high', 0)

            # bid 계산 (high << 32 | low를 문자열로 변환)
            bid_int = (high << 32) | low
            bid = str(bid_int)

            has_band_data = 'bandData' in payload
            app.logger.info(f"Legacy MQTT message - bid: {bid}, type: {payload.get('type')}, sync: {is_sync}, has_bandData: {has_band_data}")
            if has_band_data:
                band_data = payload['bandData']
                app.logger.info(f"  bandData: hr={band_data.get('hr')}, spo2={band_data.get('spo2')}, battery={band_data.get('battery_level')}")

            # 밴드 찾기
            band = Band.query.filter_by(bid=bid).first()
            if not band:
                app.logger.warning(f"Band not found: {bid}")
                return

            msg_type = payload.get('type')
            value = payload.get('value')

            # MQTT 메시지를 받았으므로 밴드가 온라인 상태로 업데이트
            app.logger.info(f"Setting connect_state=1 for band {bid} (before: {band.connect_state})")
            band.connect_state = 1
            band.connect_time = datetime.utcnow()
            db.session.commit()
            app.logger.info(f"Committed connect_state for band {bid}")

            # bandData가 있으면 센서 데이터로 처리
            if 'bandData' in payload:
                band_data = payload['bandData']
                # 실제 DB 컬럼에 맞게 변환
                new_payload = {
                    'battery_level': band_data.get('battery_level'),
                    'hr': band_data.get('hr'),
                    'spo2': band_data.get('spo2'),
                    'skin_temp': band_data.get('skin_temp'),
                    'x': band_data.get('x'),
                    'y': band_data.get('y'),
                    'z': band_data.get('z'),
                    'walk_steps': band_data.get('walk_steps'),
                    'run_steps': band_data.get('run_steps'),
                    'activity': band_data.get('activity'),
                    'motionFlag': band_data.get('motionFlag'),
                    'scdState': band_data.get('scdState')
                }
                _process_sensor_data(app, socketio, bid, new_payload)

            # type 기반 이벤트 처리
            event_type_names = {
                6: 'sos',           # SOS
                7: 'fall',          # 낙상
                8: 'hr_high',       # 심박수 높음
                9: 'hr_low',        # 심박수 낮음
                10: 'spo2_low',     # 산소포화도 낮음
            }

            if msg_type in event_type_names:
                event_type_name = event_type_names[msg_type]
                event_level = 4 if msg_type in [6, 7] else 3  # SOS, 낙상은 레벨 4

                # 실제 DB 컬럼 사용
                event = Event(
                    FK_bid=band.id,
                    datetime=datetime.utcnow(),
                    type=msg_type,  # 실제 DB 컬럼
                    value=value,
                    action_status=0,  # 미처리
                    action_note=f'{event_type_name} 이벤트 발생'
                )
                db.session.add(event)
                db.session.commit()

                # Socket.IO로 알림 전송
                if socketio:
                    event_dict = event.to_dict()
                    event_dict['bid'] = bid
                    event_dict['wearer_name'] = band.wearer_name
                    # 알림은 alerts, dashboard, 그리고 해당 밴드 룸에 전송
                    socketio.emit('alert_new', event_dict, room='alerts')
                    socketio.emit('alert_new', event_dict, room='dashboard')
                    socketio.emit('alert_new', event_dict, room=f'band_{bid}')
                    app.logger.info(f"Alert sent via Socket.IO: {event_type_name}")

                # 긴급 SMS 발송
                if event_level >= 3:
                    _send_emergency_sms(app, band, event)

        except Exception as e:
            import traceback
            app.logger.error(f"Legacy message processing error: {e}")
            app.logger.error(traceback.format_exc())


def disconnect_mqtt():
    """MQTT 연결 해제"""
    global _mqtt_client

    with _mqtt_lock:
        if _mqtt_client:
            _mqtt_client.loop_stop()
            _mqtt_client.disconnect()
            _mqtt_client = None
