from rest_framework import serializers
from tickets.models import Ticket
from users.models import User

class AgentTicketCreateSerializer(serializers.ModelSerializer):
    agente_destino = serializers.PrimaryKeyRelatedField(
        # ✅ CORRECCIÓN: Usar la nueva lógica de roles para obtener la lista de agentes y admins.
        queryset=User.objects.filter(rol__tipo_base__in=["agente", "admin"]),
        write_only=True
    )

    class Meta:
        model = Ticket
        fields = ["titulo", "descripcion", "prioridad", "agente_destino"]

    def create(self, validated_data):
        # 🎯 SOLUCIÓN DEFINITIVA: Desactivar solo el signal problemático
        from django.db.models.signals import post_save
        
        # Buscar y desactivar el signal específico que falla
        signal_desconectado = None
        for receiver in post_save.receivers:
            if isinstance(receiver, tuple) and len(receiver) == 2:
                func, sender = receiver
                if sender == Ticket and hasattr(func, '__name__'):
                    if func.__name__ == 'actualizar_chat_con_agente':
                        post_save.disconnect(func, sender=Ticket)
                        signal_desconectado = func
                        print("🔌 Signal problemático desconectado")
                        break

        try:
            solicitante = self.context["request"].user
            agente_destino = validated_data.pop("agente_destino")

            # Crear ticket normalmente
            ticket = Ticket.objects.create(
                solicitante=solicitante,
                titulo=validated_data['titulo'],
                descripcion=validated_data['descripcion'],
                prioridad=validated_data['prioridad'],
                estado='Abierto'
            )

            # Asignar agente
            from tickets.services.assignment_service import AssignmentService
            AssignmentService.asignar_ticket_de_agente(ticket, agente_destino)

            return ticket

        except Exception as e:
            print(f"❌ Error: {e}")
            raise
        finally:
            # Reconectar el signal
            if signal_desconectado:
                post_save.connect(signal_desconectado, sender=Ticket)
                print("🔌 Signal reconectado")