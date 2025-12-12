import time
import subprocess
import datetime
import sys
import os

# =============================================================================
# Este script reemplaza al Programador de Tareas de Windows
# Mantiene un proceso vivo que ejecuta la rotación a las 00:01 AM.
# =============================================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def run_rotaciones():
    print(f"[{datetime.datetime.now()}]  Ejecutando proceso de rotación...", flush=True)
    
    # Construir la ruta al manage.py
    manage_py = os.path.join(BASE_DIR, "manage.py")
    
    try:
        # Ejecutamos el comando de Django usando el mismo intérprete de Python actual
        result = subprocess.run(
            [sys.executable, manage_py, "ejecutar_rotaciones"],
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout, flush=True)
        if result.stderr:
            print(" Advertencias:", result.stderr, flush=True)
            
    except subprocess.CalledProcessError as e:
        print(f" Error ejecutando rotaciones: {e}", flush=True)
        print("Salida de error:", e.stderr, flush=True)
    except Exception as e:
        print(f" Error inesperado: {e}", flush=True)

def main():
    print(" Scheduler de Rotaciones iniciado (Modo Docker)", flush=True)
    print(f" Hora del sistema detectada: {datetime.datetime.now()}", flush=True)
    print(f" Zona Horaria (Timezone): {time.tzname}", flush=True)
    print(" Programado para ejecutarse diariamente a las 00:01 AM", flush=True)

    while True:
        now = datetime.datetime.now()
        # Definir objetivo: Hoy a las 00:01
        target = now.replace(hour=0, minute=1, second=0, microsecond=0)
        
        # Si ya pasó la hora hoy, programar para mañana
        if now >= target:
            target += datetime.timedelta(days=1)
            
        seconds_wait = (target - now).total_seconds()
        print(f"💤 Durmiendo {seconds_wait/3600:.2f} horas hasta la próxima ejecución ({target})...", flush=True)
        
        time.sleep(seconds_wait)
        run_rotaciones()
        time.sleep(60) # Esperar 1 min para no repetir en el mismo minuto

if __name__ == "__main__":
    main()