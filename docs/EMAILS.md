# Emails de la cuenta (confirmar y recuperar contraseña)

## Cómo funciona en la app
- **Registrarse:** se crea la cuenta y llega un email. Hasta pulsar el enlace no se puede entrar.
  El enlace vuelve a la app (`/`) y entra solo. En el login hay "Reenviar email de confirmación" (cada 60 s).
- **Recuperar contraseña:** "¿Has olvidado la contraseña?" en el login → email → `/nueva-contrasena`.
  El mensaje es siempre el mismo exista o no la cuenta (nadie puede averiguar qué emails están registrados).
- Contraseña mínima: 8 caracteres (en la app y en Supabase). "Secure password change" activado.

## Paso obligatorio: correo propio (SMTP)
Sin SMTP, Supabase solo envía a los miembros del equipo del proyecto y muy pocos por hora.
1. Crea una cuenta gratis en un proveedor de correo (por ejemplo **Brevo**) y verifica el email remitente.
2. Copia sus datos SMTP (servidor, puerto 587, usuario y clave). **La clave es secreta: ponla tú, no la compartas.**
3. Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP:
   remitente `Progress&Go <tu-correo>`, y los datos del paso 2. Guarda.
4. Authentication → Rate Limits: sube "emails por hora" a 30 (suficiente para la beta).
5. Pega las plantillas de abajo (Emails → Templates) y activa en "Security" el aviso de **Password changed**.
6. Prueba con un email que no sea el tuyo: registro, confirmación, recuperar contraseña. Mira en spam.

## Plantillas en español

### Confirm sign up
Asunto: `Confirma tu cuenta de Progress&Go 🐾`
```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#263b38">
  <h2>¡Hola! Ya casi estás 🐾</h2>
  <p>Pulsa el botón para activar tu cuenta de <b>Progress&amp;Go</b>.</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#8adbd0;color:#173a36;padding:12px 20px;border-radius:12px;font-weight:bold;text-decoration:none">Activar mi cuenta</a></p>
  <p style="color:#5a6a65;font-size:13px">Si no te has registrado tú, ignora este email.</p>
</div>
```

### Reset password
Asunto: `Elige una contraseña nueva · Progress&Go`
```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#263b38">
  <h2>¿Contraseña olvidada? Sin problema</h2>
  <p>Pulsa el botón para elegir una nueva. El enlace caduca en 1 hora y solo vale una vez.</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#8adbd0;color:#173a36;padding:12px 20px;border-radius:12px;font-weight:bold;text-decoration:none">Elegir contraseña nueva</a></p>
  <p style="color:#5a6a65;font-size:13px">Si no lo has pedido tú, ignora este email: tu contraseña sigue igual.</p>
</div>
```

### Change email address
Asunto: `Confirma tu nuevo email · Progress&Go`
```html
<p>Pulsa para confirmar el cambio de email de tu cuenta de Progress&amp;Go:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar el cambio</a></p>
```

## ¿Está cifrada la información?
- **Contraseñas:** nunca se guardan; Supabase guarda solo un hash (no se puede volver atrás).
- **Base de datos y copias de Supabase:** cifradas en disco (AES-256) y en el viaje (TLS/HTTPS).
- **Quién ve qué:** lo decide la base de datos (RLS) en cada petición; cada uno solo ve lo suyo y lo que sus amigos comparten.
- **Claves de los avisos y secreto del cron:** cifrados en Vault.
- No ciframos campo a campo los hábitos o los nombres: el servidor necesita leerlos para calcular el XP, las rachas
  y lo que ven tus amigos. Cifrarlos rompería esas funciones y no añade protección real frente a lo que ya hay.
