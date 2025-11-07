from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.html import format_html
from .models import User, Profile


# -------------------------------
# Formularios personalizados
# -------------------------------

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("username", "email", "role")


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = ("username", "email", "role", "is_active", "is_staff", "is_superuser")


# -------------------------------
# Inline del perfil
# -------------------------------

class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = "Perfil"
    fk_name = "user"
    extra = 0
    fields = ("bio", "avatar", "preview_avatar")

    readonly_fields = ("preview_avatar",)

    def preview_avatar(self, obj):
        if obj.avatar:
            return format_html(
                '<img src="{}" width="80" height="80" style="border-radius:50%; object-fit:cover;"/>',
                obj.avatar.url
            )
        return "Sin imagen"

    preview_avatar.short_description = "Vista previa"


# -------------------------------
# Configuración del admin de usuarios
# -------------------------------

class UserAdmin(BaseUserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = User

    list_display = ("username", "email", "role", "is_active", "is_staff", "avatar_preview", "last_login")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email")
    ordering = ("username",)

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Información personal", {"fields": ("email", "role")}),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas importantes", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "role", "password1", "password2", "is_staff", "is_active"),
        }),
    )

    inlines = [ProfileInline]

    # 🖼️ Miniatura en la tabla
    def avatar_preview(self, obj):
        if hasattr(obj, "profile") and obj.profile.avatar:
            return format_html(
                '<img src="{}" width="40" height="40" style="border-radius:50%; object-fit:cover;"/>',
                obj.profile.avatar.url
            )
        return "—"

    avatar_preview.short_description = "Avatar"
if not admin.site.is_registered(User):
    admin.site.register(User, UserAdmin)
