from rest_framework import serializers
from .models import (
    Precinct, CallLog, CallLogEscalationEvent,
    ServiceProvider, ServiceProviderEngagement, ServiceProviderActivityEvent,
    Task,
)


class PrecinctSerializer(serializers.ModelSerializer):
    class Meta:
        model = Precinct
        fields = ["id", "name", "location"]


class CallLogEscalationEventSerializer(serializers.ModelSerializer):
    escalated_by_username = serializers.CharField(source="escalated_by.username", read_only=True)

    class Meta:
        model = CallLogEscalationEvent
        fields = [
            "id", "call_log", "level", "occurred_at",
            "name", "email", "phone",
            "escalated_by_username",
        ]
        read_only_fields = ["level", "occurred_at", "escalated_by_username"]


class CallLogSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    precinct_name = serializers.CharField(source="precinct.name", read_only=True)

    escalation_events = CallLogEscalationEventSerializer(many=True, read_only=True)

    class Meta:
        model = CallLog
        fields = [
            "id", "reference_number", "date", "time", "issue_type", "status",
            "precinct", "precinct_name", "escalation_level",
            "created_by_username", "created_at",
            "escalation_events",
        ]
        read_only_fields = [
            "reference_number", "created_by_username", "created_at", "escalation_events"
        ]


class EscalateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=40)

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip()
        phone = (attrs.get("phone") or "").strip()
        if not (email or phone):
            raise serializers.ValidationError("Provide email or phone (or both).")
        return attrs


# ----------------------------
# Service Provider serializers
# ----------------------------
class ServiceProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceProvider
        fields = [
            "id", "company", "provider_type",
            "primary_contact_name", "email", "phone",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ServiceProviderEngagementSerializer(serializers.ModelSerializer):
    precinct_name = serializers.CharField(source="precinct.name", read_only=True)
    service_provider_name = serializers.CharField(source="service_provider.company", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = ServiceProviderEngagement
        fields = [
            "id", "precinct", "precinct_name",
            "service_provider", "service_provider_name",
            "call_log", "service_type", "shift", "date",
            "contact_details", "notes",
            "created_by_username", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by_username", "created_at", "updated_at"]

    def validate(self, attrs):
        call_log = attrs.get("call_log") or (self.instance.call_log if self.instance else None)
        precinct = attrs.get("precinct") or (self.instance.precinct if self.instance else None)
        if call_log and precinct and call_log.precinct_id != precinct.id:
            raise serializers.ValidationError(
                {"call_log": "Call log must belong to the same precinct as this engagement."}
            )
        return attrs


class ServiceProviderActivityEventSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = ServiceProviderActivityEvent
        fields = [
            "id", "engagement", "occurred_at", "message",
            "created_by_username",
        ]
        read_only_fields = ["occurred_at", "created_by_username"]


# ----------------------------
# Task serializer
# ----------------------------
class TaskSerializer(serializers.ModelSerializer):
    precinct_name = serializers.CharField(source="precinct.name", read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "precinct", "precinct_name",
            "call_log", "service_provider_engagement",
            "task_type", "owner", "owner_username",
            "description", "sharepoint_link", "due_date", "status",
            "created_by_username", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by_username", "created_at", "updated_at"]

    def validate(self, attrs):
        call_log = attrs.get("call_log") or (self.instance.call_log if self.instance else None)
        engagement = attrs.get("service_provider_engagement") or (
            self.instance.service_provider_engagement if self.instance else None
        )
        precinct = attrs.get("precinct") or (self.instance.precinct if self.instance else None)

        if call_log and precinct and call_log.precinct_id != precinct.id:
            raise serializers.ValidationError(
                {"call_log": "Call log must belong to the same precinct as this task."}
            )
        if engagement and precinct and engagement.precinct_id != precinct.id:
            raise serializers.ValidationError(
                {"service_provider_engagement": "Engagement must belong to the same precinct as this task."}
            )
        return attrs