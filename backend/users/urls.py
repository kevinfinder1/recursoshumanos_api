from django.urls import path
from .views import CurrentUserView, ProfileView, UserListView

urlpatterns = [
    path("me/", CurrentUserView.as_view(), name="current_user"),
    path("profile/", ProfileView.as_view(), name="user_profile"),
    path("list/", UserListView.as_view(), name="user_list"),  # ✅ NUEVO
]
