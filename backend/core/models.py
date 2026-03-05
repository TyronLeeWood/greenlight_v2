from __future__ import annotations

from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings  # add near top of file


# ----------------------------
# Simple dropdown choices
# ----------------------------
class StatusChoices(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"


class ShiftChoices(models.TextChoices):
    DAY = "DAY", "Day"
    NIGHT = "NIGHT", "Night"
    OTHER = "OTHER", "Other"


class ServiceTypeChoices(models.TextChoices):
    CLEANING = "CLEANING", "Cleaning"
    SECURITY = "SECURITY", "Security"
    MAINTENANCE = "MAINTENANCE", "Maintenance"
    OTHER = "OTHER", "Other"


class ProviderTypeChoices(models.TextChoices):
    ADHOC = "ADHOC", "Ad-hoc (once-off)"
    RETAINED = "RETAINED", "Retained (recurring)"


# ----------------------------
# Core reference tables
# ----------------------------
class ProvinceChoices(models.TextChoices):
    WC = "WC", "Western Cape"
    EC = "EC", "Eastern Cape"
    NC = "NC", "Northern Cape"
    FS = "FS", "Free State"
    KZN = "KZN", "KwaZulu-Natal"
    NW = "NW", "North West"
    GP = "GP", "Gauteng"
    MP = "MP", "Mpumalanga"
    LP = "LP", "Limpopo"
    OTHER = "OTHER", "Other"


class Municipality(models.Model):
    name = models.CharField(max_length=120, unique=True)
    province = models.CharField(
        max_length=10,
        choices=ProvinceChoices.choices,
        default=ProvinceChoices.OTHER,
    )

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return f"{self.name} ({self.province})"


class Location(models.Model):
    name = models.CharField(max_length=120)
    address = models.CharField(max_length=255)
    municipality = models.CharField(max_length=120)  # TODO: link to Municipality (ForeignKey)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class Building(models.Model):
    tenant = models.CharField(max_length=120)
    location = models.CharField(max_length=120)  # TODO: link to Location (ForeignKey)
    address = models.CharField(max_length=255)   # TODO: could be derived from Location
    tenant_contact_details = models.TextField(blank=True)

    class Meta:
        ordering = ("tenant",)

    def __str__(self) -> str:
        return f"{self.tenant} - {self.location}"


# ----------------------------
# Precinct + operations (MVP scope: Precinct + CallLog)
# ----------------------------
class Precinct(models.Model):
    name = models.CharField(max_length=120, unique=True)

    # placeholders for later extension
    tasks = models.TextField(blank=True)
    service_providers = models.TextField(blank=True)

    location = models.CharField(max_length=120, blank=True)  # TODO: link to Location (ForeignKey)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name

# ----------------------------
# Reference sequence generator (per date + precinct)
# ----------------------------
class CallLogSequence(models.Model):
    """
    Stores the last used sequence number for a given (date, precinct_key).
    precinct_key is an integer: precinct.id if present, else 0 (when precinct is blank).
    """
    date = models.DateField(db_index=True)
    precinct_key = models.PositiveIntegerField(default=0, db_index=True)
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("date", "precinct_key")

    def __str__(self) -> str:
        return f"{self.date} P{self.precinct_key} last={self.last_number}"

class CallLog(models.Model):
    reference_number = models.CharField(
        max_length=64,
        unique=True,
        editable=False,
        db_index=True,
        blank=True,
    )

    date = models.DateField()
    time = models.TimeField()
    issue_type = models.CharField(max_length=120)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.OPEN,
    )

    precinct = models.ForeignKey(
        Precinct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="call_logs",
    )

    escalation_level = models.PositiveSmallIntegerField(default=0)

    # ✅ audit: who created the call log
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_calllogs",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-date", "-time")
        indexes = [
            models.Index(fields=["precinct", "date"]),
            models.Index(fields=["status", "date"]),
        ]

    def __str__(self) -> str:
        return f"{self.reference_number or '(pending)'} - {self.issue_type}"

    @staticmethod
    def _format_reference(date, precinct_id: int, seq: int) -> str:
        return f"CL-{date.strftime('%Y%m%d')}-P{precinct_id}-{seq:04d}"

    def _generate_reference_number(self) -> str:
        d = self.date or timezone.localdate()
        precinct_id = self.precinct_id or 0

        with transaction.atomic():
            seq_obj, _created = CallLogSequence.objects.get_or_create(
                date=d,
                precinct_key=precinct_id,
                defaults={"last_number": 0},
            )
            seq_obj.last_number += 1
            seq_obj.save(update_fields=["last_number"])
            return self._format_reference(d, precinct_id, seq_obj.last_number)

    def clean(self):
        current = self.escalation_level if self.escalation_level is not None else 0

        if current < 0:
            raise ValidationError({"escalation_level": "Escalation level cannot be negative."})

        if current > 3:
            raise ValidationError({"escalation_level": "Escalation level cannot be greater than 3."})

        if self.pk:
            prev = CallLog.objects.only("escalation_level").get(pk=self.pk)
            prev_level = prev.escalation_level if prev.escalation_level is not None else 0

            if current < prev_level:
                raise ValidationError({"escalation_level": "Escalation can only go up."})

            if current > prev_level + 1:
                raise ValidationError(
                    {"escalation_level": "You can only escalate one level at a time (0→1→2→3)."}
                )

    def save(self, *args, **kwargs):
        creating = self.pk is None

        if creating and not self.reference_number:
            if not self.date:
                self.date = timezone.localdate()
            self.reference_number = self._generate_reference_number()

        self.full_clean()
        super().save(*args, **kwargs)

class CallLogEscalationEvent(models.Model):
    call_log = models.ForeignKey(
        "CallLog",
        on_delete=models.CASCADE,
        related_name="escalation_events",
    )

    level = models.PositiveSmallIntegerField()  # 1..3
    occurred_at = models.DateTimeField(auto_now_add=True)

    name = models.CharField(max_length=120)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)

    escalated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="calllog_escalation_events",
    )

    class Meta:
        ordering = ("occurred_at",)
        unique_together = ("call_log", "level")

    def __str__(self) -> str:
        return f"{self.call_log.reference_number} -> L{self.level} ({self.name})"

    def clean(self):
        if self.level is None:
            raise ValidationError({"level": "Level is required."})

        if self.level < 1 or self.level > 3:
            raise ValidationError({"level": "Escalation level must be between 1 and 3."})

        if not ((self.email or "").strip() or (self.phone or "").strip()):
            raise ValidationError("Provide at least one contact method (email or phone).")

        if self.call_log_id:
            cl_level = self.call_log.escalation_level if self.call_log.escalation_level is not None else 0

            if self.level > cl_level:
                raise ValidationError({"level": "Event level cannot be higher than the call log escalation level."})

            if self.pk is None and self.level != cl_level:
                raise ValidationError({"level": "New escalation event must match the call log escalation_level."})


# ----------------------------
# Service Providers
# ----------------------------
class ServiceProvider(models.Model):
    company = models.CharField(max_length=200)
    provider_type = models.CharField(
        max_length=20,
        choices=ProviderTypeChoices.choices,
        default=ProviderTypeChoices.ADHOC,
    )
    primary_contact_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("company",)

    def __str__(self) -> str:
        return self.company


class ServiceProviderEngagement(models.Model):
    """
    "Who is working when" — links a ServiceProvider to a Precinct on a date/shift.
    Optionally branched from a CallLog.
    """
    precinct = models.ForeignKey(
        Precinct,
        on_delete=models.PROTECT,
        related_name="service_provider_engagements",
    )
    service_provider = models.ForeignKey(
        ServiceProvider,
        on_delete=models.CASCADE,
        related_name="engagements",
    )
    call_log = models.ForeignKey(
        CallLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_provider_engagements",
    )
    service_type = models.CharField(
        max_length=30,
        choices=ServiceTypeChoices.choices,
        default=ServiceTypeChoices.OTHER,
    )
    shift = models.CharField(
        max_length=10,
        choices=ShiftChoices.choices,
        default=ShiftChoices.DAY,
    )
    date = models.DateField()
    contact_details = models.TextField(
        blank=True,
        help_text="Snapshot of on-site contact info for easy lookup.",
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_engagements",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-date", "shift")

    def __str__(self) -> str:
        return f"{self.service_provider} @ {self.precinct} ({self.date} {self.shift})"

    def clean(self):
        if self.call_log_id and self.call_log.precinct_id != self.precinct_id:
            raise ValidationError(
                {"call_log": "Call log must belong to the same precinct as this engagement."}
            )


class ServiceProviderActivityEvent(models.Model):
    """Minimal activity-log entry attached to an engagement."""
    engagement = models.ForeignKey(
        ServiceProviderEngagement,
        on_delete=models.CASCADE,
        related_name="activity_log",
    )
    occurred_at = models.DateTimeField(auto_now_add=True)
    message = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_sp_activity_events",
    )

    class Meta:
        ordering = ("-occurred_at",)

    def __str__(self) -> str:
        return f"Activity on {self.engagement} at {self.occurred_at:%Y-%m-%d %H:%M}"


# ----------------------------
# Tasks
# ----------------------------
class TaskStatusChoices(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    DONE = "DONE", "Done"
    CANCELED = "CANCELED", "Canceled"


class Task(models.Model):
    precinct = models.ForeignKey(
        Precinct,
        on_delete=models.PROTECT,
        related_name="task_items",
    )
    call_log = models.ForeignKey(
        CallLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="task_items",
    )
    service_provider_engagement = models.ForeignKey(
        ServiceProviderEngagement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="task_items",
    )
    task_type = models.CharField(max_length=120, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_tasks",
    )
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    sharepoint_link = models.URLField(max_length=500, blank=True)
    status = models.CharField(
        max_length=20,
        choices=TaskStatusChoices.choices,
        default=TaskStatusChoices.OPEN,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"Task #{self.pk} ({self.status}) - {self.precinct}"

    def clean(self):
        if self.call_log_id and self.call_log.precinct_id != self.precinct_id:
            raise ValidationError(
                {"call_log": "Call log must belong to the same precinct as this task."}
            )
        if self.service_provider_engagement_id:
            if self.service_provider_engagement.precinct_id != self.precinct_id:
                raise ValidationError(
                    {"service_provider_engagement": "Engagement must belong to the same precinct as this task."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)