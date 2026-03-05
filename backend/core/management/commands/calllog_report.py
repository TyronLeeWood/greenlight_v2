import csv
import calendar
from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from core.models import CallLog, CallLogEscalationEvent, Precinct


def month_range(year: int, month: int):
    if month < 1 or month > 12:
        raise CommandError("Month must be between 1 and 12")
    last_day = calendar.monthrange(year, month)[1]
    start = date(year, month, 1)
    end = date(year, month, last_day)
    return start, end


def format_timeline(events):
    parts = []
    for e in events:
        ts = timezone.localtime(e.occurred_at).strftime("%Y-%m-%d %H:%M")
        contact_bits = []
        if e.email:
            contact_bits.append(e.email)
        if e.phone:
            contact_bits.append(e.phone)
        contact = " / ".join(contact_bits) if contact_bits else "-"
        parts.append(f"L{e.level} {ts} {e.name} ({contact})")
    return " ; ".join(parts)


def export_csv(call_logs, out_path: str):
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

    # Prefetch escalation events in one query
    events_by_calllog_id = {}
    events = (
        CallLogEscalationEvent.objects
        .filter(call_log__in=call_logs)
        .select_related("call_log")
        .order_by("call_log_id", "occurred_at")
    )
    for e in events:
        events_by_calllog_id.setdefault(e.call_log_id, []).append(e)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()

        for cl in call_logs:
            timeline = format_timeline(events_by_calllog_id.get(cl.id, []))
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


def export_pdf(call_logs, out_path: str, title: str):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm

    width, height = A4
    c = canvas.Canvas(out_path, pagesize=A4)

    c.setFont("Helvetica-Bold", 14)
    c.drawString(20 * mm, height - 20 * mm, title)

    c.setFont("Helvetica", 9)
    y = height - 30 * mm
    line_h = 5 * mm

    events_by_calllog_id = {}
    events = (
        CallLogEscalationEvent.objects
        .filter(call_log__in=call_logs)
        .select_related("call_log")
        .order_by("call_log_id", "occurred_at")
    )
    for e in events:
        events_by_calllog_id.setdefault(e.call_log_id, []).append(e)

    def wrap(text, max_chars=120):
        s = text or ""
        lines = []
        while len(s) > max_chars:
            lines.append(s[:max_chars])
            s = s[max_chars:]
        lines.append(s)
        return lines

    for cl in call_logs:
        if y < 25 * mm:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = height - 20 * mm

        header = (
            f"{cl.reference_number} | {cl.date.isoformat()} {cl.time.strftime('%H:%M')} | "
            f"{cl.precinct.name if cl.precinct else ''} | {cl.status} | {cl.issue_type} | "
            f"Esc:{cl.escalation_level}"
        )
        c.setFont("Helvetica-Bold", 9)
        c.drawString(20 * mm, y, header)
        y -= line_h

        c.setFont("Helvetica", 9)
        timeline = format_timeline(events_by_calllog_id.get(cl.id, [])) or "(none)"
        for line in wrap("Timeline: " + timeline, max_chars=120):
            c.drawString(20 * mm, y, line)
            y -= line_h

        y -= 2 * mm

    c.save()


class Command(BaseCommand):
    help = "Export monthly call log report (CSV or PDF) including escalation timeline."

    def add_arguments(self, parser):
        parser.add_argument("--year", type=int, required=True)
        parser.add_argument("--month", type=int, required=True)
        parser.add_argument("--format", type=str, choices=["csv", "pdf"], default="csv")
        parser.add_argument("--out", type=str, default="")  # optional output path
        parser.add_argument("--precinct", type=int, default=0)  # precinct id (optional)

    def handle(self, *args, **options):
        year = options["year"]
        month = options["month"]
        fmt = options["format"]
        out = options["out"]
        precinct_id = options["precinct"]

        start, end = month_range(year, month)

        qs = (
            CallLog.objects
            .select_related("precinct")
            .filter(date__gte=start, date__lte=end)
        )

        precinct_name = ""
        if precinct_id:
            try:
                precinct = Precinct.objects.get(pk=precinct_id)
            except Precinct.DoesNotExist:
                raise CommandError(f"Precinct with id={precinct_id} does not exist")
            qs = qs.filter(precinct_id=precinct_id)
            precinct_name = f" - {precinct.name}"

        call_logs = qs.order_by("date", "time", "reference_number")

        if not out:
            suffix = f"_P{precinct_id}" if precinct_id else ""
            out = f"calllog_report_{year}_{month:02d}{suffix}.{fmt}"

        title = f"Greenlight Call Log Report - {year}-{month:02d}{precinct_name}"

        if fmt == "csv":
            export_csv(call_logs, out)
        else:
            export_pdf(call_logs, out, title)

        self.stdout.write(self.style.SUCCESS(f"Saved {fmt.upper()} report to: {out}"))