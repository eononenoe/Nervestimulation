# -*- coding: utf-8 -*-
"""
이벤트/알림 API 모듈
이벤트 조회, 해결 처리
"""

from flask import Blueprint, jsonify, request, g
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from backend.db.models import db, Band, Event
from backend.utils import token_required, success_response, error_response, paginate_query

events_bp = Blueprint('events', __name__)


@events_bp.route('', methods=['GET'])
@token_required
def get_events():
    """
    이벤트 목록 조회
    
    GET /api/Wellsafer/v1/events?page=1&per_page=20&level=&type=&resolved=&bid=
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    level = request.args.get('level', type=int)
    event_type = request.args.get('type')
    resolved = request.args.get('resolved')
    bid = request.args.get('bid')
    
    query = Event.query
    
    if bid:
        band = Band.query.filter_by(bid=bid).first()
        if band:
            query = query.filter_by(FK_bid=band.id)

    if level:
        # event_level is a property, map to actual type column
        level = int(level)
        if level == 4:  # SOS, fall
            query = query.filter(Event.type.in_([6, 7]))
        elif level == 3:  # Vital signs abnormal
            query = query.filter(Event.type.in_([8, 9, 10]))
        elif level == 1:  # Other
            query = query.filter(~Event.type.in_([6, 7, 8, 9, 10]))

    if event_type:
        # event_type is a property, map to actual type column
        type_map = {'sos': 6, 'fall': 7, 'hr_high': 8, 'hr_low': 9, 'spo2_low': 10}
        if event_type in type_map:
            query = query.filter_by(type=type_map[event_type])

    if resolved is not None:
        # is_resolved is a property, use action_status instead
        is_resolved = resolved.lower() == 'true'
        if is_resolved:
            query = query.filter_by(action_status=2)
        else:
            query = query.filter(Event.action_status != 2)
    
    query = query.order_by(Event.datetime.desc())
    result = paginate_query(query, page, per_page)
    
    events_list = []
    for event in result['items']:
        event_dict = event.to_dict()
        band = Band.query.get(event.FK_bid)
        if band:
            event_dict['bid'] = band.bid
            event_dict['wearer_name'] = band.wearer_name
        events_list.append(event_dict)
    
    return success_response({
        'data': events_list,
        'pagination': {
            'page': result['page'],
            'per_page': result['per_page'],
            'total': result['total'],
            'pages': result['pages'],
            'has_prev': result['has_prev'],
            'has_next': result['has_next']
        }
    })


@events_bp.route('/<int:event_id>', methods=['GET'])
@token_required
def get_event(event_id):
    """
    이벤트 상세 조회
    
    GET /api/Wellsafer/v1/events/<event_id>
    """
    event = Event.query.get(event_id)
    
    if not event:
        return error_response('Event not found', 404)
    
    event_dict = event.to_dict()
    band = Band.query.get(event.FK_bid)
    if band:
        event_dict['bid'] = band.bid
        event_dict['wearer_name'] = band.wearer_name
        event_dict['guardian_phone'] = band.guardian_phone
    
    return success_response(event_dict)


@events_bp.route('/<int:event_id>/resolve', methods=['POST'])
@token_required
def resolve_event(event_id):
    """
    이벤트 해결 처리
    
    POST /api/Wellsafer/v1/events/<event_id>/resolve
    """
    event = Event.query.get(event_id)
    
    if not event:
        return error_response('Event not found', 404)
    
    if event.is_resolved:
        return error_response('Event is already resolved', 400)
    
    event.is_resolved = True
    event.resolved_at = datetime.utcnow()
    event.resolved_by = g.current_user.id
    
    db.session.commit()
    
    return success_response({
        'id': event.id,
        'is_resolved': True,
        'resolved_at': event.resolved_at.isoformat()
    })


@events_bp.route('/<int:event_id>/read', methods=['POST'])
@token_required
def mark_as_read(event_id):
    """
    이벤트 읽음 처리
    
    POST /api/Wellsafer/v1/events/<event_id>/read
    """
    event = Event.query.get(event_id)
    
    if not event:
        return error_response('Event not found', 404)
    
    event.is_read = True
    db.session.commit()
    
    return success_response({'id': event.id, 'is_read': True})


@events_bp.route('/bulk-read', methods=['POST'])
@token_required
def bulk_mark_as_read():
    """
    다중 이벤트 읽음 처리
    
    POST /api/Wellsafer/v1/events/bulk-read
    {
        "event_ids": [1, 2, 3]
    }
    """
    data = request.get_json()
    event_ids = data.get('event_ids', [])
    
    if not event_ids:
        return error_response('event_ids is required', 400)
    
    updated = Event.query.filter(Event.id.in_(event_ids)).update(
        {'is_read': True},
        synchronize_session=False
    )
    db.session.commit()
    
    return success_response({'updated_count': updated})


@events_bp.route('/bulk-resolve', methods=['POST'])
@token_required
def bulk_resolve():
    """
    다중 이벤트 해결 처리
    
    POST /api/Wellsafer/v1/events/bulk-resolve
    {
        "event_ids": [1, 2, 3]
    }
    """
    data = request.get_json()
    event_ids = data.get('event_ids', [])
    
    if not event_ids:
        return error_response('event_ids is required', 400)
    
    updated = Event.query.filter(
        Event.id.in_(event_ids),
        Event.is_resolved == False
    ).update(
        {
            'is_resolved': True,
            'resolved_at': datetime.utcnow(),
            'resolved_by': g.current_user.id
        },
        synchronize_session=False
    )
    db.session.commit()
    
    return success_response({'resolved_count': updated})


@events_bp.route('/statistics', methods=['GET'])
@token_required
def get_event_statistics():
    """
    이벤트 통계
    
    GET /api/Wellsafer/v1/events/statistics?days=7
    """
    days = request.args.get('days', 7, type=int)
    days = min(30, max(1, days))
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # 유형별 통계
    type_stats = db.session.query(
        Event.event_type,
        func.count(Event.id).label('count')
    ).filter(
        Event.datetime >= start_date
    ).group_by(Event.event_type).all()
    
    # 레벨별 통계
    level_stats = db.session.query(
        Event.event_level,
        func.count(Event.id).label('count')
    ).filter(
        Event.datetime >= start_date
    ).group_by(Event.event_level).all()
    
    # 일별 통계
    daily_stats = db.session.query(
        func.date(Event.datetime).label('date'),
        func.count(Event.id).label('count')
    ).filter(
        Event.datetime >= start_date
    ).group_by(func.date(Event.datetime)).all()
    
    # 미해결 이벤트
    unresolved = Event.query.filter_by(is_resolved=False).count()
    unread = Event.query.filter_by(is_read=False).count()
    
    return success_response({
        'period_days': days,
        'by_type': {row.event_type: row.count for row in type_stats},
        'by_level': {row.event_level: row.count for row in level_stats},
        'daily': [
            {'date': str(row.date), 'count': row.count}
            for row in daily_stats
        ],
        'unresolved_count': unresolved,
        'unread_count': unread
    })


@events_bp.route('/urgent', methods=['GET'])
@token_required
def get_urgent_events():
    """
    긴급 이벤트 목록 (미해결)
    
    GET /api/Wellsafer/v1/events/urgent
    """
    events = Event.query.filter(
        Event.event_level >= 3,
        Event.is_resolved == False
    ).order_by(Event.datetime.desc()).limit(50).all()
    
    events_list = []
    for event in events:
        event_dict = event.to_dict()
        band = Band.query.get(event.FK_bid)
        if band:
            event_dict['bid'] = band.bid
            event_dict['wearer_name'] = band.wearer_name
            event_dict['guardian_phone'] = band.guardian_phone
        events_list.append(event_dict)
    
    return success_response(events_list)


@events_bp.route('/resend-sms/<int:event_id>', methods=['POST'])
@token_required
def resend_sms(event_id):
    """
    SMS 재발송
    
    POST /api/Wellsafer/v1/events/<event_id>/resend-sms
    """
    event = Event.query.get(event_id)
    
    if not event:
        return error_response('Event not found', 404)
    
    band = Band.query.get(event.FK_bid)
    
    if not band or not band.guardian_phone:
        return error_response('Guardian phone not found', 400)
    
    from sms.send_sms import send_sms
    from sms.utils import get_message_template
    
    try:
        message = get_message_template(
            event.event_type,
            name=band.wearer_name or '착용자',
            value=event.value,
            location=band.address or '위치 정보 없음'
        )
        
        result = send_sms(band.guardian_phone, message)
        
        event.sms_sent = True
        event.sms_sent_at = datetime.utcnow()
        db.session.commit()
        
        return success_response({
            'sent': True,
            'phone': band.guardian_phone,
            'sent_at': event.sms_sent_at.isoformat()
        })
        
    except Exception as e:
        return error_response(f'SMS sending failed: {str(e)}', 500)
