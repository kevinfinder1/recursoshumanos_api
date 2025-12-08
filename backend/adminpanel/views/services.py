# backend/adminpanel/views/services.py

from users.models import User
import random
import string

class UserValidationService:
    @staticmethod
    def check_duplicate_user(username, email, user_id=None):
        """
        Verifica si un username o email ya existen, excluyendo el usuario actual si se provee un ID.
        Devuelve un diccionario de errores.
        """
        errors = {}
        
        # Construir querysets base
        username_qs = User.objects.filter(username__iexact=username)
        email_qs = User.objects.filter(email__iexact=email)
        
        # Si es una actualización, excluir al usuario actual de la verificación
        if user_id:
            username_qs = username_qs.exclude(id=user_id)
            email_qs = email_qs.exclude(id=user_id)
            
        if username and username_qs.exists():
            errors['username'] = "Este nombre de usuario ya está en uso."
            
        if email and email_qs.exists():
            errors['email'] = "Este email ya está registrado."
            
        return errors

    @staticmethod
    def validate_username_availability(username, user_id=None):
        """
        Devuelve True si el username está disponible, False si no.
        """
        qs = User.objects.filter(username__iexact=username)
        if user_id:
            qs = qs.exclude(id=user_id)
        return not qs.exists()

    @staticmethod
    def validate_email_availability(email, user_id=None):
        """
        Devuelve True si el email está disponible, False si no.
        """
        qs = User.objects.filter(email__iexact=email)
        if user_id:
            qs = qs.exclude(id=user_id)
        return not qs.exists()

    @staticmethod
    def get_suggested_username(base_username):
        """
        Genera una lista de nombres de usuario sugeridos si el original está en uso.
        """
        suggestions = []
        for i in range(3):
            suffix = ''.join(random.choices(string.digits, k=3))
            suggestion = f"{base_username}{suffix}"
            if not User.objects.filter(username__iexact=suggestion).exists():
                suggestions.append(suggestion)
        return suggestions