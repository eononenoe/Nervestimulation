# -*- coding: utf-8 -*-
"""
데이터베이스 모델 - backend.db.table에서 re-export
"""

# Import db from parent backend module
from backend import db

# Import all models from table package
from backend.db.table import (
    User, Group, Band, UserBand, SensorData, Event, EventType
)
from backend.db.table import (
    NerveStimSession, NerveStimHistory, BloodPressure, Prescription,
    SessionStatus, EndReason
)

# For backward compatibility, create aliases
UsersBands = UserBand
NervestimulationStatus = NerveStimSession
NervestimulationHist = NerveStimHistory

# Export everything
__all__ = [
    'db',
    'User',
    'Group',
    'Band',
    'UserBand',
    'UsersBands',
    'SensorData',
    'Event',
    'EventType',
    'NerveStimSession',
    'NerveStimHistory',
    'BloodPressure',
    'Prescription',
    'SessionStatus',
    'EndReason',
    'NervestimulationStatus',
    'NervestimulationHist'
]
