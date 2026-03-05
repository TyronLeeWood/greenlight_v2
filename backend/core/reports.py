import csv
import calendar
from datetime import date
from io import StringIO, BytesIO

from django.utils import timezone

from core.models import CallLog, CallLogEscalationEvent, Precinct


def month_range(year: int, month: int):
    last_day = calendar.monthrange(year, month)[1]
    start = date(year, month, 1)
    end = date(year, month, last_day)
    return start, end


def _format_timeline(events):
    parts = []
    for e in events:
        ts = timezone.localtime(e.occurred_at).strftime("%Y-%m-%d %H:%M")
        contact_bits = []
        if e.email:
            contact_bits.append(e.email)
        if e.phone:
            contact_bits.append(e.phone)
        contact = " / ".join(contact_bits) if contact_bits else "-"
        by = e.escalated_by.username if getattr(e, "escalated_by", None) else "-"
        parts.append(f"L{e.level} {ts} {e.name} ({contact}) by {by}")
    return " ; ".join(parts)


def get_monthly_calllogs_queryset(year: int, month: int, precinct_id: int | None = None):
    start, end = month_range(year, month)
    qs = (
        CallLog.objects
        .select_related("precinct")
        .filter(date__gte=start, date__lte=end)
        .order_by("date", "time", "reference_number")
    )
    if precinct_id:
        qs = qs.filter(precinct_id=precinct_id)
    return qs


def _events_map(call_logs_qs):
    events_by_id = {}
    events = (
        CallLogEscalationEvent.objects
        .filter(call_log__in=call_logs_qs)
        .order_by("call_log_id", "occurred_at")
    )
    for e in events:
        events_by_id.setdefault(e.call_log_id, []).append(e)
    return events_by_id


def render_monthly_csv_bytes(call_logs_qs) -> bytes:
    headers = [
        "reference_number",
        "date",
        "time",
        "precinct",
        "status",
        "issue_type",
        "escalation_level",
        "escalation_timeline",
    ]

    events_by_id = _events_map(call_logs_qs)

    buf = StringIO()
    writer = csv.DictWriter(buf, fieldnames=headers)
    writer.writeheader()

    for cl in call_logs_qs:
        timeline = _format_timeline(events_by_id.get(cl.id, []))
        writer.writerow({
            "reference_number": cl.reference_number,
            "date": cl.date.isoformat(),
            "time": cl.time.strftime("%H:%M:%S"),
            "precinct": cl.precinct.name if cl.precinct else "",
            "status": cl.status,
            "issue_type": cl.issue_type,
            "escalation_level": cl.escalation_level,
            "escalation_timeline": timeline,
        })

    return buf.getvalue().encode("utf-8")


def render_monthly_pdf_bytes(call_logs_qs, title: str) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm

    events_by_id = _events_map(call_logs_qs)

    out = BytesIO()
    width, height = A4
    c = canvas.Canvas(out, pagesize=A4)

    def wrap(text, max_chars=120):
        s = text or ""
        lines = []
        while len(s) > max_chars:
            lines.append(s[:max_chars])
            s = s[max_chars:]
        lines.append(s)
        return lines

    def draw_header():
        c.setFont("Helvetica-Bold", 14)
        c.drawString(20 * mm, height - 20 * mm, title)
        c.setFont("Helvetica", 9)

    draw_header()
    y = height - 30 * mm
    line_h = 5 * mm

    for cl in call_logs_qs:
        if y < 25 * mm:
            c.showPage()
            draw_header()
            y = height - 30 * mm

        header = (
            f"{cl.reference_number} | {cl.date.isoformat()} {cl.time.strftime('%H:%M')} | "
            f"{cl.precinct.name if cl.precinct else ''} | {cl.status} | {cl.issue_type} | "
            f"Esc:{cl.escalation_level}"
        )
        c.setFont("Helvetica-Bold", 9)
        c.drawString(20 * mm, y, header)
        y -= line_h

        c.setFont("Helvetica", 9)
        timeline = _format_timeline(events_by_id.get(cl.id, [])) or "(none)"
        for line in wrap("Timeline: " + timeline, max_chars=120):
            c.drawString(20 * mm, y, line)
            y -= line_h

        y -= 2 * mm

    c.save()
    return out.getvalue()


def resolve_precinct_name(precinct_id: int | None) -> str:
    if not precinct_id:
        return ""
    try:
        p = Precinct.objects.get(pk=precinct_id)
        return p.name
    except Precinct.DoesNotExist:
        return ""