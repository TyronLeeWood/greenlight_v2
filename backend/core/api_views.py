from django.db import transaction
from django.core.exceptions import ValidationError

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Precinct, CallLog, CallLogEscalationEvent,
    ServiceProvider, ServiceProviderEngagement, ServiceProviderActivityEvent,
    Task,
)
from .serializers import (
    PrecinctSerializer,
    CallLogSerializer,
    CallLogEscalationEventSerializer,
    EscalateRequestSerializer,
    ServiceProviderSerializer,
    ServiceProviderEngagementSerializer,
    ServiceProviderActivityEventSerializer,
    TaskSerializer,
)


class PrecinctViewSet(viewsets.ModelViewSet):
    queryset = Precinct.objects.all().order_by("name")
    serializer_class = PrecinctSerializer
    permission_classes = [IsAuthenticated]


class CallLogViewSet(viewsets.ModelViewSet):
    queryset = CallLog.objects.select_related("precinct", "created_by").all().order_by("-date", "-time")
    serializer_class = CallLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        precinct_id = self.request.query_params.get("precinct")
        if precinct_id:
            qs = qs.filter(precinct_id=precinct_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], serializer_class=EscalateRequestSerializer)
    def escalate(self, request, pk=None):
        """
        POST /api/calllogs/<id>/escalate/
        Body: { "name": "...", "email": "", "phone": "" }

        - increments escalation_level by 1 (max 3)
        - creates escalation event for that new level
        - stamps escalated_by=request.user
        """
        call_log = self.get_object()

        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        name = ser.validated_data["name"].strip()
        email = (ser.validated_data.get("email") or "").strip()
        phone = (ser.validated_data.get("phone") or "").strip()

        current = call_log.escalation_level or 0
        if current >= 3:
            return Response(
                {"escalation_level": "Already at max escalation level (3)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_level = current + 1

        try:
            with transaction.atomic():
                # bump the call log level (+1 only)
                call_log.escalation_level = new_level
                call_log.full_clean()
                call_log.save()

                # create matching escalation event
                ev = CallLogEscalationEvent(
                    call_log=call_log,
                    level=new_level,
                    name=name,
                    email=email,
                    phone=phone,
                    escalated_by=request.user,
                )
                ev.full_clean()
                ev.save()

        except ValidationError as e:
            payload = e.message_dict if hasattr(e, "message_dict") else {"error": e.messages}
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        calllog_data = CallLogSerializer(call_log, context={"request": request}).data
        event_data = CallLogEscalationEventSerializer(ev, context={"request": request}).data
        return Response({"call_log": calllog_data, "new_event": event_data}, status=status.HTTP_200_OK)


class CallLogEscalationEventViewSet(viewsets.ModelViewSet):
    queryset = CallLogEscalationEvent.objects.select_related("call_log", "escalated_by").all().order_by("-occurred_at")
    serializer_class = CallLogEscalationEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        call_log_id = self.request.query_params.get("call_log")
        if call_log_id:
            qs = qs.filter(call_log_id=call_log_id)
        return qs

    def perform_create(self, serializer):
        """
        Manual creation still allowed via /api/escalations/,
        but server sets level = call_log.escalation_level.
        """
        call_log = serializer.validated_data["call_log"]
        level = call_log.escalation_level or 0

        if level <= 0:
            raise ValidationError({"level": "Call log is not escalated yet (level is 0)."})

        serializer.save(escalated_by=self.request.user, level=level)


# ----------------------------
# Service Provider viewsets
# ----------------------------
class ServiceProviderViewSet(viewsets.ModelViewSet):
    queryset = ServiceProvider.objects.all()
    serializer_class = ServiceProviderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        provider_type = self.request.query_params.get("provider_type")
        if provider_type:
            qs = qs.filter(provider_type=provider_type)
        return qs


class ServiceProviderEngagementViewSet(viewsets.ModelViewSet):
    queryset = ServiceProviderEngagement.objects.select_related(
        "precinct", "service_provider", "call_log", "created_by",
    ).all()
    serializer_class = ServiceProviderEngagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        precinct_id = self.request.query_params.get("precinct")
        if precinct_id:
            qs = qs.filter(precinct_id=precinct_id)
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
        shift = self.request.query_params.get("shift")
        if shift:
            qs = qs.filter(shift=shift)
        service_provider_id = self.request.query_params.get("service_provider")
        if service_provider_id:
            qs = qs.filter(service_provider_id=service_provider_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=["get", "post"], serializer_class=ServiceProviderActivityEventSerializer)
    def activity(self, request, pk=None):
        """
        GET  /api/service-provider-engagements/<id>/activity/  — list activity events
        POST /api/service-provider-engagements/<id>/activity/  — create activity event
        """
        engagement = self.get_object()

        if request.method == "GET":
            events = engagement.activity_log.all()
            serializer = ServiceProviderActivityEventSerializer(events, many=True)
            return Response(serializer.data)

        serializer = ServiceProviderActivityEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(engagement=engagement, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ----------------------------
# Task viewset
# ----------------------------
class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related(
        "precinct", "call_log", "service_provider_engagement", "owner", "created_by",
    ).all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        precinct_id = self.request.query_params.get("precinct")
        if precinct_id:
            qs = qs.filter(precinct_id=precinct_id)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        call_log_id = self.request.query_params.get("call_log")
        if call_log_id:
            qs = qs.filter(call_log_id=call_log_id)
        engagement_id = self.request.query_params.get("service_provider_engagement")
        if engagement_id:
            qs = qs.filter(service_provider_engagement_id=engagement_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ----------------------------
# Calendar aggregation endpoint
# ----------------------------
from datetime import datetime as _dt

from rest_framework.decorators import api_view, permission_classes as perm_classes


@api_view(["GET"])
@perm_classes([IsAuthenticated])
def calendar_view(request):
    """
    GET /api/calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD&precinct=all|<id>

    Returns calendar events (call_logs, engagements, tasks with due_date)
    plus a side task list split into no_due / due sections.
    """
    from django.utils import timezone as tz

    start_str = request.query_params.get("start")
    end_str = request.query_params.get("end")
    if not start_str or not end_str:
        return Response(
            {"detail": "Both 'start' and 'end' query params are required (YYYY-MM-DD)."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        start_date = _dt.strptime(start_str, "%Y-%m-%d").date()
        end_date = _dt.strptime(end_str, "%Y-%m-%d").date()
    except ValueError:
        return Response(
            {"detail": "Invalid date format. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    precinct_param = request.query_params.get("precinct", "all")

    def _apply_precinct(qs, field="precinct_id"):
        if precinct_param and precinct_param != "all":
            return qs.filter(**{field: precinct_param})
        return qs

    # ---- Events ----
    events = []

    # CallLog events — use call_log.date
    cl_qs = _apply_precinct(
        CallLog.objects.select_related("precinct")
        .filter(date__range=(start_date, end_date))
    )
    for cl in cl_qs:
        p_name = cl.precinct.name if cl.precinct else ""
        events.append({
            "kind": "call_log",
            "id": cl.id,
            "title": f"{cl.reference_number} — {p_name}",
            "start": tz.make_aware(
                _dt.combine(cl.date, cl.time)
            ).isoformat() if cl.time else _dt.combine(cl.date, _dt.min.time()).isoformat(),
            "end": None,
            "precinct": {"id": cl.precinct_id, "name": p_name} if cl.precinct else None,
            "meta": {
                "status": cl.status,
                "issue_type": cl.issue_type,
                "escalation_level": cl.escalation_level,
            },
        })

    # Engagement events — use engagement.date
    eng_qs = _apply_precinct(
        ServiceProviderEngagement.objects.select_related("precinct", "service_provider")
        .filter(date__range=(start_date, end_date))
    )
    for eng in eng_qs:
        p_name = eng.precinct.name if eng.precinct else ""
        events.append({
            "kind": "engagement",
            "id": eng.id,
            "title": f"{eng.service_provider.company} — {eng.get_shift_display()} — {p_name}",
            "start": _dt.combine(eng.date, _dt.min.time()).isoformat(),
            "end": None,
            "precinct": {"id": eng.precinct_id, "name": p_name} if eng.precinct else None,
            "meta": {
                "service_type": eng.service_type,
                "shift": eng.shift,
                "provider_id": eng.service_provider_id,
            },
        })

    # Task events — only tasks with due_date within range
    task_event_qs = _apply_precinct(
        Task.objects.select_related("precinct")
        .filter(due_date__range=(start_date, end_date))
        .exclude(due_date__isnull=True)
    )
    for t in task_event_qs:
        p_name = t.precinct.name if t.precinct else ""
        events.append({
            "kind": "task",
            "id": t.id,
            "title": f"{t.task_type or 'Task'} [{t.get_status_display()}]",
            "start": _dt.combine(t.due_date, _dt.min.time()).isoformat(),
            "end": None,
            "precinct": {"id": t.precinct_id, "name": p_name} if t.precinct else None,
            "meta": {
                "status": t.status,
                "description": t.description[:120] if t.description else "",
            },
        })

    # ---- Side task list ----
    base_task_qs = _apply_precinct(
        Task.objects.select_related("precinct")
        .exclude(status="DONE")
    )

    def _task_item(t):
        return {
            "id": t.id,
            "title": t.task_type or "Task",
            "precinct": {"id": t.precinct_id, "name": t.precinct.name} if t.precinct else None,
            "status": t.status,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "call_log_id": t.call_log_id,
            "engagement_id": t.service_provider_engagement_id,
        }

    no_due = [_task_item(t) for t in base_task_qs.filter(due_date__isnull=True)]
    due = [_task_item(t) for t in base_task_qs.filter(due_date__isnull=False).order_by("due_date")]

    return Response({
        "events": events,
        "tasks_side_list": {
            "no_due": no_due,
            "due": due,
        },
    })


# ----------------------------
# Dashboard aggregation endpoint
# ----------------------------
@api_view(["GET"])
@perm_classes([IsAuthenticated])
def dashboard_view(request):
    """
    GET /api/dashboard/?precinct=all|<id>

    Returns counts of call logs and tasks (total vs open) plus a compliance
    percentage.  Completion logic:
      - CallLog is complete if status in {RESOLVED, CLOSED}
      - Task is complete if status == DONE
    """
    precinct_param = request.query_params.get("precinct", "all")

    cl_qs = CallLog.objects.all()
    task_qs = Task.objects.all()

    if precinct_param and precinct_param != "all":
        cl_qs = cl_qs.filter(precinct_id=precinct_param)
        task_qs = task_qs.filter(precinct_id=precinct_param)

    cl_total = cl_qs.count()
    cl_open = cl_qs.exclude(status__in=["RESOLVED", "CLOSED"]).count()

    tasks_total = task_qs.count()
    tasks_open = task_qs.exclude(status="DONE").count()

    items_total = cl_total + tasks_total
    items_open = cl_open + tasks_open

    if items_total == 0:
        compliance = 100
    else:
        compliance = round(100 * (1 - items_open / items_total))

    return Response({
        "precinct_filter": precinct_param,
        "counts": {
            "call_logs_total": cl_total,
            "call_logs_open": cl_open,
            "tasks_total": tasks_total,
            "tasks_open": tasks_open,
            "items_total": items_total,
            "items_open": items_open,
        },
        "compliance_percent": compliance,
    })
