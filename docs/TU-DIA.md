# "Tu día en Progress&Go" (0027, src/features/dayRecap)

Resumen animado de un día que **ya ha terminado** en tu zona horaria, protagonizado por el panda.

## Cuándo sale
- Al abrir la app al día siguiente, en Inicio aparece una invitación discreta: "Tu día de ayer está listo". Solo si ayer tenías algo (hábitos programados, XP o aportaciones a retos).
- Nunca se abre sola ni bloquea nada. Tocarla la abre; la X la descarta. En los dos casos queda como vista **en el servidor** (`day_recaps_seen`), así que no vuelve a salir en ningún dispositivo.
- Se puede volver a ver cualquiera de los últimos 7 días en **Perfil → Estadísticas → Tu día** (el servidor permite hasta 30).
- No hay avisos push para esto (decisión: nada de insistir).
- Si ese mismo día toca el resumen semanal, espera a que veas o descartes el del día (nunca dos ventanas).

## Escenas (solo las que tienen datos reales)
1. Bienvenida.
2. Hábitos: completados frente a programados, con el anillo y sus nombres.
3. XP real del día (y si subiste de nivel o parte vino de un reto).
4. Racha (y si fue récord).
5. Retos en equipo: lo que aportaste o el reto que cumplisteis.
6. Cierre según el día: "¡Menudo día!", "Avanzaste a tu ritmo" o "No todos los días salen como esperamos…". Nunca con culpa.
Se avanza tocando, con los botones o con las flechas; "Saltar" o Escape la cierran.

## Servidor
`get_day_recap(fecha)` es de **solo lectura** (no cambia estadísticas) y rechaza "hoy" (`day_not_finished`). Una sola llamada, que se guarda 30 minutos en la app.
