from django.contrib import admin
from .models import Ticket, TicketAssignment, TicketHistory

admin.site.register(Ticket)
admin.site.register(TicketAssignment)
admin.site.register(TicketHistory)
