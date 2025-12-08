from django.contrib import admin
from django.utils.html import format_html

from tickets.models import (
    Ticket,
    TicketAssignment,
    TicketHistory,
    CategoriaPrincipal,
    Subcategoria
)

# ====================================================
# INLINE: ASIGNACIONES DE TICKETS
# ====================================================
class TicketAssignmentInline(admin.TabularInline):
    model = TicketAssignment
    extra = 0
    readonly_fields = [
        'fecha_envio',
        'fecha_limite_aceptacion',
        'estado'
    ]
    can_delete = False


# ====================================================
# INLINE: HISTORIAL DE TICKETS
# ====================================================
class TicketHistoryInline(admin.TabularInline):
    model = TicketHistory
    extra = 0
    readonly_fields = [
        'fecha',
        'usuario',
        'accion',
        'descripcion'
    ]
    can_delete = False


# ====================================================
# ADMIN: TICKETS
# ====================================================
@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'titulo_truncado',
        'solicitante',
        'agente',
        'estado',
        'get_prioridad_display',
        'categoria_principal',
        'fecha_creacion',
        'esta_vencido_display'
    ]
    list_filter = [
        'estado',
        'prioridad',
        'categoria_principal',
        'fecha_creacion'
    ]
    search_fields = [
        'titulo',
        'descripcion',
        'solicitante__username',
        'agente__username'
    ]
    readonly_fields = [
        'fecha_creacion',
        'fecha_actualizacion',
        'fecha_cierre',
        'tiempo_restante_edicion',
        'puede_editar',
        'puede_eliminar',
        'esta_vencido'
    ]
    fieldsets = [
        ('Información Básica', {
            'fields': [
                'titulo',
                'descripcion',
                'prioridad',
                'estado',
                'categoria_principal',
                'subcategoria',
                'archivo_adjunto'
            ]
        }),
        ('Asignación', {
            'fields': [
                'solicitante',
                'agente'
            ]
        }),
        ('Tiempos', {
            'fields': [
                'tiempo_estimado_resolucion',
                'fecha_creacion',
                'fecha_actualizacion',
                'fecha_cierre',
                'tiempo_restante_edicion'
            ],
            'classes': ['collapse']
        }),
        ('Calificación', {
            'fields': [
                'rating',
                'comentario_cierre'
            ],
            'classes': ['collapse']
        }),
    ]

    inlines = [TicketAssignmentInline, TicketHistoryInline]

    def titulo_truncado(self, obj):
        return obj.titulo[:50] + '...' if len(obj.titulo) > 50 else obj.titulo
    titulo_truncado.short_description = 'Título'

    @admin.display(description='Prioridad', ordering='prioridad')
    def get_prioridad_display(self, obj):
        colores = {
            'Alta': '#d32f2f',  # Rojo oscuro
            'Media': '#f57c00',  # Naranja
            'Baja': '#388e3c',   # Verde oscuro
        }
        color = colores.get(obj.prioridad, '#1976d2')
        return format_html(
            f'<span style="color:{color}; font-weight:bold;">{obj.get_prioridad_display()}</span>'
        )

    def esta_vencido_display(self, obj):
        if obj.esta_vencido:
            return format_html('<span style="color:#d32f2f; font-weight:bold;">VENCIDO</span>')
        return format_html('<span style="color:#388e3c;">Al día</span>')
    esta_vencido_display.short_description = 'Estado'

    def save_model(self, request, obj, form, change):
        if not change or 'categoria_principal' in form.changed_data:
            if obj.categoria_principal:
                obj.prioridad = obj.categoria_principal.prioridad_automatica
                if obj.subcategoria:
                    obj.tiempo_estimado_resolucion = obj.subcategoria.tiempo_resolucion_estimado
        
        super().save_model(request, obj, form, change)


# ====================================================
# ADMIN: ASIGNACIONES
# ====================================================
@admin.register(TicketAssignment)
class TicketAssignmentAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'ticket',
        'agente_origen',
        'agente_destino',
        'estado',
        'fecha_envio',
        'fecha_limite_aceptacion',
        'ha_expirado_display'
    ]
    list_filter = [
        'estado',
        'fecha_envio'
    ]
    search_fields = [
        'ticket__titulo',
        'agente_origen__username',
        'agente_destino__username'
    ]
    readonly_fields = [
        'fecha_envio',
        'created_at',
        'updated_at'
    ]

    def ha_expirado_display(self, obj):
        if obj.ha_expirado():
            return format_html('<span style="color:#d32f2f; font-weight:bold;">EXPIRADA</span>')
        return format_html('<span style="color:#388e3c;">VIGENTE</span>')
    ha_expirado_display.short_description = 'Expiración'


# ====================================================
# ADMIN: HISTORIAL DE TICKETS
# ====================================================
@admin.register(TicketHistory)
class TicketHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'ticket',
        'usuario',
        'accion',
        'fecha_formateada'
    ]
    list_filter = [
        'accion',
        'fecha'
    ]
    search_fields = [
        'ticket__titulo',
        'usuario__username',
        'accion'
    ]
    readonly_fields = ['fecha']

    def fecha_formateada(self, obj):
        return obj.fecha.strftime('%d/%m/%Y %H:%M')
    fecha_formateada.short_description = 'Fecha'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# ====================================================
# INLINE: SUBCATEGORIAS
# ====================================================
class SubcategoriaInline(admin.TabularInline):
    model = Subcategoria
    extra = 1
    fields = [
        'nombre',
        'descripcion',
        'requiere_aprobacion',
        'tiempo_resolucion_estimado'
    ]


# ====================================================
# ADMIN: CATEGORÍA PRINCIPAL
# ====================================================
@admin.register(CategoriaPrincipal)
class CategoriaPrincipalAdmin(admin.ModelAdmin):
    list_display = [
        'nombre',
        'prioridad_automatica',
        'prioridad_automatica_display',
        'tipo_agente',
        'activo',
        'orden',
        'total_tickets',
        'color_display'
    ]
    list_filter = ['activo', 'tipo_agente', 'prioridad_automatica']
    search_fields = ['nombre', 'descripcion']
    list_editable = ['tipo_agente', 'activo', 'prioridad_automatica']
    ordering = ('orden',)
    readonly_fields = ('orden',)
    inlines = [SubcategoriaInline]
    
    @admin.display(description='Prioridad Auto.')
    def prioridad_automatica_display(self, obj):
        colores = {
            'Alta': '#d32f2f',
            'Media': '#f57c00',
            'Baja': '#388e3c',
        }
        color = colores.get(obj.prioridad_automatica, '#1976d2')
        return format_html(
            f'<span style="color:{color}; font-weight:bold;">{obj.get_prioridad_automatica_display()}</span>'
        )

    def total_tickets(self, obj):
        return obj.tickets.count()
    total_tickets.short_description = 'Total Tickets'

    def color_display(self, obj):
        return format_html(
            '<div style="width:20px; height:20px; background-color:{}; border:1px solid #ccc; display:inline-block; margin-right:5px;"></div> {}',
            obj.color, obj.color
        )
    color_display.short_description = 'Color'
    
    fieldsets = [
        ('Información Básica', {
            'fields': [
                'nombre',
                'descripcion',
                'activo',
                'color'
            ]
        }),
        ('Configuración Automática', {
            'fields': [
                'prioridad_automatica',
                'tipo_agente'
            ],
            'description': 'Estos valores se asignarán automáticamente a los tickets de esta categoría'
        }),
        ('Ordenamiento', {
            'fields': ['orden'],
            'classes': ['collapse']
        }),
    ]


# ====================================================
# ADMIN: SUBCATEGORÍAS
# ====================================================
@admin.register(Subcategoria)
class SubcategoriaAdmin(admin.ModelAdmin):
    list_display = [
        'nombre',
        'categoria',
        'prioridad_herencia_display',
        'requiere_aprobacion',
        'tiempo_resolucion_estimado',
        'total_tickets'
    ]
    list_filter = [
        'categoria',
        'requiere_aprobacion'
    ]
    search_fields = [
        'nombre',
        'categoria__nombre'
    ]

    @admin.display(description='Prioridad Heredada')
    def prioridad_herencia_display(self, obj):
        colores = {
            'Alta': '#d32f2f',
            'Media': '#f57c00',
            'Baja': '#388e3c',
        }
        color = colores.get(obj.categoria.prioridad_automatica, '#1976d2')
        return format_html(
            f'<span style="color:{color}; font-weight:bold;">{obj.categoria.get_prioridad_automatica_display()}</span>'
        )

    def total_tickets(self, obj):
        return obj.tickets.count()
    total_tickets.short_description = 'Total Tickets'
    
    fieldsets = [
        ('Información Básica', {
            'fields': [
                'categoria',
                'nombre',
                'descripcion'
            ]
        }),
        ('Configuración', {
            'fields': [
                'requiere_aprobacion',
                'tiempo_resolucion_estimado'
            ],
            'description': 'El tiempo de resolución se asignará automáticamente a los tickets'
        }),
    ]