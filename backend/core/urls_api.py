from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api_views import (
    PrecinctViewSet,
    CallLogViewSet,
    CallLogEscalationEventViewSet,
    ServiceProviderViewSet,
    ServiceProviderEngagementViewSet,
    TaskViewSet,
    calendar_view,
    dashboard_view,
)

router = DefaultRouter()
router.register(r"precincts", PrecinctViewSet, basename="precinct")
router.register(r"calllogs", CallLogViewSet, basename="calllog")
router.register(r"escalations", CallLogEscalationEventViewSet, basename="escalation")
router.register(r"serviceproviders", ServiceProviderViewSet, basename="serviceprovider")
router.register(r"service-provider-engagements", ServiceProviderEngagementViewSet, basename="engagement")
router.register(r"tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("calendar/", calendar_view, name="calendar"),
    path("dashboard/", dashboard_view, name="dashboard"),
    path("", include(router.urls)),
]
