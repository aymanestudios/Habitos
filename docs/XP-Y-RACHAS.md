# XP, niveles y rachas

Todo se calcula en el **servidor** (migración `0004_xp_streaks.sql`). El navegador solo muestra los números: no puede inventarse XP.

## XP por hábito

| Dificultad | XP |
|---|---|
| Fácil | 10 |
| Media | 20 |
| Difícil | 30 |

- Un hábito da XP **una vez por día** (o por semana, según su tipo) al cumplirse. Marcar, desmarcar y volver a marcar no duplica: desmarcar quita el XP.
- Hábitos de número (ej. 8 vasos): el XP llega al alcanzar la meta; pasarse no da más, bajar de la meta lo retira.
- **El día que creas un hábito no da XP** (evita crear y marcar para ganar XP). Desde el día siguiente, sí.
- "N veces por semana": dan XP los primeros N días de la semana (lunes a domingo).
- "Total semanal": un solo premio cuando la suma de la semana llega a la meta.
- **Tope diario: 150 XP.**
- **Bonus de día completo: +20 XP** si tienes 3 o más hábitos diarios y los haces todos (cuenta dentro del tope).

## Niveles

XP para llegar al nivel N = 25 × (N − 1) × (N + 2): nivel 2 = 100, 3 = 250, 4 = 450, 5 = 700, 10 = 2.700. Cada nivel cuesta un poco más que el anterior.

## Racha

- Un día cuenta si completas **al menos el 70 %** de tus hábitos diarios programados ese día.
- Los días sin hábitos programados (ej. fines de semana de un hábito de lunes a viernes) ni suman ni rompen la racha.
- **Congelaciones:** puedes fallar hasta **2 días al mes** sin perder la racha (se renuevan cada mes). Solo se usan si ya tenías racha.
- Hoy nunca puede "fallar": solo suma si llegas al 70 %.
- Un hábito archivado deja de contar desde el día en que se archiva.
- Los hábitos semanales no cuentan para la racha.

## Seguridad

- Tabla `xp_events`: solo lectura de lo tuyo; nadie puede escribir directamente.
- Solo dos funciones son públicas para usuarios con sesión: `add_habit_progress` y `get_my_progress`. El resto son internas.

## Pruebas

La migración se probó en un Postgres temporal con 103 comprobaciones (niveles, XP sin duplicar, tope, bonus, semanales, rachas con fechas fijas, permisos y aislamiento entre usuarios).

## Hábito hecho = cerrado (0020)
Cuando un hábito llega a su meta (el tic verde), ya no se puede sumar ni quitar ese día: desaparecen − y + y la fila no se desmarca.
Lo comprueba el servidor (`add_habit_progress` devuelve `already_done`), así el XP no se puede inflar ni deshacer.
El progreso se queda en la meta (3 de 3 litros, no 4 de 3). En los de "total semanal", cerrado = la semana ya llegó a la meta.
