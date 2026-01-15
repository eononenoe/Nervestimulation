# -*- coding: utf-8 -*-
"""
스케줄러 및 배치 작업 모듈
주기적 작업, 데이터 정리, 알림 처리
"""

import threading
import time
from datetime import datetime, timedelta
from flask import current_app


class Scheduler:
    """간단한 스케줄러"""
    
    def __init__(self, app=None):
        self.app = app
        self.jobs = []
        self.running = False
        self.thread = None
        
    def init_app(self, app):
        self.app = app
        
    def add_job(self, func, interval_seconds, name=None):
        """
        작업 추가
        
        Args:
            func: 실행할 함수
            interval_seconds: 실행 간격 (초)
            name: 작업 이름
        """
        self.jobs.append({
            'func': func,
            'interval': interval_seconds,
            'name': name or func.__name__,
            'last_run': None
        })
        
    def start(self):
        """스케줄러 시작"""
        if self.running:
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        
        if self.app:
            self.app.logger.info("Scheduler started")
            
    def stop(self):
        """스케줄러 중지"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
            
    def _run(self):
        """메인 루프"""
        while self.running:
            now = datetime.utcnow()
            
            for job in self.jobs:
                if job['last_run'] is None:
                    job['last_run'] = now
                    continue
                    
                elapsed = (now - job['last_run']).total_seconds()
                
                if elapsed >= job['interval']:
                    try:
                        if self.app:
                            with self.app.app_context():
                                job['func']()
                        else:
                            job['func']()
                        job['last_run'] = now
                    except Exception as e:
                        if self.app:
                            self.app.logger.error(f"Scheduler job '{job['name']}' failed: {e}")
                        else:
                            print(f"Scheduler job '{job['name']}' failed: {e}")
            
            time.sleep(1)


# ============================================================
# 배치 작업 함수들
# ============================================================

def check_offline_bands():
    """
    오프라인 밴드 감지
    5분 이상 데이터가 없는 밴드를 오프라인으로 처리
    """
    from backend.db.models import db, Band, Event
    
    threshold = datetime.utcnow() - timedelta(minutes=5)
    
    # 온라인 상태지만 데이터가 오래된 밴드
    bands = Band.query.filter(
        Band.is_active == True,
        Band.connect_state == 1,
        Band.last_data_at < threshold
    ).all()
    
    for band in bands:
        band.connect_state = 0
        
        # 오프라인 이벤트 생성
        event = Event(
            FK_bid=band.id,
            datetime=datetime.utcnow(),
            event_type='device_offline',
            event_level=2,
            message=f'{band.wearer_name or "밴드"} 연결이 끊겼습니다'
        )
        db.session.add(event)
        
    if bands:
        db.session.commit()
        current_app.logger.info(f"Marked {len(bands)} bands as offline")


def check_battery_low():
    """
    배터리 부족 알림
    배터리 20% 이하인 밴드에 알림
    """
    from backend.db.models import db, Band, Event
    
    # 1시간 내 이미 알림 보낸 밴드 제외
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    
    bands = Band.query.filter(
        Band.is_active == True,
        Band.connect_state == 1,
        Band.battery <= 20,
        Band.battery > 0
    ).all()
    
    for band in bands:
        # 최근 알림 확인
        recent_alert = Event.query.filter(
            Event.FK_bid == band.id,
            Event.event_type == 'battery_low',
            Event.datetime > one_hour_ago
        ).first()
        
        if recent_alert:
            continue
            
        event = Event(
            FK_bid=band.id,
            datetime=datetime.utcnow(),
            event_type='battery_low',
            event_level=2,
            value=band.battery,
            message=f'{band.wearer_name or "밴드"} 배터리가 {band.battery}%입니다'
        )
        db.session.add(event)
        
        # SMS 발송
        if band.guardian_phone:
            from sms.send_sms import send_emergency_sms
            send_emergency_sms(
                band.guardian_phone,
                'battery_low',
                band.wearer_name,
                value=band.battery
            )
            event.sms_sent = True
            event.sms_sent_at = datetime.utcnow()
    
    db.session.commit()


def check_stimulation_sessions():
    """
    자극 세션 타임아웃 체크
    시작 후 예정 시간이 지난 세션 자동 종료
    """
    from backend.db.models import db, Band, NervestimulationStatus, NervestimulationHist
    
    # 진행 중인 세션
    active_sessions = NervestimulationStatus.query.filter_by(status=1).all()
    
    for session in active_sessions:
        if not session.started_at:
            continue
            
        # 예정 시간 + 5분 여유
        expected_end = session.started_at + timedelta(minutes=session.duration + 5)
        
        if datetime.utcnow() > expected_end:
            # 세션 자동 종료
            session.status = 2  # 완료
            session.ended_at = datetime.utcnow()
            session.end_reason = 'timeout'
            
            duration_actual = int((session.ended_at - session.started_at).total_seconds() / 60)
            
            # 히스토리 저장
            history = NervestimulationHist(
                session_id=session.session_id,
                FK_bid=session.FK_bid,
                stimulator_id=session.stimulator_id,
                stim_level=session.stim_level,
                frequency=session.frequency,
                pulse_width=session.pulse_width,
                duration_planned=session.duration,
                duration_actual=duration_actual,
                started_at=session.started_at,
                ended_at=session.ended_at,
                end_reason='timeout'
            )
            db.session.add(history)
            
            current_app.logger.info(f"Session {session.session_id} auto-completed (timeout)")
    
    db.session.commit()


def cleanup_old_data():
    """
    오래된 데이터 정리
    90일 이상 된 센서 데이터 삭제
    """
    from backend.db.models import db, SensorData
    
    threshold = datetime.utcnow() - timedelta(days=90)
    
    deleted = SensorData.query.filter(
        SensorData.datetime < threshold
    ).delete(synchronize_session=False)
    
    if deleted:
        db.session.commit()
        current_app.logger.info(f"Cleaned up {deleted} old sensor records")


def send_daily_report():
    """
    일일 리포트 발송 (매일 오전 9시)
    """
    from backend.db.models import db, Band, Event, NervestimulationHist
    
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    # 어제 통계
    yesterday_start = datetime.combine(yesterday, datetime.min.time())
    yesterday_end = datetime.combine(today, datetime.min.time())
    
    # 이벤트 수
    event_count = Event.query.filter(
        Event.datetime >= yesterday_start,
        Event.datetime < yesterday_end
    ).count()
    
    urgent_count = Event.query.filter(
        Event.datetime >= yesterday_start,
        Event.datetime < yesterday_end,
        Event.event_level >= 3
    ).count()
    
    # 자극 세션 수
    session_count = NervestimulationHist.query.filter(
        NervestimulationHist.started_at >= yesterday_start,
        NervestimulationHist.started_at < yesterday_end
    ).count()
    
    current_app.logger.info(
        f"Daily report - Events: {event_count}, Urgent: {urgent_count}, Sessions: {session_count}"
    )
    
    # TODO: 이메일 또는 알림으로 발송


def check_extreme_weather():
    """
    극단적 기상 상황 확인 및 알림
    """
    try:
        from api.crawling import check_extreme_weather as get_weather_warnings
        
        result = get_weather_warnings()
        
        if result.get('has_warnings'):
            # TODO: 관리자에게 알림 발송
            for warning in result.get('warnings', []):
                current_app.logger.warning(f"Weather warning: {warning.get('message')}")
                
    except Exception as e:
        current_app.logger.error(f"Weather check failed: {e}")


# ============================================================
# 스케줄러 초기화
# ============================================================

scheduler = Scheduler()


def init_scheduler(app):
    """
    스케줄러 초기화 및 작업 등록
    
    Args:
        app: Flask 애플리케이션
    """
    scheduler.init_app(app)
    
    # 작업 등록
    scheduler.add_job(check_offline_bands, 60, "check_offline_bands")  # 1분마다
    scheduler.add_job(check_battery_low, 300, "check_battery_low")  # 5분마다
    scheduler.add_job(check_stimulation_sessions, 60, "check_stimulation_sessions")  # 1분마다
    scheduler.add_job(cleanup_old_data, 86400, "cleanup_old_data")  # 24시간마다
    scheduler.add_job(check_extreme_weather, 3600, "check_extreme_weather")  # 1시간마다
    
    # 스케줄러 시작
    scheduler.start()
    
    return scheduler
