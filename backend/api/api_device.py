# -*- coding: utf-8 -*-
from flask import make_response, jsonify, request, json
from backend import app
from backend.db.database import DBManager
from backend.db.table.table_band import Bands
from backend.db.table.table_health import Devices
from datetime import datetime, timedelta
from pytz import timezone
from sqlalchemy import func, desc, or_

print("module [backend.api_device] loaded")

db = DBManager.db


@app.route('/api/efwb/v1/devices', methods=['GET'])
def get_devices():
    """기기 목록 조회"""
    try:
        # 필터 파라미터
        filter_type = request.args.get('filter', 'all')
        search = request.args.get('search', '')
        
        query = db.session.query(Devices)
        
        # 필터 적용
        if filter_type == 'online':
            query = query.filter(Devices.status == '온라인')
        elif filter_type == 'offline':
            query = query.filter(Devices.status == '오프라인')
        elif filter_type == 'lte':
            query = query.filter(Devices.connection_type == 'LTE-M')
        elif filter_type == 'ble':
            query = query.filter(Devices.connection_type == 'BLE')
        
        # 검색 적용
        if search:
            query = query.filter(or_(
                Devices.device_id.like(f'%{search}%'),
                Devices.alias.like(f'%{search}%')
            ))
        
        devices = query.order_by(desc(Devices.last_seen)).all()
        
        # 통계 계산
        total_count = db.session.query(func.count(Devices.id)).scalar() or 0
        online_count = db.session.query(func.count(Devices.id))\
            .filter(Devices.status == '온라인').scalar() or 0
        low_battery = db.session.query(func.count(Devices.id))\
            .filter(Devices.battery < 20).scalar() or 0
        lte_count = db.session.query(func.count(Devices.id))\
            .filter(Devices.connection_type == 'LTE-M').scalar() or 0
        ble_count = db.session.query(func.count(Devices.id))\
            .filter(Devices.connection_type == 'BLE').scalar() or 0
        rf_count = db.session.query(func.count(Devices.id))\
            .filter(Devices.rf_enabled == True).scalar() or 0
        
        # 기기 유형별 통계
        band_count = db.session.query(func.count(Devices.id))\
            .filter(Devices.device_type == '자체 밴드').scalar() or 0
        watch_count = db.session.query(func.count(Devices.id))\
            .filter(Devices.device_type == '상용워치').scalar() or 0
        stim_count = db.session.query(func.count(Devices.id))\
            .filter(Devices.device_type == 'BLE 자극기').scalar() or 0
        
        result = {
            'status': True,
            'stats': {
                'totalCount': total_count,
                'onlineCount': online_count,
                'lowBattery': low_battery,
                'lteCount': lte_count
            },
            'connectionTypes': {
                'lte': lte_count,
                'ble': ble_count,
                'rf': rf_count
            },
            'deviceTypes': {
                'band': band_count,
                'watch': watch_count,
                'stimulator': stim_count
            },
            'devices': [d.serialize() for d in devices]
        }
        return make_response(jsonify(result), 200)
    except Exception as e:
        print(f"Error in get_devices: {e}")
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/devices/<int:device_id>', methods=['GET'])
def get_device_detail(device_id):
    """기기 상세 조회"""
    try:
        device = db.session.query(Devices).get(device_id)
        if not device:
            return make_response(jsonify({'status': False, 'error': 'Device not found'}), 404)
        
        return make_response(jsonify({
            'status': True,
            'device': device.serialize()
        }), 200)
    except Exception as e:
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/devices', methods=['POST'])
def create_device():
    """기기 등록"""
    try:
        data = json.loads(request.data)
        
        # 중복 체크
        existing = db.session.query(Devices)\
            .filter(Devices.device_id == data.get('deviceId')).first()
        if existing:
            return make_response(jsonify({
                'status': False, 
                'error': 'Device ID already exists'
            }), 400)
        
        new_device = Devices()
        new_device.device_id = data.get('deviceId')
        new_device.alias = data.get('alias')
        new_device.device_type = data.get('type', '자체 밴드')
        new_device.connection_type = data.get('connection', 'BLE')
        new_device.status = '오프라인'
        new_device.battery = 100
        new_device.signal_strength = 0
        new_device.imei = data.get('imei')
        new_device.iccid = data.get('iccid')
        new_device.firmware_version = data.get('firmware')
        new_device.rf_enabled = data.get('rfEnabled', False)
        new_device.gps_enabled = data.get('gpsEnabled', True)
        new_device.FK_bid = data.get('bandId')
        new_device.created_at = datetime.now(timezone('Asia/Seoul'))
        
        db.session.add(new_device)
        db.session.commit()
        
        return make_response(jsonify({
            'status': True,
            'device': new_device.serialize()
        }), 201)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/devices/<int:device_id>', methods=['PUT'])
def update_device(device_id):
    """기기 정보 수정"""
    try:
        device = db.session.query(Devices).get(device_id)
        if not device:
            return make_response(jsonify({'status': False, 'error': 'Device not found'}), 404)
        
        data = json.loads(request.data)
        
        if 'alias' in data:
            device.alias = data['alias']
        if 'type' in data:
            device.device_type = data['type']
        if 'connection' in data:
            device.connection_type = data['connection']
        if 'imei' in data:
            device.imei = data['imei']
        if 'iccid' in data:
            device.iccid = data['iccid']
        if 'firmware' in data:
            device.firmware_version = data['firmware']
        if 'rfEnabled' in data:
            device.rf_enabled = data['rfEnabled']
        if 'gpsEnabled' in data:
            device.gps_enabled = data['gpsEnabled']
        if 'bandId' in data:
            device.FK_bid = data['bandId']
        
        db.session.commit()
        
        return make_response(jsonify({
            'status': True,
            'device': device.serialize()
        }), 200)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/devices/<int:device_id>', methods=['DELETE'])
def delete_device(device_id):
    """기기 삭제"""
    try:
        device = db.session.query(Devices).get(device_id)
        if not device:
            return make_response(jsonify({'status': False, 'error': 'Device not found'}), 404)
        
        db.session.delete(device)
        db.session.commit()
        
        return make_response(jsonify({'status': True}), 200)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/devices/<int:device_id>/status', methods=['POST'])
def update_device_status(device_id):
    """기기 상태 업데이트 (MQTT/LTE-M 연동용)"""
    try:
        device = db.session.query(Devices).get(device_id)
        if not device:
            return make_response(jsonify({'status': False, 'error': 'Device not found'}), 404)
        
        data = json.loads(request.data)
        
        if 'status' in data:
            device.status = data['status']
        if 'battery' in data:
            device.battery = data['battery']
        if 'signal' in data:
            device.signal_strength = data['signal']
        if 'latitude' in data:
            device.last_latitude = data['latitude']
        if 'longitude' in data:
            device.last_longitude = data['longitude']
        
        device.last_seen = datetime.now(timezone('Asia/Seoul'))
        db.session.commit()
        
        return make_response(jsonify({
            'status': True,
            'device': device.serialize()
        }), 200)
    except Exception as e:
        db.session.rollback()
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)


@app.route('/api/efwb/v1/devices/by-device-id/<device_id>', methods=['GET'])
def get_device_by_device_id(device_id):
    """기기 ID로 조회"""
    try:
        device = db.session.query(Devices)\
            .filter(Devices.device_id == device_id).first()
        if not device:
            return make_response(jsonify({'status': False, 'error': 'Device not found'}), 404)
        
        return make_response(jsonify({
            'status': True,
            'device': device.serialize()
        }), 200)
    except Exception as e:
        return make_response(jsonify({'status': False, 'error': str(e)}), 500)
