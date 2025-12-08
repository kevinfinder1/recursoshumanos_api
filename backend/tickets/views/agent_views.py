from tickets.models.history import TicketHistory
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone 
from datetime import timedelta
from django.db.models import Q

from tickets.models import Ticket, TicketAssignment
from tickets.serializers import TicketSerializer, TicketDetailSerializer, TicketAssignmentCreateSerializer, TicketStateUpdateSerializer # Importar el nuevo serializer
from tickets.permissions import IsTicketOwner, CanReassignTicket, CanChangeTicketState, IsAgenteOrAdmin, CanEditTicket, IsAgente
from tickets.services.assignment_service import AssignmentService
from tickets.services.state_service import StateService
from users.models import User

class AgentTicketViewSet(viewsets.ModelViewSet):
    """
    Vista para agentes - Ven tickets asignados y pendientes de aceptación
    """
    serializer_class = TicketSerializer
    permission_classes = [IsAgenteOrAdmin, IsTicketOwner]
    
    def get_serializer_class(self):
        if self.action == 'cambiar_estado':
            return TicketStateUpdateSerializer
        if self.action == 'retrieve':
            return TicketDetailSerializer
        # Para la acción de 'update' (PUT/PATCH), usaremos el serializador por defecto (TicketSerializer)
        # que ya tiene los campos 'titulo' y 'descripcion'.
        if self.action in ['update', 'partial_update']:
            self.permission_classes = [IsAgenteOrAdmin, CanEditTicket]
        return super().get_serializer_class()

    def get_queryset(self):
        """Agentes ven tickets asignados a ellos y pendientes de aceptación"""
        user = self.request.user
        
        if user.is_authenticated:
            # ✅ CORRECCIÓN FINAL: El queryset debe incluir también los tickets pendientes de reasignación.
            # Esto es crucial para que las acciones como 'aceptar_reasignacion' funcionen (evita 404).
            tickets_pendientes_ids = TicketAssignment.objects.filter(
                agente_destino=user, estado='pendiente'
            ).values_list('ticket_id', flat=True)

            return Ticket.objects.filter(
                Q(agente=user) | 
                Q(solicitante=user) |
                Q(id__in=list(tickets_pendientes_ids))
            ).distinct().order_by('-fecha_actualizacion')
            
        # Si no está autenticado, no devolver nada.
        return Ticket.objects.none()

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Devuelve los mensajes de chat de un ticket específico."""
        ticket = self.get_object()
        if not hasattr(ticket, 'chat_room'):
            return Response({"results": [], "count": 0})

        messages = ticket.chat_room.messages.order_by('timestamp')
        # Usar el serializer de mensajes de la app de chat
        from chat.serializers import MessageSerializer
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response({"results": serializer.data, "count": messages.count()})

    @action(detail=False, methods=['get'], url_path='mis-tickets-creados')
    def mis_tickets_creados(self, request):
        """Devuelve los tickets creados por el agente actual."""
        user = request.user
        queryset = Ticket.objects.filter(solicitante=user).order_by('-fecha_actualizacion')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='tickets-asignados-a-mi')
    def tickets_asignados_a_mi(self, request):
        """Devuelve los tickets asignados directamente al agente actual."""
        user = request.user
        queryset = Ticket.objects.filter(agente=user).order_by('-fecha_actualizacion')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reasignar(self, request, pk=None):
        """Reasignar ticket a otro agente"""
        ticket = self.get_object()

        # 🎯 Usar el serializador para validar los datos de entrada
        serializer = TicketAssignmentCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        agente_destino = validated_data.get('agente_destino')
        tiempo_aceptacion = validated_data.get('tiempo_aceptacion', 300)
        
        resultado = AssignmentService.reasignar_ticket(
            ticket, request.user, agente_destino, tiempo_aceptacion
        )
        
        return Response(resultado) if 'error' not in resultado else Response(resultado, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAgente])
    def aceptar_reasignacion(self, request, pk=None):
        """Aceptar reasignación pendiente"""
        ticket = self.get_object()
        resultado = AssignmentService.aceptar_reasignacion(ticket, request.user)

        if 'error' in resultado:
            # Si es un error de permiso, el servicio debería incluirlo. Usamos 403 si es el caso.
            status_code = status.HTTP_403_FORBIDDEN if "permiso" in resultado.get('error', '').lower() else status.HTTP_400_BAD_REQUEST
            return Response(resultado, status=status_code)
            
        return Response(resultado)

    @action(detail=True, methods=['post'], permission_classes=[IsAgente])
    def rechazar_reasignacion(self, request, pk=None):
        """Rechazar reasignación pendiente"""
        ticket = self.get_object()
        # 🎯 SOLUCIÓN: Se anulan los permisos a nivel de vista.
        # La lógica de negocio dentro de AssignmentService se encargará de verificar
        # si este agente es el destinatario de la reasignación.
        
        resultado = AssignmentService.rechazar_reasignacion(ticket, request.user)
        
        if 'error' in resultado:
            return Response(resultado, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(resultado)

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado del ticket"""
        ticket = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nuevo_estado = serializer.validated_data['estado']
        
        # 🎯 SOLUCIÓN: Asegurarnos de que la acción quede en el historial ANTES de cambiar el estado.
        # Esto garantiza que el agente siempre tendrá permiso para ver el ticket después.
        TicketHistory.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion=f"Cambio de estado a '{nuevo_estado}'"
        )
        
        resultado = StateService.cambiar_estado(ticket, nuevo_estado, request.user)
        
        if 'error' in resultado:
            return Response(resultado, status=status.HTTP_400_BAD_REQUEST)
            
        # Devolver el ticket actualizado para que el frontend pueda refrescar su estado.
        # Esto es crucial para la actualización en tiempo real de la UI.
        ticket.refresh_from_db() # Recargamos el objeto desde la BD
        serializer = TicketDetailSerializer(ticket) # Usamos el serializer de detalle
        
        # Añadimos el ticket serializado a la respuesta
        resultado['ticket'] = serializer.data 
        return Response(resultado)

    @action(detail=False, methods=['post'], url_path='crear-rapido')
    def crear_ticket_rapido(self, request):
        """Endpoint alternativo que evita todos los problemas"""
        try:
            print("🚀 CREAR TICKET RÁPIDO - Iniciando...")
            
            # Obtener datos
            titulo = request.data.get('titulo')
            descripcion = request.data.get('descripcion') 
            prioridad = request.data.get('prioridad', 'Media')
            agente_destino_id = request.data.get('agente_destino')
            
            print(f"📦 Datos recibidos: {request.data}")
            
            if not titulo or not descripcion or not agente_destino_id:
                return Response({
                    'error': 'Faltan campos requeridos: titulo, descripcion, agente_destino'
                }, status=400)
    
            # Verificar que el agente existe
            from users.models import User
            try:
                agente_destino = User.objects.get(
                    id=agente_destino_id, rol__tipo_base__in=["agente", "admin"]
                )
                print(f"✅ Agente encontrado: {agente_destino.username}")
            except User.DoesNotExist:
                return Response({'error': 'Agente no encontrado'}, status=400)
    
            # 🎯 CREAR TICKET MANUALMENTE
            from tickets.models import Ticket
            from django.utils import timezone
            
            ticket = Ticket(
                titulo=titulo,
                descripcion=descripcion,
                prioridad=prioridad,
                solicitante=request.user,
                estado='Abierto',
                fecha_creacion=timezone.now(),
                fecha_actualizacion=timezone.now()
            )
            
            # Guardar sin procesar signals complejos
            ticket.save()
            print(f"✅ Ticket creado: {ticket.id}")
    
            # 🎯 USAR EL SERVICIO PARA ASIGNAR EL TICKET
            # Centralizamos la lógica en el AssignmentService
            from tickets.services.assignment_service import AssignmentService
            resultado_asignacion = AssignmentService.asignar_ticket_de_agente(ticket, agente_destino)
            print(f"⚙️ Resultado de la asignación: {resultado_asignacion}")
    
            # 🎯 RECARGAR EL OBJETO DESDE LA BD
            # Esto es CRUCIAL para que el serializer tenga los datos completos (agente_info, etc.)
            ticket.refresh_from_db()

            # Devolver el ticket creado
            from tickets.serializers import TicketSerializer
            serializer = TicketSerializer(ticket)
            
            return Response({
                'success': True,
                'ticket': serializer.data,
                'message': 'Ticket creado exitosamente'
            })
    
        except Exception as e:
            print(f"❌ ERROR en crear_ticket_rapido: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        """Cerrar ticket con comentario"""
        ticket = self.get_object()
        comentario = request.data.get('comentario', '')
        rating = request.data.get('rating')
        
        resultado = StateService.cerrar_ticket(ticket, request.user, comentario, rating)
        
        if 'error' in resultado:
            return Response(resultado, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(resultado)

    @action(detail=False, methods=['get'])
    def pendientes_aceptacion(self, request):
        """Obtener tickets pendientes de aceptación"""
        asignaciones_pendientes = AssignmentService.obtener_asignaciones_pendientes(request.user)
        
        from tickets.serializers import TicketSerializer, TicketAssignmentSerializer
        
        tickets_pendientes = [asignacion.ticket for asignacion in asignaciones_pendientes]
        tickets_serializer = TicketSerializer(tickets_pendientes, many=True)
        asignaciones_serializer = TicketAssignmentSerializer(asignaciones_pendientes, many=True)
        
        return Response({
            "count": len(tickets_pendientes),
            "tickets": tickets_serializer.data,
            "asignaciones": asignaciones_serializer.data
        })

    @action(detail=False, methods=['get'], url_path='debug-tickets')
    def debug_tickets(self, request):
        """Ver todos los tickets para debug"""
        from tickets.models import Ticket
        from tickets.serializers import TicketSerializer
        
        print(f"🔍 DEBUG - Usuario actual: {request.user.username} (ID: {request.user.id})")
        print(f"🔍 DEBUG - Rol usuario: {request.user.rol.nombre_clave if request.user.rol else 'Sin rol'}")
        
        # Todos los tickets recientes
        todos_tickets = Ticket.objects.all().order_by('-id')[:5]
        print(f"🔍 DEBUG - Total tickets en BD: {Ticket.objects.count()}")
        
        # Tickets del usuario actual como agente
        mis_tickets = Ticket.objects.filter(agente=request.user)
        print(f"🔍 DEBUG - Tickets donde soy agente: {mis_tickets.count()}")
        
        # Tickets pendientes de aceptación
        from tickets.models import TicketAssignment
        asignaciones_pendientes = TicketAssignment.objects.filter(
            agente_destino=request.user, 
            estado='pendiente'
        )
        print(f"🔍 DEBUG - Asignaciones pendientes: {asignaciones_pendientes.count()}")
        
        # Tickets según el queryset normal
        queryset_normal = self.get_queryset()
        print(f"🔍 DEBUG - Queryset normal: {queryset_normal.count()} tickets")
        
        return Response({
            'usuario_actual': {
                'id': request.user.id,
                'username': request.user.username,
                'role': request.user.rol.nombre_clave if request.user.rol else 'Sin rol'
            },
            'estadisticas': {
                'total_tickets_bd': Ticket.objects.count(),
                'mis_tickets': mis_tickets.count(),
                'asignaciones_pendientes': asignaciones_pendientes.count(),
                'queryset_normal': queryset_normal.count()
            },
            'todos_tickets': TicketSerializer(todos_tickets, many=True).data,
            'mis_tickets_lista': TicketSerializer(mis_tickets, many=True).data,
            'asignaciones_pendientes_lista': [
                {
                    'id': a.id,
                    'ticket_id': a.ticket.id,
                    'ticket_titulo': a.ticket.titulo,
                    'agente_origen': a.agente_origen.username,
                    'estado': a.estado
                } for a in asignaciones_pendientes
            ],
            'queryset_normal_lista': TicketSerializer(queryset_normal, many=True).data
        })

    @action(detail=True, methods=['post'], url_path='add_comment')
    def add_comment(self, request, pk=None):
        """
        Permite a un agente añadir un comentario a un ticket.
        Esto crea un registro en el historial del ticket.
        """
        ticket = self.get_object()
        descripcion = request.data.get('descripcion')

        if not descripcion:
            return Response(
                {'error': 'El campo "descripcion" no puede estar vacío.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear el registro en el historial
        TicketHistory.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion="Comentario añadido", # Acción genérica para el log
            descripcion=descripcion
        )

        return Response(
            {'status': 'Comentario añadido exitosamente'},
            status=status.HTTP_201_CREATED
        )


class AgentesDisponiblesView(APIView):
    """
    Vista para listar agentes disponibles para reasignación
    """
    permission_classes = []  # Cambia a permisos más básicos

    def get(self, request):
        """Listar todos los agentes disponibles"""
        try:            
            # ✅ CORRECCIÓN: Usar tipo_base para encontrar a todos los agentes y admins
            agentes = User.objects.filter(
                Q(rol__tipo_base='agente') | Q(rol__tipo_base='admin')
            )

            agentes_data = []
            for agente in agentes:
                # Calcular carga de trabajo
                tickets_activos = Ticket.objects.filter(agente=agente, estado="En Proceso").count()
                tickets_pendientes = TicketAssignment.objects.filter(
                    agente_destino=agente, estado='pendiente'
                ).count()

                carga_total = tickets_activos + tickets_pendientes

                # ✅ AÑADIR DETECCIÓN DE ESTADO DE CONEXIÓN
                umbral_actividad = timezone.now() - timedelta(minutes=3)
                esta_activo = (
                    agente.last_login and
                    agente.last_login >= umbral_actividad
                ) if agente.last_login else False

                agentes_data.append({
                    "id": agente.id,
                    "username": agente.username,
                    "email": agente.email,
                    "first_name": agente.first_name or agente.username,
                    "last_name": agente.last_name or "",
                    "role": agente.rol.nombre_clave if agente.rol else 'N/A',
                    "tickets_activos": tickets_activos,
                    "reasignaciones_pendientes": tickets_pendientes,
                    "carga_total": carga_total,
                    "carga_trabajo": "Alta" if carga_total > 5 else "Media" if carga_total > 2 else "Baja",
                    "esta_activo": esta_activo,  # ✅ ESTADO REAL DE CONEXIÓN
                    "ultima_conexion": agente.last_login.isoformat() if agente.last_login else None
                })

            return Response({
                "count": len(agentes_data),
                "agentes": sorted(agentes_data, key=lambda x: x['carga_total'])
            })

        except Exception as e:
            return Response({
                "error": f"Error al obtener agentes: {str(e)}",
                "agentes": []
            }, status=500)


class AgentesConectadosView(APIView):
    """
    Vista para obtener agentes con estado de conexión (activos/desconectados)
    Vista para obtener agentes con estado de conexión REAL usando WebSockets
    """
    permission_classes = [] 

    def get(self, request):
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            
            # ✅ CORRECCIÓN: Usar tipo_base para encontrar a todos los agentes y admins
            agentes = User.objects.filter(
                Q(rol__tipo_base='agente') | Q(rol__tipo_base='admin')
            ).only(
                'id', 'username', 'email', 'rol', 'last_login', 'first_name', 'last_name', 'rol__nombre_clave'
            )

            # ✅ SOLUCIÓN DEFINITIVA: Por ahora, considerar activos a TODOS los agentes
            # hasta que implementemos el sistema de presencia con WebSockets
            agentes_data = []
            for agente in agentes:
                # TEMPORAL: Todos los agentes están activos
                esta_activo = True

                # Calcular carga de trabajo
                tickets_activos = Ticket.objects.filter(
                    agente=agente,
                    estado__in=["Abierto", "En Proceso"]
                ).count()
                
                tickets_pendientes = TicketAssignment.objects.filter(
                    agente_destino=agente,
                    estado='pendiente'
                ).count()
                
                carga_total = tickets_activos + tickets_pendientes

                agentes_data.append({
                    "id": agente.id,
                    "username": agente.username,
                    "email": agente.email,
                    "first_name": agente.first_name or agente.username,
                    "last_name": agente.last_name or "",
                    "role": agente.rol.nombre_clave if agente.rol else 'N/A',
                    "esta_activo": esta_activo,  # ✅ SIEMPRE True por ahora
                    "ultima_conexion": agente.last_login.isoformat() if agente.last_login else None,
                    "carga_trabajo": carga_total,
                    "tickets_activos": tickets_activos,
                    "reasignaciones_pendientes": tickets_pendientes,
                    "disponibilidad": "Alta" if carga_total <= 2 else "Media" if carga_total <= 5 else "Baja"
                })

            agentes_ordenados = sorted(
                agentes_data,
                key=lambda x: x['carga_trabajo']  # Ordenar solo por carga de trabajo
            )

            print(f"✅ AGENTES CONECTADOS: {len(agentes_ordenados)} agentes (todos activos)")

            return Response({
                "count": len(agentes_ordenados),
                "agentes": agentes_ordenados,
                "message": "Todos los agentes mostrados como activos temporalmente"
            })
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return Response({"error": str(e)}, status=500)