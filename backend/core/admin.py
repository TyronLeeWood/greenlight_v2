from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, reverse
from django.utils import timezone
from django import forms
from django.shortcuts import render, redirect

from .models import (
    Precinct, CallLog, CallLogEscalationEvent,
    ServiceProvider, ServiceProviderEngagement, ServiceProviderActivityEvent,
    Task,
)
from .reports import (
    get_monthly_calllogs_queryset,
    render_monthly_csv_bytes,
    render_monthly_pdf_bytes,
    resolve_precinct_name,
)


@admin.register(Precinct)
class PrecinctAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "location")
    search_fields = ("name", "location")


class ReportForm(forms.Form):
    year = forms.IntegerField(initial=timezone.localdate().year)
    month = forms.IntegerField(initial=timezone.localdate().month, min_value=1, max_value=12)
    format = forms.ChoiceField(choices=[("csv", "CSV"), ("pdf", "PDF")], initial="csv")
    precinct = forms.ModelChoiceField(queryset=Precinct.objects.all(), required=False)


@admin.register(CallLog)
class CallLogAdmin(admin.ModelAdmin):
    list_display = (
        "id", "reference_number", "date", "time", "issue_type", "status",
        "precinct", "escalation_level", "created_by", "created_at",
    )
    list_filter = ("status", "precinct", "date", "escalation_level")
    search_fields = ("reference_number", "issue_type", "precinct__name")
    autocomplete_fields = ("precinct",)
    readonly_fields = ("reference_number", "created_by", "created_at")

    def save_model(self, request, obj, form, change):
        # set created_by once
        if not change and not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        """
        When new escalation events are added in the inline, set escalated_by automatically.
        """
        instances = formset.save(commit=False)
        for inst in instances:
            if isinstance(inst, CallLogEscalationEvent) and inst.pk is None and not inst.escalated_by_id:
                inst.escalated_by = request.user
            inst.save()
        formset.save_m2m()

    def get_urls(self):
        urls = super().get_urls()
        my_urls = [
            path(
                "monthly-report/",
                self.admin_site.admin_view(self.monthly_report_view),
                name="core_calllog_monthly_report",
            ),
            path(
                "monthly-report/form/",
                self.admin_site.admin_view(self.monthly_report_form_view),
                name="core_calllog_report_form",
            ),
        ]
        return my_urls + urls

    def monthly_report_form_view(self, request):
        if request.method == "POST":
            form = ReportForm(request.POST)
            if form.is_valid():
                year = form.cleaned_data["year"]
                month = form.cleaned_data["month"]
                fmt = form.cleaned_data["format"]
                precinct_obj = form.cleaned_data["precinct"]
                precinct_id = precinct_obj.id if precinct_obj else 0

                base = reverse("admin:core_calllog_monthly_report")
                url = f"{base}?year={year}&month={month}&format={fmt}"
                if precinct_id:
                    url += f"&precinct={precinct_id}"
                return redirect(url)
        else:
            form = ReportForm()

        return render(request, "admin/core/calllog/report_form.html", {"form": form})

    def monthly_report_view(self, request):
        year = int(request.GET.get("year", timezone.localdate().year))
        month = int(request.GET.get("month", timezone.localdate().month))
        fmt = (request.GET.get("format", "csv") or "csv").lower()
        precinct = int(request.GET.get("precinct", "0") or 0)

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


# ----------------------------
# Service Provider admin
# ----------------------------
@admin.register(ServiceProvider)
class ServiceProviderAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "provider_type", "primary_contact_name", "email", "phone")
    list_filter = ("provider_type",)
    search_fields = ("company", "primary_contact_name", "email")


class ActivityEventInline(admin.TabularInline):
    model = ServiceProviderActivityEvent
    extra = 1
    readonly_fields = ("occurred_at", "created_by")


@admin.register(ServiceProviderEngagement)
class ServiceProviderEngagementAdmin(admin.ModelAdmin):
    list_display = ("id", "service_provider", "precinct", "date", "shift", "service_type", "call_log")
    list_filter = ("shift", "service_type", "precinct", "date")
    search_fields = ("service_provider__company", "precinct__name")
    autocomplete_fields = ("precinct", "service_provider", "call_log")
    readonly_fields = ("created_by", "created_at", "updated_at")
    inlines = [ActivityEventInline]

    def save_model(self, request, obj, form, change):
        if not change and not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for inst in instances:
            if isinstance(inst, ServiceProviderActivityEvent) and inst.pk is None and not inst.created_by_id:
                inst.created_by = request.user
            inst.save()
        formset.save_m2m()


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("id", "precinct", "task_type", "status", "owner", "call_log", "service_provider_engagement", "created_at")
    list_filter = ("status", "precinct", "task_type")
    search_fields = ("description", "task_type", "precinct__name")
    autocomplete_fields = ("precinct", "call_log", "service_provider_engagement", "owner")
    readonly_fields = ("created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change and not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)