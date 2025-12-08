# chat/urls.py
from django.urls import path
from .views import (
    ChatRoomListView,
    ChatRoomDetailView,
    ChatRoomMessagesView,
    FileDownloadView,
    SendMessageView,
    GroupChatMessagesView,
    GroupChatSendMessageView,
    GroupChatInfoView,
    StartDirectChatView,
    RepairTicketChatsView,
)

urlpatterns = [

    # ===============================
    #   CHAT POR TICKET (USER–AGENTE)
    # ===============================

    # Iniciar/obtener un chat directo
    path("directo/iniciar/", StartDirectChatView.as_view(), name="start_direct_chat"),

    # Endpoint de reparación
    path("repair-chats/", RepairTicketChatsView.as_view(), name="repair_ticket_chats"),

    # Lista todos los chats donde el usuario participa
    path("rooms/", ChatRoomListView.as_view(), name="chat_rooms"),

    # Detalle de un chat por id
    path("rooms/<int:pk>/", ChatRoomDetailView.as_view(), name="chat_room_detail"),

    # Mensajes de un chat específico
    path("rooms/<int:pk>/messages/", ChatRoomMessagesView.as_view(), name="chat_room_messages"),

    # Enviar mensaje al chat (texto + archivo)
    path("rooms/<int:pk>/send/", SendMessageView.as_view(), name="chat_room_send_message"),


    # ===============================
    #   CHAT GRUPAL (RRHH / AGENTES)
    # ===============================
    path("group/<str:group_name>/messages/", GroupChatMessagesView.as_view(), name="group_chat_messages"),

    path("group/<str:group_name>/send/", GroupChatSendMessageView.as_view(), name="group_chat_send"),

    path("group/<str:group_name>/info/", GroupChatInfoView.as_view(), name="group_chat_info"),
    # chat/urls.py
    path('files/<str:file_path>/', FileDownloadView.as_view(), name='file_download'),
]
