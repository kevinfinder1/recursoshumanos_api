from django.contrib.auth.models import User
from tickets.models import Profile

def run():
    agentes = [
        ("cristina@emsa.com", "agente_nomina"),
        ("carlos@emsa.com", "agente_certificados"),
        ("mariana@emsa.com", "agente_transporte"),
        ("pedro@emsa.com", "agente_epps"),
        ("ana@emsa.com", "agente_tca"),
        ("soporte@emsa.com", "agente_general"),
    ]

    print("=== Creación de agentes ===", flush=True)
    for email, role in agentes:
        username = email.split("@")[0]
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "is_staff": True},
        )

        if created:
            user.set_password("123456")
            user.save()
            print(f"✅ Usuario creado: {username} ({role})", flush=True)
        else:
            print(f"⚠️ Usuario ya existente: {username} — actualizando rol", flush=True)

        profile, _ = Profile.objects.get_or_create(user=user)
        profile.role = role
        profile.save()

    print("=== Proceso completado ===", flush=True)

# ✅ Ejecuta automáticamente cuando el archivo se evalúa
run()
