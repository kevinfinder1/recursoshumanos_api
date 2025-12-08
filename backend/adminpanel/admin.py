from django.contrib import admin
from .models import (
    Category,
    Priority,
    SLA,
    AgentPerformance,
    SystemLog,
    ConfiguracionSistema
)

# =====================================================
# CATEGORY
# =====================================================
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre',)
    ordering = ('nombre',)


# =====================================================
# PRIORITY
# =====================================================
@admin.register(Priority)
class PriorityAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'nivel', 'color')
    list_filter = ('nivel',)
    search_fields = ('nombre',)
    ordering = ('nivel',)


# =====================================================
# SLA
# =====================================================
@admin.register(SLA)
class SLAAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tiempo_respuesta_horas', 'tiempo_resolucion_horas', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre',)
    ordering = ('nombre',)


# =====================================================
# AGENT PERFORMANCE
# =====================================================
@admin.register(AgentPerformance)
class AgentPerformanceAdmin(admin.ModelAdmin):
    list_display = (
        'agente',
        'tickets_asignados',
        'tickets_resueltos',
        'tiempo_promedio_resolucion',
        'efectividad',
        'actualizado_en'
    )
    search_fields = ('agente__username',)
    list_filter = ('actualizado_en',)
    ordering = ('-actualizado_en',)
    readonly_fields = (
        'tickets_asignados',
        'tickets_resueltos',
        'tiempo_promedio_resolucion',
        'efectividad',
        'actualizado_en'
    )


# =====================================================
# SYSTEM LOG
# =====================================================
@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'accion', 'fecha', 'ip')
    list_filter = ('accion', 'fecha')
    search_fields = ('usuario__username', 'descripcion')
    ordering = ('-fecha',)
    readonly_fields = ('usuario', 'accion', 'descripcion', 'fecha', 'ip')

    fieldsets = (
        ('Información del Log', {
            'fields': ('usuario', 'accion', 'descripcion')
        }),
        ('Detalles Técnicos', {
            'fields': ('fecha', 'ip')
        }),
    )


# =====================================================
# CONFIGURACIÓN DEL SISTEMA
# =====================================================
@admin.register(ConfiguracionSistema)
class ConfiguracionSistemaAdmin(admin.ModelAdmin):
    list_display = ('nombre_empresa', 'limite_adjuntos_mb', 'actualizado_en')
    search_fields = ('nombre_empresa',)
    readonly_fields = ('actualizado_en',)
    ordering = ('nombre_empresa',)

    fieldsets = (
        ('Información General', {
            'fields': ('nombre_empresa', 'logo')
        }),
        ('Parámetros del Sistema', {
            'fields': (
                'limite_adjuntos_mb',
                'mensaje_auto_respuesta',
                'color_primario',
                'horario_laboral',
            )
        }),
        ('Control', {
            'fields': ('actualizado_en',)
        })
    )
