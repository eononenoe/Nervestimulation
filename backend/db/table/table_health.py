# -*- coding: utf-8 -*-
from pytz import timezone
import datetime
from backend.db.database import DBManager
from backend.db.table.table_band import Bands

print("module [backend_model.table_health.py] loaded")

db = DBManager.db


class NerveStimSessions(db.Model):
    """신경자극 세션 테이블"""
    __tablename__ = 'nerve_stim_sessions'
    
    id = db.Column('id', db.Integer, primary_key=True)
    FK_bid = db.Column('FK_bid', db.Integer, db.ForeignKey(Bands.id))
    band = db.relationship('Bands')
    status = db.Column('status', db.Integer, default=0)  # 0:대기, 1:진행중, 2:완료
    start_time = db.Column('start_time', db.DateTime)
    end_time = db.Column('end_time', db.DateTime, nullable=True)
    strength = db.Column('strength', db.Integer)  # 1~20
    frequency = db.Column('frequency', db.Integer)  # 10~100 Hz
    duration = db.Column('duration', db.Integer)  # 분
    bp_before_systolic = db.Column('bp_before_systolic', db.Integer, nullable=True)
    bp_before_diastolic = db.Column('bp_before_diastolic', db.Integer, nullable=True)
    bp_after_systolic = db.Column('bp_after_systolic', db.Integer, nullable=True)
    bp_after_diastolic = db.Column('bp_after_diastolic', db.Integer, nullable=True)
    created = db.Column('created', db.DateTime, default=datetime.datetime.now(timezone('Asia/Seoul')))

    def serialize(self):
        status_map = {0: '대기', 1: '진행중', 2: '완료'}
        return {
            "id": self.id,
            "FK_bid": self.FK_bid,
            "bandId": self.band.bid if self.band else None,
            "userName": self.band.name if self.band else None,
            "status": status_map.get(self.status, '대기'),
            "statusCode": self.status,
            "startTime": self.start_time.strftime('%Y-%m-%d %H:%M') if self.start_time else None,
            "endTime": self.end_time.strftime('%Y-%m-%d %H:%M') if self.end_time else None,
            "strength": self.strength,
            "frequency": self.frequency,
            "duration": self.duration,
            "bpBeforeSystolic": self.bp_before_systolic,
            "bpBeforeDiastolic": self.bp_before_diastolic,
            "bpAfterSystolic": self.bp_after_systolic,
            "bpAfterDiastolic": self.bp_after_diastolic,
        }


class BloodPressure(db.Model):
    """혈압 측정 테이블"""
    __tablename__ = 'blood_pressure'
    
    id = db.Column('id', db.Integer, primary_key=True)
    FK_bid = db.Column('FK_bid', db.Integer, db.ForeignKey(Bands.id))
    band = db.relationship('Bands')
    systolic = db.Column('systolic', db.Integer)  # 수축기 혈압
    diastolic = db.Column('diastolic', db.Integer)  # 이완기 혈압
    pulse = db.Column('pulse', db.Integer)  # 맥박
    measured_at = db.Column('measured_at', db.DateTime, default=datetime.datetime.now(timezone('Asia/Seoul')))
    is_after_stim = db.Column('is_after_stim', db.Boolean, default=False)
    FK_session_id = db.Column('FK_session_id', db.Integer, db.ForeignKey('nerve_stim_sessions.id'), nullable=True)

    def get_status(self):
        if self.systolic >= 140 or self.diastolic >= 90:
            return '위험'
        elif self.systolic >= 130 or self.diastolic >= 85:
            return '주의'
        return '정상'

    def serialize(self):
        now = datetime.datetime.now(timezone('Asia/Seoul'))
        measured = self.measured_at.replace(tzinfo=timezone('Asia/Seoul')) if self.measured_at else now
        diff = now - measured
        
        if diff.total_seconds() < 60:
            time_ago = '방금 전'
        elif diff.total_seconds() < 3600:
            time_ago = f'{int(diff.total_seconds() // 60)}분 전'
        elif diff.total_seconds() < 86400:
            time_ago = f'{int(diff.total_seconds() // 3600)}시간 전'
        else:
            time_ago = f'{int(diff.total_seconds() // 86400)}일 전'
            
        return {
            "id": self.id,
            "FK_bid": self.FK_bid,
            "bandId": self.band.bid if self.band else None,
            "userName": self.band.name if self.band else None,
            "systolic": self.systolic,
            "diastolic": self.diastolic,
            "pulse": self.pulse,
            "status": self.get_status(),
            "measuredAt": self.measured_at.strftime('%Y-%m-%d %H:%M') if self.measured_at else None,
            "timeAgo": time_ago,
            "isAfterStim": self.is_after_stim,
        }


class HealthReports(db.Model):
    """건강 리포트 테이블"""
    __tablename__ = 'health_reports'
    
    id = db.Column('id', db.Integer, primary_key=True)
    FK_bid = db.Column('FK_bid', db.Integer, db.ForeignKey(Bands.id), nullable=True)
    band = db.relationship('Bands')
    report_type = db.Column('report_type', db.String(50))  # 종합, 혈압, 신경자극, 활동량
    report_name = db.Column('report_name', db.String(200))
    period_start = db.Column('period_start', db.Date)
    period_end = db.Column('period_end', db.Date)
    file_path = db.Column('file_path', db.String(500), nullable=True)
    created_at = db.Column('created_at', db.DateTime, default=datetime.datetime.now(timezone('Asia/Seoul')))
    download_count = db.Column('download_count', db.Integer, default=0)

    def serialize(self):
        period = ''
        if self.period_start and self.period_end:
            if self.period_start.strftime('%Y.%m') == self.period_end.strftime('%Y.%m'):
                period = self.period_start.strftime('%Y.%m')
            else:
                period = f"{self.period_start.strftime('%Y.%m')}-{self.period_end.strftime('%Y.%m')}"
        return {
            "id": self.id,
            "FK_bid": self.FK_bid,
            "target": self.band.name if self.band else "전체",
            "type": self.report_type,
            "name": self.report_name,
            "period": period,
            "createdAt": self.created_at.strftime('%Y-%m-%d') if self.created_at else None,
            "downloadCount": self.download_count,
            "filePath": self.file_path,
        }


class Devices(db.Model):
    """기기 관리 테이블"""
    __tablename__ = 'devices'
    
    id = db.Column('id', db.Integer, primary_key=True)
    device_id = db.Column('device_id', db.String(50), unique=True)
    alias = db.Column('alias', db.String(100))
    device_type = db.Column('device_type', db.String(50))  # 자체 밴드, 상용워치, BLE 자극기
    connection_type = db.Column('connection_type', db.String(50))  # LTE-M, BLE, WiFi
    status = db.Column('status', db.String(20), default='오프라인')  # 온라인, 오프라인
    battery = db.Column('battery', db.Integer, default=100)
    signal_strength = db.Column('signal_strength', db.Integer, default=0)  # 0-4
    last_seen = db.Column('last_seen', db.DateTime, nullable=True)
    created_at = db.Column('created_at', db.DateTime, default=datetime.datetime.now(timezone('Asia/Seoul')))
    FK_bid = db.Column('FK_bid', db.Integer, db.ForeignKey(Bands.id), nullable=True)
    band = db.relationship('Bands')
    # LTE-M Cat.M1 관련 필드
    imei = db.Column('imei', db.String(20), nullable=True)
    iccid = db.Column('iccid', db.String(25), nullable=True)
    firmware_version = db.Column('firmware_version', db.String(20), nullable=True)
    # RF 실내위치 관련
    rf_enabled = db.Column('rf_enabled', db.Boolean, default=False)
    # GPS 관련
    gps_enabled = db.Column('gps_enabled', db.Boolean, default=True)
    last_latitude = db.Column('last_latitude', db.Float, nullable=True)
    last_longitude = db.Column('last_longitude', db.Float, nullable=True)

    def serialize(self):
        last_seen_str = '없음'
        if self.last_seen:
            now = datetime.datetime.now(timezone('Asia/Seoul'))
            ls = self.last_seen
            if ls.tzinfo is None:
                ls = ls.replace(tzinfo=timezone('Asia/Seoul'))
            diff = now - ls
            if diff.total_seconds() < 60:
                last_seen_str = '방금 전'
            elif diff.total_seconds() < 3600:
                last_seen_str = f'{int(diff.total_seconds() // 60)}분 전'
            elif diff.total_seconds() < 86400:
                last_seen_str = f'{int(diff.total_seconds() // 3600)}시간 전'
            else:
                last_seen_str = f'{int(diff.total_seconds() // 86400)}일 전'
        return {
            "id": self.id,
            "deviceId": self.device_id,
            "alias": self.alias,
            "type": self.device_type,
            "connection": self.connection_type,
            "status": self.status,
            "battery": self.battery,
            "signal": self.signal_strength,
            "lastSeen": last_seen_str,
            "imei": self.imei,
            "iccid": self.iccid,
            "firmware": self.firmware_version,
            "rfEnabled": self.rf_enabled,
            "gpsEnabled": self.gps_enabled,
            "latitude": self.last_latitude,
            "longitude": self.last_longitude,
        }
