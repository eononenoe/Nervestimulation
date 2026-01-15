# -*- coding: utf-8 -*-
"""
백그라운드 스레드 모듈
주기적인 연결 상태 확인, 알림 집계, 데이터 정리 등
"""

import threading
import time
from datetime import datetime, timedelta
from flask import current_app

from backend.db.service import query, select
from backend.db.table import EventType


class ConnectionChecker(threading.Thread):
    """
    밴드 연결 상태 확인 스레드
    마지막 데이터 수신 시간이 5분 초과 시 오프라인 처리
    """
    
    def __init__(self, app, socketio, interval=60):
        super().__init__(daemon=True)
        self.app = app
        self.socketio = socketio
        self.interval = interval
        self.running = True
    
    def run(self):
        while self.running:
            try:
                with self.app.app_context():
                    self.check_connections()
            except Exception as e:
                self.app.logger.error(f"ConnectionChecker error: {e}")
            
            time.sleep(self.interval)
    
    def check_connections(self):
        """밴드 연결 상태 확인"""
        threshold = datetime.utcnow() - timedelta(minutes=5)
        
        # 온라인 상태인 밴드들 확인
        online_bands = select.get_online_bands()
        
        for band in online_bands:
            # 마지막 데이터 수신 시간 확인
            if band.last_data_at and band.last_data_at < threshold:
                # 오프라인으로 변경
                query.update_band_status(band.bid, connect_state=0)
                
                # 이벤트 생성
                query.insert_event(
                    band.id,
                    EventType.DEVICE_OFFLINE,
                    2,  # 주의 레벨
                    None,
                    f"{band.wearer_name}님 밴드 연결 끊김"
                )
                
                # WebSocket 알림
                self.socketio.emit('band_status', {
                    'bid': band.bid,
                    'status': 'offline',
                    'last_seen': band.last_data_at.isoformat() if band.last_data_at else None
                })
                
                self.app.logger.info(f"Band {band.bid} marked as offline")
    
    def stop(self):
        self.running = False


class AlertAggregator(threading.Thread):
    """
    알림 집계 스레드
    반복되는 동일 알림을 집계하여 요약
    """
    
    def __init__(self, app, socketio, interval=300):
        super().__init__(daemon=True)
        self.app = app
        self.socketio = socketio
        self.interval = interval
        self.running = True
    
    def run(self):
        while self.running:
            try:
                with self.app.app_context():
                    self.aggregate_alerts()
            except Exception as e:
                self.app.logger.error(f"AlertAggregator error: {e}")
            
            time.sleep(self.interval)
    
    def aggregate_alerts(self):
        """알림 집계 (현재는 간단한 로깅만)"""
        # 읽지 않은 알림 수
        unread_count = select.get_unread_events_count()
        
        if unread_count > 10:
            self.app.logger.warning(f"High number of unread alerts: {unread_count}")
            
            # 대시보드에 알림
            self.socketio.emit('alert_summary', {
                'unread_count': unread_count,
                'timestamp': datetime.utcnow().isoformat()
            }, room='dashboard')
    
    def stop(self):
        self.running = False


class DataCleanup(threading.Thread):
    """
    데이터 정리 스레드
    오래된 임시 데이터 삭제
    """
    
    def __init__(self, app, interval=86400):  # 24시간
        super().__init__(daemon=True)
        self.app = app
        self.interval = interval
        self.running = True
    
    def run(self):
        while self.running:
            try:
                with self.app.app_context():
                    self.cleanup()
            except Exception as e:
                self.app.logger.error(f"DataCleanup error: {e}")
            
            time.sleep(self.interval)
    
    def cleanup(self):
        """오래된 데이터 정리"""
        # 여기서 오래된 로그, 세션 등 정리
        # 실제 구현 시 데이터 보관 정책에 따라 처리
        self.app.logger.info("Data cleanup executed")
    
    def stop(self):
        self.running = False


class SessionTimeoutChecker(threading.Thread):
    """
    세션 타임아웃 확인 스레드
    진행 중인 자극 세션의 타임아웃 처리
    """
    
    def __init__(self, app, socketio, interval=60):
        super().__init__(daemon=True)
        self.app = app
        self.socketio = socketio
        self.interval = interval
        self.running = True
    
    def run(self):
        while self.running:
            try:
                with self.app.app_context():
                    self.check_session_timeouts()
            except Exception as e:
                self.app.logger.error(f"SessionTimeoutChecker error: {e}")
            
            time.sleep(self.interval)
    
    def check_session_timeouts(self):
        """세션 타임아웃 확인"""
        from backend.db.table import NerveStimSession, SessionStatus, EndReason
        from backend import db
        
        # 진행 중인 세션들
        running_sessions = NerveStimSession.query.filter_by(status=SessionStatus.RUNNING).all()
        
        for session in running_sessions:
            if session.started_at:
                # 예상 종료 시간 계산 (설정된 duration + 5분 여유)
                expected_end = session.started_at + timedelta(minutes=session.duration + 5)
                
                if datetime.utcnow() > expected_end:
                    # 타임아웃 처리
                    session.status = SessionStatus.STOPPED
                    session.ended_at = datetime.utcnow()
                    session.end_reason = EndReason.TIMEOUT
                    db.session.commit()
                    
                    self.app.logger.warning(f"Session {session.session_id} timed out")
                    
                    # WebSocket 알림
                    self.socketio.emit('stim_session_update', {
                        'session_id': session.session_id,
                        'status': SessionStatus.STOPPED,
                        'status_text': '타임아웃',
                        'end_reason': EndReason.TIMEOUT
                    })
    
    def stop(self):
        self.running = False


# ============================================================
# 스레드 관리
# ============================================================

_threads = []


def start_threads(app, socketio):
    """모든 백그라운드 스레드 시작"""
    global _threads
    
    # 연결 상태 확인 (60초마다)
    connection_checker = ConnectionChecker(app, socketio, interval=60)
    connection_checker.start()
    _threads.append(connection_checker)
    
    # 알림 집계 (5분마다)
    alert_aggregator = AlertAggregator(app, socketio, interval=300)
    alert_aggregator.start()
    _threads.append(alert_aggregator)
    
    # 데이터 정리 (24시간마다)
    data_cleanup = DataCleanup(app, interval=86400)
    data_cleanup.start()
    _threads.append(data_cleanup)
    
    # 세션 타임아웃 확인 (60초마다)
    session_checker = SessionTimeoutChecker(app, socketio, interval=60)
    session_checker.start()
    _threads.append(session_checker)
    
    app.logger.info("Background threads started")


def stop_threads():
    """모든 백그라운드 스레드 종료"""
    global _threads
    
    for thread in _threads:
        thread.stop()
    
    _threads = []
