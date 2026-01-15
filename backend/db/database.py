# -*- coding: utf-8 -*-
"""
데이터베이스 매니저 모듈
싱글톤 패턴 기반 데이터베이스 연결 관리
"""

from backend import db
from contextlib import contextmanager


class DBManager:
    """싱글톤 패턴 기반 데이터베이스 매니저"""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def _initialize(self):
        """초기화 (한 번만 실행)"""
        if not self._initialized:
            self._initialized = True
    
    @contextmanager
    def get_session(self):
        """
        데이터베이스 세션 컨텍스트 매니저
        
        사용 예:
            with db_manager.get_session() as session:
                session.add(new_record)
        """
        try:
            yield db.session
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise e
    
    def execute_query(self, query, params=None):
        """
        Raw SQL 쿼리 실행
        
        Args:
            query: SQL 쿼리 문자열
            params: 쿼리 파라미터 딕셔너리
        
        Returns:
            쿼리 결과
        """
        try:
            result = db.session.execute(query, params or {})
            db.session.commit()
            return result
        except Exception as e:
            db.session.rollback()
            raise e


# 전역 인스턴스
db_manager = DBManager()
