from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.html import format_html
from .models import User, Profile, Rol, Area # Importar Rol y Area

# Registrar el nuevo modelo Area
admin.site.register(Area)

# -------------------------------
# Configuración del admin de Rol
# -------------------------------
@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('nombre_visible', 'nombre_clave', 'tipo_base', 'es_sistema')
    list_filter = ('tipo_base', 'es_sistema')
    search_fields = ('nombre_visible', 'nombre_clave')
    ordering = ('nombre_visible',)
    fieldsets = (
        (None, {'fields': ('nombre_visible', 'nombre_clave', 'tipo_base', 'descripcion')}),
    )


# -------------------------------
# Formularios personalizados
# -------------------------------

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("username", "email", "rol")


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = ("username", "email", "rol", "is_active", "is_staff", "is_superuser")


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

    # 1. Añadir nuevos campos a la vista de lista
    list_display = ("username", "email", "rol", "area", "codigo_empleado", "is_active", "is_staff", "avatar_preview")
    # 2. Permitir filtrar por área y discapacidad
    list_filter = ("rol", "area", "is_active", "is_staff", "tiene_discapacidad")
    # 3. Permitir buscar por los nuevos campos
    search_fields = ("username", "email", "first_name", "last_name", "numero_documento", "codigo_empleado")
    ordering = ("username",)

    # 4. 'fieldsets' ya está correcto, lo dejamos como está. Controla la vista de EDICIÓN.
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Información Personal", {"fields": ("first_name", "last_name", "email")}),
        ("Datos de RRHH", {"fields": ("tipo_documento", "numero_documento", "codigo_empleado", "fecha_nacimiento", "area", "tiene_discapacidad", "certificado_discapacidad")}),
        ("Roles y Permisos", {"fields": ("rol", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas importantes", {"fields": ("last_login", "date_joined")}),
    )

    # 5. Añadir los nuevos campos al formulario de CREACIÓN.
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "username", "email", "first_name", "last_name", "rol", "area", 
                "codigo_empleado", "numero_documento",
                "password1", "password2", "is_staff", "is_active"
            ),
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
