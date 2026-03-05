"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from core.session_auth_api import SessionLoginView, SessionLogoutView
from core.csrf_api import CsrfView
from core.api import MonthlyCallLogReportDownload

urlpatterns = [
    path("api/auth/csrf/", CsrfView.as_view(), name="api_csrf"),
    path('admin/', admin.site.urls),
    path("api/reports/calllogs/monthly/", MonthlyCallLogReportDownload.as_view(), name="monthly_calllog_report"),
    path("api/", include("core.urls_api")),
    path("api/auth/session-login/", SessionLoginView.as_view()),
    path("api/auth/session-logout/", SessionLogoutView.as_view()),
]
