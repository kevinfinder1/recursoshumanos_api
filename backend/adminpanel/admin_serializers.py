# admin_serializers.py - ACTUALIZAR
from rest_framework import serializers
from django.utils import timezone
from tickets.models import Ticket
from users.models import User, Rol, Area  # Importar Rol y Area
from django.db.models import Avg, Q
from .models import AgentPerformance, Category, Priority, SLA, ConfiguracionSistema, SystemLog


class AdminDashboardMetricsSerializer(serializers.Serializer):
    """Serializer para las métricas del dashboard del administrador."""
    total_tickets = serializers.IntegerField()
    tickets_hoy = serializers.IntegerField()
    tickets_abiertos = serializers.IntegerField()
    tickets_en_progreso = serializers.IntegerField()
    tickets_resueltos = serializers.IntegerField()
    tickets_atrasados = serializers.IntegerField()
    promedio_rating = serializers.FloatField()
    rating_por_categoria = serializers.DictField(child=serializers.FloatField())
    rating_por_agente = serializers.DictField(child=serializers.FloatField())
    tickets_por_prioridad = serializers.DictField(child=serializers.IntegerField())
    tickets_por_categoria = serializers.DictField(child=serializers.IntegerField())
    tiempo_promedio_resolucion = serializers.FloatField()
    efectividad_global = serializers.FloatField()
    # Este serializer no requiere cambios, ya que es para una vista de agregación.

    class Meta:
        fields = '__all__'


class AdminAgentPerformanceSerializer(serializers.ModelSerializer):
    agente = serializers.CharField(source="agente.username", read_only=True)
    agente_id = serializers.IntegerField(source="agente.id", read_only=True)
    rol = serializers.CharField(source="agente.rol.nombre_visible", read_only=True)
    rating_promedio = serializers.SerializerMethodField()

    class Meta:
        model = AgentPerformance
        fields = [
            "agente_id",
            "agente",
            "rol",
            "tickets_asignados",
            "tickets_resueltos",
            "tiempo_promedio_resolucion",
            "efectividad",
            "rating_promedio",
            "actualizado_en",
        ]

    def get_rating_promedio(self, obj):
        qs = Ticket.objects.filter(agente=obj.agente, rating__isnull=False)
        if qs.exists():
            return round(qs.aggregate(Avg("rating"))["rating__avg"], 2)
        return 0

class RolAdminSerializer(serializers.ModelSerializer):
    """Serializer para mostrar información de roles en el panel de administración."""
    class Meta:
        model = Rol
        # El campo 'permisos' no existe en el modelo Rol, lo eliminamos para evitar errores.
        fields = ['id', 'nombre_visible', 'nombre_clave', 'tipo_base', 'descripcion']


class AreaSerializer(serializers.ModelSerializer):
    """
    Serializer para gestionar las áreas/departamentos.
    """
    class Meta:
        model = Area
        fields = ['id', 'nombre', 'descripcion']


# =====================================================
# SERIALIZERS DE USUARIOS
# =====================================================


class AdminAgentCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        style={'input_type': 'password'},
        min_length=8,
        help_text="La contraseña debe tener al menos 8 caracteres"
    )
    confirm_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        style={'input_type': 'password'}
    )
    # El campo 'rol' ahora es una PrimaryKeyRelatedField para seleccionar desde el modelo Rol
    rol = serializers.PrimaryKeyRelatedField(
        queryset=Rol.objects.all(),
        allow_null=True,
        required=False
    )
    # Nuevo campo para el área
    area = serializers.PrimaryKeyRelatedField(
        queryset=Area.objects.all(),
        allow_null=True,
        required=False
    )
    # ✅ SOLUCIÓN: Usar un BooleanField que pueda interpretar "true" y "false" desde FormData.
    # DRF por defecto no maneja esto bien con ModelSerializer cuando viene de multipart.
    tiene_discapacidad = serializers.BooleanField(required=False)

    # ✅ SOLUCIÓN: Permitir que los campos que pueden ser nulos también acepten una cadena vacía.
    # Esto es crucial cuando se envían datos desde un FormData.
    numero_documento = serializers.CharField(allow_blank=True, required=False, allow_null=True)
    codigo_empleado = serializers.CharField(allow_blank=True, required=False, allow_null=True)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)
    certificado_discapacidad = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'rol', 'password', 'confirm_password', 'is_active',
            # --- AÑADIR NUEVOS CAMPOS ---
            'tipo_documento', 'numero_documento', 'codigo_empleado',
            'fecha_nacimiento', 'area', 'tiene_discapacidad', 'certificado_discapacidad'
        ]
        extra_kwargs = {
            'email': {'required': True}
        }

    def validate_username(self, value):
        """Validación mejorada de username"""
        value = value.strip().lower()  # Normalizar a minúsculas
        
        # Verificar si es una actualización
        if self.instance and self.instance.username == value:
            return value
            
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        
        # Validar formato del username
        if not value.replace('_', '').replace('.', '').isalnum():
            raise serializers.ValidationError(
                "El nombre de usuario solo puede contener letras, números, guiones bajos y puntos."
            )
        
        if len(value) < 3:
            raise serializers.ValidationError("El nombre de usuario debe tener al menos 3 caracteres.")
            
        return value

    def validate_email(self, value):
        """Validación mejorada de email"""
        if not value:
            raise serializers.ValidationError("El email es obligatorio.")
            
        value = value.strip().lower()  # Normalizar a minúsculas
        
        # Verificar si es una actualización
        if self.instance and self.instance.email.lower() == value:
            return value
            
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este email ya está registrado.")
        
        # Validar formato de email
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, value):
            raise serializers.ValidationError("Por favor ingresa un email válido.")
            
        return value

    def validate(self, data):
        """Validaciones cruzadas"""
        errors = {}
        
        # En modo creación, la contraseña es obligatoria
        if not self.instance and not data.get('password'):
            errors['password'] = "La contraseña es requerida para nuevos usuarios."

        # Validar que las contraseñas coincidan
        if data.get('password') or data.get('confirm_password'):
            if data.get('password') != data.get('confirm_password'):
                errors['confirm_password'] = "Las contraseñas no coinciden."
        
        # ✅ SOLUCIÓN: Asegurarse de que rol_obj sea una instancia de Rol para las validaciones.
        # En el método `validate`, `data.get('rol')` es el ID (string/int), no la instancia.
        rol_obj = data.get('rol')
        if rol_obj:
            # Si rol_obj es un ID, lo convertimos a una instancia de Rol
            if not isinstance(rol_obj, Rol):
                try:
                    rol_obj = Rol.objects.get(pk=rol_obj)
                except Rol.DoesNotExist:
                    # Si el rol no existe, el PrimaryKeyRelatedField ya lo validará,
                    # pero para evitar errores aquí, lo tratamos como None.
                    rol_obj = None

            if rol_obj and rol_obj.nombre_clave == 'admin' and data.get('email'):  # Ahora rol_obj es una instancia
                if not data['email'].endswith(('@emsa.com', '@admin.com')):
                    errors['email'] = "Los administradores deben usar un email corporativo válido."
        
            if rol_obj and rol_obj.tipo_base == 'agente' and (not data.get('first_name') or not data.get('last_name')):  # Ahora rol_obj es una instancia
                errors.setdefault('first_name', "Los agentes deben tener nombre y apellido completos.")
                errors.setdefault('last_name', "Los agentes deben tener nombre y apellido completos.")
        
        if errors:
            raise serializers.ValidationError(errors)
            
        return data

    def create(self, validated_data):
        # Remover confirm_password
        validated_data.pop('confirm_password', None)
        
        password = validated_data.pop('password')
        validated_data['username'] = validated_data['username'].lower()
        validated_data['email'] = validated_data['email'].lower()
        
        # Crear el usuario sin la contraseña primero
        user = User(**validated_data)
        # Establecer la contraseña hasheada
        user.set_password(password)
        
        # Configurar permisos según rol
        if user.rol and user.rol.nombre_clave == 'admin':
            user.is_staff = True
            user.is_superuser = True
        else:
            user.is_staff = False
            user.is_superuser = False
        
        user.save()
        
        # Crear registro de rendimiento para agentes
        if user.rol and user.rol.tipo_base == 'agente':
            AgentPerformance.objects.get_or_create(agente=user)
            
        return user

    def update(self, instance, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)

        if 'username' in validated_data:
            validated_data['username'] = validated_data['username'].lower()
        if 'email' in validated_data:
            validated_data['email'] = validated_data['email'].lower()

        instance = super().update(instance, validated_data)

        if password:
            instance.set_password(password)

        if 'rol' in validated_data:
            if validated_data['rol'] and validated_data['rol'].nombre_clave == 'admin':
                instance.is_staff = True
                instance.is_superuser = True
            else:
                instance.is_staff = False
                instance.is_superuser = False

        instance.save()
        return instance


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer para listar y gestionar categorías.
    Simplificado para la carga rápida en filtros y evitar errores de consulta.
    """
    class Meta:
        model = Category
        fields = ['id', 'nombre', 'descripcion', 'activo']


class SubcategoriaSerializer(serializers.ModelSerializer):
    """
    Serializer para subcategorías, usado para creación anidada.
    """
    class Meta:
        from tickets.models import Subcategoria
        model = Subcategoria
        fields = ['id', 'nombre', 'descripcion', 'requiere_aprobacion']
        read_only_fields = ['id']


class CategoriaPrincipalSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo CategoriaPrincipal de la app de tickets.
    Ahora maneja subcategorías anidadas.
    """
    subcategorias = SubcategoriaSerializer(many=True, required=False)

    # ✅ CORRECCIÓN: Asignar un valor por defecto al campo 'orden'.
    # Esto soluciona el error 400 si el frontend no envía este campo,
    # ya que el modelo probablemente lo requiere.
    orden = serializers.IntegerField(required=False, default=0)
    # Le decimos al serializer que 'tipo_agente' es una clave foránea a un Rol
    tipo_agente = serializers.PrimaryKeyRelatedField(
        queryset=Rol.objects.filter(tipo_base__in=['agente', 'admin']),
        allow_null=True, required=False
    )

    class Meta:
        from tickets.models import CategoriaPrincipal
        model = CategoriaPrincipal
        fields = [
            'id', 'nombre', 'descripcion', 'activo', 'color', 'orden', 
            'tipo_agente', 'prioridad_automatica', 'subcategorias'
        ]

    def create(self, validated_data):
        """
        Crea una CategoriaPrincipal y sus Subcategorias anidadas.
        """
        # ✅ CORRECCIÓN: Importar los modelos necesarios dentro del método.
        from tickets.models import CategoriaPrincipal, Subcategoria

        subcategorias_data = validated_data.pop('subcategorias', [])
        
        # Crear la categoría principal
        categoria = CategoriaPrincipal.objects.create(**validated_data)

        # Crear las subcategorías asociadas
        for subcategoria_data in subcategorias_data:
            Subcategoria.objects.create(categoria=categoria, **subcategoria_data)
            
        return categoria

    def update(self, instance, validated_data):
        subcategorias_data = validated_data.pop('subcategorias', [])
        
        # Actualizar los campos de CategoriaPrincipal
        instance.nombre = validated_data.get('nombre', instance.nombre)
        instance.descripcion = validated_data.get('descripcion', instance.descripcion)
        instance.activo = validated_data.get('activo', instance.activo)
        instance.color = validated_data.get('color', instance.color)
        instance.orden = validated_data.get('orden', instance.orden)
        instance.tipo_agente = validated_data.get('tipo_agente', instance.tipo_agente)
        instance.prioridad_automatica = validated_data.get('prioridad_automatica', instance.prioridad_automatica)
        instance.save()
        
        # ✅ Lógica para actualizar subcategorías
        from tickets.models import Subcategoria
        
        # Eliminar subcategorías que ya no están en la lista
        nombres_sub_nuevas = [sub['nombre'] for sub in subcategorias_data]
        instance.subcategorias.exclude(nombre__in=nombres_sub_nuevas).delete()

        # Crear o actualizar las subcategorías enviadas
        for sub_data in subcategorias_data:
            Subcategoria.objects.update_or_create(
                categoria=instance,
                nombre=sub_data['nombre'],
                defaults=sub_data
            )

        return instance


class AdminUserListSerializer(serializers.ModelSerializer):
    fecha_registro = serializers.DateTimeField(source='date_joined', read_only=True)
    ultimo_login = serializers.DateTimeField(read_only=True, source='last_login')
    # ✅ CORRECCIÓN: Usar el serializer de Rol para anidar la información completa del rol.
    rol = RolAdminSerializer(read_only=True)
    rol_tipo_base = serializers.CharField(source='rol.tipo_base', read_only=True) # ✅ SOLUCIÓN: Añadir este campo
    area_nombre = serializers.CharField(source='area.nombre', read_only=True, allow_null=True)  # Nuevo campo
    dias_desde_registro = serializers.SerializerMethodField()
    dias_desde_ultimo_login = serializers.SerializerMethodField()
    esta_activo = serializers.BooleanField(source='is_active', read_only=True)
    nombre_completo = serializers.SerializerMethodField()
    total_tickets_asignados = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'nombre_completo', 'rol', 'rol_tipo_base',
            'area', 'area_nombre', 'is_active', 'esta_activo',
            'fecha_registro', 'ultimo_login',
            'total_tickets_asignados', 'dias_desde_registro', 'dias_desde_ultimo_login'
        ]
    
    def get_total_tickets_asignados(self, obj):
        from tickets.models import Ticket
        return Ticket.objects.filter(agente=obj).count()
    
    def get_dias_desde_registro(self, obj):
        from django.utils import timezone
        if obj.date_joined:
            return (timezone.now().date() - obj.date_joined.date()).days
        return None
    
    def get_dias_desde_ultimo_login(self, obj):
        from django.utils import timezone
        if obj.last_login:
            return (timezone.now().date() - obj.last_login.date()).days
        return None
    
    def get_nombre_completo(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return obj.username


class RoleChoiceSerializer(serializers.Serializer):
    """Serializer para opciones de rol"""
    value = serializers.CharField()
    label = serializers.CharField()


class UserCreationResponseSerializer(serializers.Serializer):
    """Serializer para respuestas de creación/actualización"""
    message = serializers.CharField()
    user = AdminUserListSerializer()


class PaginatedUserResponseSerializer(serializers.Serializer):
    """Serializer para respuestas paginadas optimizadas para React"""
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = AdminUserListSerializer(many=True)
    filtros = serializers.DictField(required=False)


# --- AÑADIDO ---
class AdminUserMiniSerializer(serializers.ModelSerializer):
    """Serializer mínimo para mostrar info de usuario dentro de otros modelos."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class AdminTicketSerializer(serializers.ModelSerializer):
    """
    Serializer para listar y ver detalles de tickets en el panel de admin.
    """
    # Usamos SerializerMethodField para manejar casos nulos de forma segura
    solicitante_info = AdminUserMiniSerializer(source='solicitante', read_only=True)
    agente_info = AdminUserMiniSerializer(source='agente', read_only=True)
    categoria_principal = serializers.CharField(source="categoria_principal.nombre", read_only=True, allow_null=True)
    prioridad_color = serializers.CharField(source="prioridad.color", read_only=True)
    dias_abierto = serializers.IntegerField(read_only=True)  # Asumiendo que se anota en el queryset

    class Meta:
        model = Ticket
        fields = [
            'id', 'titulo', 'estado', 'prioridad', 'prioridad_color',
            'solicitante_info', 'agente_info', 'categoria_principal', 'rating',
            'fecha_creacion', 'fecha_actualizacion', 'fecha_cierre', 'dias_abierto'
        ]


class AdminTicketUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer específico para actualizar un ticket desde el panel de admin.
    """
    agente = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            Q(rol__tipo_base='admin') | Q(rol__tipo_base='agente')
        ),
        source='agente', required=False, allow_null=True
    )
    prioridad = serializers.PrimaryKeyRelatedField(
        queryset=Priority.objects.all(), required=False
    )

    class Meta:
        model = Ticket
        fields = ['agente', 'estado', 'prioridad']

    def update(self, instance, validated_data):
        """
        Lógica personalizada al actualizar un ticket.
        """
        # Si se está asignando o reasignando un agente y el ticket está 'Pendiente',
        # se cambia automáticamente a 'En Proceso'.
        if 'agente' in validated_data:
            # Solo cambiamos el estado si no se está especificando uno diferente en la misma petición.
            if 'estado' not in validated_data and instance.estado == 'Pendiente':
                validated_data['estado'] = 'En Proceso'

        # Llamar al método update original para guardar los cambios.
        instance = super().update(instance, validated_data)
        return instance


# --- NUEVOS SERIALIZERS PARA LOS MODELOS OPTIMIZADOS ---
class PrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = Priority
        fields = '__all__'


class SLASerializer(serializers.ModelSerializer):
    class Meta:
        model = SLA
        fields = '__all__'


class SystemLogSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(source='usuario.username', read_only=True, allow_null=True)
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)

    class Meta:
        model = SystemLog
        fields = [
            'id', 'usuario', 'accion', 'accion_display',
            'descripcion', 'fecha', 'ip'
        ]


class ConfiguracionSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionSistema
        fields = [
            'nombre_empresa', 'logo', 'limite_adjuntos_mb',
            'mensaje_auto_respuesta', 'color_primario', 'horario_laboral',
            'actualizado_en'
        ]