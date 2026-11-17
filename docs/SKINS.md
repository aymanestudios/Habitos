# Skins del panda (gacha)

Cosmético puro: **no da XP ni ventajas**.

## Cómo se consiguen
- **1 ticket cada 7 días cumplidos** (día cumplido = llegar al 70 % de tus hábitos; no hace falta que sean seguidos).
- Un ticket = una **cápsula misteriosa** = una skin **al azar entre las que aún no tienes** (así no salen repetidas hasta tenerlas todas; si ya las tienes todas, no se gasta el ticket).
- Todo lo decide el servidor (`open_skin_capsule`): tickets, azar y colección. El cliente no puede falsearlo.
- Aviso en Inicio al ganar un ticket; la cápsula está en **Logros → Skins del panda**.

## Misterio
- El catálogo es interno (tabla cerrada): nadie puede listar qué skins existen. Cada persona solo ve las que ha conseguido.
- Los archivos tienen nombres aleatorios (`public/skins/<código>.webp`), así que tampoco se pueden adivinar.

## Compañero
- La skin equipada **sustituye al panda en toda la app** (Inicio, avisos, perfil…). Se equipa/quita tocándola en la colección. También sale en **Perfil → Tu compañero**.

## MODO PRUEBA (tickets infinitos)
Ahora está **activado**: `app_flags.infinite_tickets = true` (la app muestra "Modo prueba"). Las skins conseguidas así se marcan `free` y no gastan tickets reales; se pueden repetir cápsulas aunque ya las tengas todas.
Para pasar al modo real (solo con tickets ganados):
```sql
update public.app_flags set value = false where key = 'infinite_tickets';
```
(Si quieres empezar de cero la colección de prueba: `delete from public.user_skins where free;` y `update public.profiles set equipped_skin = null;`)

## Añadir más skins
1. Recorta la imagen (PNG/WebP con fondo transparente, ~500 px) y ponla en `public/skins/` con un nombre aleatorio.
2. `insert into public.skin_catalog (id, name, file, width, height) values ('s_xxxx', 'Nombre', 'xxxx.webp', ancho, alto);`
   (`weight` > 1 = más probable; por defecto 1.)
