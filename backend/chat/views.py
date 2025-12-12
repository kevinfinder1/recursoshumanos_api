# chat/views.py
from django.shortcuts import get_object_or_404
from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.views.static import serve
import os
from django.contrib.auth import get_user_model
from django.db.models import Count, Q


from .models import ChatRoom, Message, GroupChat
from .serializers import ChatRoomSerializer, MessageSerializer
from .notification_utils import create_notifications_for_message
from .permissions import IsAgentOrAdmin
from tickets.models import Ticket

User = get_user_model()


# ============================================================
#  SERIALIZER Y VISTA PARA LISTAR AGENTES
# ============================================================
class AgentSerializer(serializers.ModelSerializer):
    """Serializador simple para mostrar información de agentes."""
    role = serializers.CharField(source='rol.nombre_clave', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role']

class AgentListView(generics.ListAPIView):
    """
    Devuelve una lista de todos los usuarios que son agentes o administradores.
    Accesible solo por otros agentes/administradores para iniciar chats.
    """
    serializer_class = AgentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAgentOrAdmin]

    def get_queryset(self):
        # Filtra usuarios cuyo rol base sea 'agente' o 'admin'
        # y excluye al usuario que hace la petición.
        return User.objects.filter(
            Q(rol__tipo_base='agente') | Q(rol__tipo_base='admin')
        ).exclude(id=self.request.user.id).select_related('rol').order_by('username')


#  INICIAR/OBTENER CHAT DIRECTO ENTRE AGENTES

class StartDirectChatView(APIView):
    """
    Busca o crea una sala de chat directa entre el usuario actual y otro agente.
    """
    permission_classes = [permissions.IsAuthenticated, IsAgentOrAdmin]

    def post(self, request):
        target_user_id = request.data.get('target_user_id')
        if not target_user_id:
            return Response({"error": "Se requiere target_user_id."}, status=400)

        user1 = request.user
        User = get_user_model()
        user2 = get_object_or_404(User, id=target_user_id)

        # Validación: Asegurarse que el target también es agente/admin
        if not user2.rol or user2.rol.tipo_base not in ['agente', 'admin']:
            return Response({"error": "Solo se pueden iniciar chats directos con otros agentes o administradores."}, status=403)


        # Buscar una sala de chat directa que tenga exactamente a estos dos participantes
        room = ChatRoom.objects.annotate(
            p_count=Count('participants')
        ).filter(
            type='DIRECTO',
            p_count=2,
            participants=user1
        ).filter(
            participants=user2
        ).first()

        if not room:
            # Si no existe, crear una nueva sala de chat directa
            room = ChatRoom.objects.create(type='DIRECTO')
            room.participants.add(user1, user2)
            print(f"✅ Nueva sala de chat directa creada entre {user1.username} y {user2.username}")

        serializer = ChatRoomSerializer(room, context={'request': request})
        return Response(serializer.data, status=200)


# ============================================================
#  LISTAR CHATS DONDE EL USUARIO PARTICIPA
# ============================================================
class ChatRoomListView(generics.ListAPIView):
    """Lista los chats en los que participa el usuario."""
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatRoom.objects.filter(
            participants=self.request.user
        ).order_by("-created_at")


# ============================================================
#  DETALLE DE UN CHAT ESPECÍFICO DEL USUARIO
# ============================================================
class ChatRoomDetailView(generics.RetrieveAPIView):
    """Detalle completo del chat (info + mensajes + participantes)."""
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatRoom.objects.filter(participants=self.request.user)


# ============================================================
#  LISTAR MENSAJES DE UNA SALA DE CHAT
# ============================================================
class ChatRoomMessagesView(generics.ListAPIView):
    """Lista los mensajes del chat de un ticket específico."""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs.get("pk")
        room = get_object_or_404(ChatRoom, id=room_id)

        if not room.participants.filter(id=self.request.user.id).exists():
            return Message.objects.none()

        return room.messages.order_by("timestamp")


# ============================================================
#  ENVIAR MENSAJES (TEXTO / ARCHIVO / IMAGEN)
# ============================================================
class SendMessageView(APIView):
    """Enviar mensaje (texto o archivo). Solo chats activos y participantes."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        # La 'pk' ahora es el ID de la sala de chat, no del ticket.
        room = get_object_or_404(ChatRoom, id=pk)

        # 1. Validar participación
        if not room.participants.filter(id=request.user.id).exists():
            return Response({"error": "No tienes acceso a este chat."}, status=403)

        # 2. Validar estado activo
        if not room.is_active:
            return Response({"error": "Este chat está cerrado."}, status=400)

        # 2.5. NUEVA VALIDACIÓN: Si es un chat de ticket, verificar que esté 'En Proceso'
        if room.type == 'TICKET':
            if not room.ticket:
                return Response({"error": "Este chat no está asociado a un ticket válido."}, status=400)
            
            if room.ticket.estado != 'En Proceso':
                return Response({"error": f"El chat solo está activo cuando el ticket está 'En Proceso'. Estado actual: {room.ticket.estado}."}, status=403)

        # 3. Obtener datos
        content = request.data.get("content", "").strip()
        file = request.FILES.get("file")
        message_type = request.data.get("message_type")

        # 4. Validar entrada
        if not content and not file:
            return Response({"error": "El mensaje no puede estar vacío."}, status=400)

        # 5. Determinar tipo automáticamente si hay archivo
        if file:
            ext = file.name.lower()

            if ext.endswith((".jpg", ".jpeg", ".png", ".webp")):
                message_type = "image"
            else:
                message_type = "file"
        else:
            message_type = "text"

        # 6. Crear mensaje
        message = Message.objects.create(
            room=room,
            sender=request.user,
            content=content,
            file=file,
            message_type=message_type,
        )

        # Crear notificaciones para los destinatarios
        create_notifications_for_message(message)

        serializer = MessageSerializer(message, context={"request": request})
        return Response(serializer.data, status=201)


# ============================================================
#  EDITAR / BORRAR UN MENSAJE
# ============================================================
class MessageDetailView(APIView):
    """
    Permite al autor de un mensaje editarlo (PATCH) o borrarlo (DELETE).
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        """Editar el contenido de un mensaje."""
        message = get_object_or_404(Message, id=pk)

        # Validar que el usuario es el autor
        if message.sender != request.user:
            return Response({"error": "No tienes permiso para editar este mensaje."}, status=403)

        # Validar tiempo límite de 5 minutos
        if timezone.now() - message.timestamp > timedelta(minutes=5):
            return Response({"error": "El tiempo para editar este mensaje ha expirado (5 minutos)."}, status=403)

        new_content = request.data.get("content", "").strip()
        if not new_content:
            return Response({"error": "El contenido no puede estar vacío."}, status=400)

        message.content = new_content
        message.is_edited = True
        message.save(update_fields=['content', 'is_edited'])

        serializer = MessageSerializer(message, context={"request": request})
        return Response(serializer.data, status=200)

    def delete(self, request, pk):
        """Marcar un mensaje como eliminado (soft delete)."""
        message = get_object_or_404(Message, id=pk)

        # Validar que el usuario es el autor
        if message.sender != request.user:
            return Response({"error": "No tienes permiso para eliminar este mensaje."}, status=403)

        # Validar tiempo límite de 5 minutos
        if timezone.now() - message.timestamp > timedelta(minutes=5):
            return Response({"error": "El tiempo para eliminar este mensaje ha expirado (5 minutos)."}, status=403)

        message.is_deleted = True
        # Opcional: limpiar contenido para no guardar datos innecesarios
        message.content = ""
        message.file = None
        message.save(update_fields=['is_deleted', 'content', 'file'])

        return Response(status=204) # 204 No Content es estándar para un borrado exitoso

# =============================================================================
#                           CHAT GRUPAL RRHH
# =============================================================================

#  LISTAR MENSAJES DEL CHAT GRUPAL

class GroupChatMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAgentOrAdmin]

    def get(self, request, group_name):
        try:
            group_chat, _ = GroupChat.objects.get_or_create(name=group_name)

            messages = Message.objects.filter(
                group=group_chat
            ).order_by("timestamp")[:50]

            serializer = MessageSerializer(messages, many=True, context={"request": request})

            return Response({
                "group": group_chat.name,
                "messages": serializer.data,
                "total_messages": len(messages) # Optimización: Usar len() en lugar de .count()
            })

        except Exception as e:
            return Response({"error": f"Error al obtener mensajes: {str(e)}"}, status=500)


#  ENVIAR MENSAJE AL CHAT GRUPAL (SOLO RRHH / AGENTES)


class GroupChatSendMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAgentOrAdmin]

    def post(self, request, group_name):
        try:
            group_chat, _ = GroupChat.objects.get_or_create(name=group_name)

            message_content = request.data.get("message") or request.data.get("content")
            file = request.FILES.get("file")

            if not message_content and not file:
                return Response({"error": "El mensaje no puede estar vacío"}, status=400)

            # determinar tipo
            if file:
                ext = file.name.lower()

                if ext.endswith((".jpg", ".jpeg", ".png", ".webp")):
                    message_type = "image"
                else:
                    message_type = "file"
            else:
                message_type = "text"

            message = Message.objects.create(
                group=group_chat,
                sender=request.user,
                content=message_content or "",
                file=file,
                message_type=message_type
            )

            # Crear notificaciones para los destinatarios
            create_notifications_for_message(message)

            serializer = MessageSerializer(message, context={"request": request})

            return Response({
                "message": "Mensaje enviado exitosamente",
                "data": serializer.data
            }, status=201)

        except Exception as e:
            return Response({"error": f"Error al enviar mensaje: {str(e)}"}, status=500)


#  INFO BÁSICA DEL CHAT GRUPAL

class GroupChatInfoView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAgentOrAdmin]

    def get(self, request, group_name):
        try:
            group_chat, created = GroupChat.objects.get_or_create(name=group_name)
            message_count = Message.objects.filter(group=group_chat).count()

            return Response({
                "group_name": group_chat.name,
                "created_at": group_chat.created_at,
                "total_messages": message_count,
                "is_new": created
            })

        except Exception as e:
            return Response({"error": f"Error al obtener información: {str(e)}"}, status=500)


#  DESCARGA DE ARCHIVOS (PROTEGIDA)

class FileDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, file_path):
        # Construir la ruta relativa del archivo como se guarda en la BD
        db_file_path = os.path.join('chat_files', file_path)

        # Buscar el mensaje que contiene este archivo
        message = get_object_or_404(Message, file=db_file_path)

        # Validar permisos
        user_can_access = False
        if message.room:
            # Si el mensaje está en un ChatRoom, verificar si el usuario es participante
            if message.room.participants.filter(id=request.user.id).exists():
                user_can_access = True
        elif message.group:
            # Si el mensaje está en un GroupChat, verificar si el usuario es agente/admin
            if request.user.rol and request.user.rol.tipo_base in ['agente', 'admin']:
                user_can_access = True

        if not user_can_access:
            return Response({"error": "No tienes permiso para acceder a este archivo."}, status=403)

        # Servir el archivo de forma segura si el usuario tiene permiso
        if not os.path.exists(os.path.join(settings.MEDIA_ROOT, db_file_path)):
            return Response({"error": "Archivo no encontrado"}, status=404)
        return serve(request, file_path, document_root=os.path.join(settings.MEDIA_ROOT, 'chat_files'))


#  VISTA DE REPARACIÓN

class RepairTicketChatsView(APIView):
    """Endpoint para crear chat rooms para tickets existentes que no los tienen"""
    permission_classes = [permissions.IsAuthenticated, IsAgentOrAdmin]

    def post(self, request):
        from tickets.models import Ticket
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Buscar tickets en "En Proceso" sin chat room
        tickets_to_repair = Ticket.objects.filter(
            estado='En Proceso',
            chat_room__isnull=True
        )

        created_chats = []

        for ticket in tickets_to_repair:
            # Crear chat room
            chat_room = ChatRoom.objects.create(
                ticket=ticket,
                type='TICKET',
                is_active=True
            )

            # Agregar participantes
            if ticket.solicitante:
                chat_room.participants.add(ticket.solicitante)

            if ticket.agente:
                chat_room.participants.add(ticket.agente)

            created_chats.append({
                'ticket_id': ticket.id,
                'ticket_titulo': ticket.titulo,
                'chat_room_id': chat_room.id
            })

        return Response({
            'message': f'Se crearon {len(created_chats)} chat rooms',
            'created_chats': created_chats
        }, status=201)
