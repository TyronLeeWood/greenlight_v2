from django.http import HttpResponse
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .reports import (
    get_monthly_calllogs_queryset,
    render_monthly_csv_bytes,
    render_monthly_pdf_bytes,
    resolve_precinct_name,
)


class MonthlyCallLogReportDownload(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get("year", timezone.localdate().year))
        month = int(request.query_params.get("month", timezone.localdate().month))
        fmt = (request.query_params.get("file_format", "csv") or "csv").lower()
        precinct = int(request.query_params.get("precinct", "0") or 0)

        qs = get_monthly_calllogs_queryset(year, month, precinct_id=precinct or None)
        precinct_name = resolve_precinct_name(precinct or None)
        suffix = f"_P{precinct}" if precinct else ""
        title = f"Greenlight Call Log Report - {year}-{month:02d}" + (f" - {precinct_name}" if precinct_name else "")

        if fmt == "pdf":
            data = render_monthly_pdf_bytes(qs, title=title)
            filename = f"calllog_report_{year}_{month:02d}{suffix}.pdf"
            content_type = "application/pdf"
        else:
            data = render_monthly_csv_bytes(qs)
            filename = f"calllog_report_{year}_{month:02d}{suffix}.csv"
            content_type = "text/csv"

        resp = HttpResponse(data, content_type=content_type)
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp
