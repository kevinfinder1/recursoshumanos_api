from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from chat.views import FileDownloadView

urlpatterns = [
    path('admin/', admin.site.urls),   # ← CAMBIADO: admin por defecto
    path('api/', include('tickets.urls')),
    path('api/', include('notifications.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("api/user/", include("users.urls")),   # /api/user/me/
    path("api/users/", include("users.urls")),  # /api/users/
    path("api/chat/", include("chat.urls")),
    path('api/adminpanel/', include('adminpanel.urls')),
    path('api/admin/', include('adminpanel.urls')),

    # ⭐ RUTA PARA DESCARGA DE ARCHIVOS PROTEGIDA
    re_path(r'^media/chat_files/(?P<file_path>.*)$', FileDownloadView.as_view(), name='file_download'),
]
