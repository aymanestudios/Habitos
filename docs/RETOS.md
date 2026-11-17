# Retos relámpago

Retos cortos y cooperativos entre dos amigos (Amigos → Retos relámpago). Cada uno participa con **sus propios hábitos**.

| Reto | Tipo | Meta | Duración |
|---|---|---|---|
| 3 días de constancia | days | cada uno cumple su día 3 días | 3 días |
| Semana constante | days | cada uno 5 de 7 días | 7 días |
| 10 hábitos juntos | habits | 10 entre los dos | 7 días |
| 4 entrenamientos / 5 de estudio / Semana sana / Mente en calma | category | entre los dos | 7 días |
| 300 XP juntos | xp | 300 XP entre los dos | 7 días |

- Los de categoría solo se ofrecen si tienes hábitos activos de esa categoría.
- "Cumplir el día" = llegar al 70 % de lo programado (igual que el fuego).
- Un reto activo por pareja. Empieza hoy (zona horaria del perfil).
- El progreso lo calcula el servidor (`challenge_values`, interna); el cliente no puede falsearlo.
- Los retos terminados se ven 7 días más (cumplido / terminado, sin reproches).
- Los retos cumplidos cuentan para la insignia "Trabajo en equipo" (solo cosmética).

RPC: `create_flash_challenge`, `get_my_challenges`, `cancel_challenge` (`create_challenge` antiguo sigue funcionando como reto de XP).

En Inicio, "Tus retos" muestra los activos (máx. 2). Avisos push: ver docs/AVISOS.md.
