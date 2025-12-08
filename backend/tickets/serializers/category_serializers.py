from rest_framework import serializers
from tickets.models import CategoriaPrincipal, Subcategoria
from users.models import Rol  # Importar el modelo Rol

class SubcategoriaSerializer(serializers.ModelSerializer):
    """Serializer para subcategorías"""
    class Meta:
        model = Subcategoria
        fields = [
            'id',
            'nombre',
            'descripcion',
            'requiere_aprobacion',
            'tiempo_resolucion_estimado'
        ]


class CategoriaPrincipalSerializer(serializers.ModelSerializer):
    """Serializer para categorías principales"""
    subcategorias = SubcategoriaSerializer(many=True, required=False)
    
    # ✅ ORDEN es de SOLO LECTURA - lo calcula automáticamente el backend
    orden = serializers.IntegerField(read_only=True)
    
    # ✅ TIPO_AGENTE es opcional - permite asignar un rol específico
    tipo_agente = serializers.PrimaryKeyRelatedField(
        queryset=Rol.objects.filter(tipo_base__in=['agente', 'admin']),
        allow_null=True,
        required=False,
        help_text="Rol que puede atender tickets de esta categoría (opcional)"
    )
    
    # ✅ Campo adicional para mostrar información del rol en frontend
    tipo_agente_info = serializers.SerializerMethodField(read_only=True)
    
    # ✅ Color con valor por defecto
    color = serializers.CharField(
        required=False, 
        default='#3498db',
        help_text="Color para identificar la categoría en la interfaz"
    )
    
    # ✅ Activo con valor por defecto
    activo = serializers.BooleanField(
        required=False, 
        default=True,
        help_text="Indica si la categoría está habilitada"
    )

    class Meta:
        model = CategoriaPrincipal
        fields = [
            'id',
            'nombre',
            'descripcion',
            'color',
            'activo',
            'orden',            # ← SOLO LECTURA
            'tipo_agente',      # ← OPCIONAL (puede ser null)
            'tipo_agente_info', # ← SOLO LECTURA (info del rol)
            'subcategorias',
        ]
        read_only_fields = ['orden', 'tipo_agente_info']

    def get_tipo_agente_info(self, obj):
        """Devuelve información del rol asociado para mostrar en frontend"""
        if obj.tipo_agente:
            return {
                'id': obj.tipo_agente.id,
                'nombre': obj.tipo_agente.nombre_visible,
                'tipo': obj.tipo_agente.tipo_base
            }
        return None

    def validate(self, data):
        """Validaciones antes de guardar"""
        # Asegurar que el nombre no esté vacío
        if 'nombre' in data and not data['nombre'].strip():
            raise serializers.ValidationError({
                'nombre': 'El nombre de la categoría no puede estar vacío.'
            })
        
        # Si viene tipo_agente pero es string vacío, convertirlo a None
        if 'tipo_agente' in data and data['tipo_agente'] in ['', 'null', None]:
            data['tipo_agente'] = None
        
        return data

    def create(self, validated_data):
        """Crear categoría con orden automático"""
        subcategorias_data = validated_data.pop('subcategorias', [])
        
        # ✅ EL ORDEN SE CALCULA AUTOMÁTICAMENTE EN EL MODELO
        # No necesitamos hacer nada aquí, el modelo lo maneja en save()
        
        # Crear la categoría principal
        categoria = CategoriaPrincipal.objects.create(**validated_data)
        
        # Crear subcategorías si se proporcionan
        for subcategoria_data in subcategorias_data:
            Subcategoria.objects.create(categoria=categoria, **subcategoria_data)
        
        return categoria

    def update(self, instance, validated_data):
        """Actualizar categoría manteniendo el orden existente"""
        subcategorias_data = validated_data.pop('subcategorias', None)
        
        # Actualizar campos de la categoría principal
        instance.nombre = validated_data.get('nombre', instance.nombre)
        instance.descripcion = validated_data.get('descripcion', instance.descripcion)
        instance.color = validated_data.get('color', instance.color)
        instance.activo = validated_data.get('activo', instance.activo)
        
        # Actualizar tipo_agente si se proporciona
        if 'tipo_agente' in validated_data:
            instance.tipo_agente = validated_data['tipo_agente']
        
        instance.save()
        
        # Manejar subcategorías si se proporcionan
        if subcategorias_data is not None:
            # Obtener nombres de subcategorías nuevas
            nombres_nuevos = [sub['nombre'] for sub in subcategorias_data if 'nombre' in sub]
            
            # Eliminar subcategorías que ya no están en la lista
            instance.subcategorias.exclude(nombre__in=nombres_nuevos).delete()
            
            # Crear o actualizar subcategorías
            for sub_data in subcategorias_data:
                if 'nombre' in sub_data:
                    Subcategoria.objects.update_or_create(
                        categoria=instance,
                        nombre=sub_data['nombre'],
                        defaults=sub_data
                    )
        
        return instance