# -*- coding: utf-8 -*-
"""
데이터베이스 모듈
"""

# 레거시 호환
from .database import DBManager, db_manager
from . import table
from .service import query, select

# 새로운 SQLAlchemy 모델
from .models import (
    db,
    User,
    Group,
    Band,
    UsersBands,
    SensorData,
    Event,
    NervestimulationStatus,
    NervestimulationHist,
    BloodPressure,
    PrescriptionHist
)

__all__ = [
    # Legacy
    'DBManager',
    'db_manager',
    'table',
    'query',
    'select',
    # New models
    'db',
    'User',
    'Group',
    'Band',
    'UsersBands',
    'SensorData',
    'Event',
    'NervestimulationStatus',
    'NervestimulationHist',
    'BloodPressure',
    'PrescriptionHist'
]
