# Clase 3 — Dependency Inversion

> **Proyecto:** OfiDocs · alta y confirmación de usuarios
> **Principio:** DIP (Dependency Inversion)

## El caso de uso

`UserRegistrationService` valida los datos, crea una cuenta pendiente, envía el
correo de confirmación cuando está habilitado y activa la cuenta al confirmar
el token. El servicio depende de puertos definidos en
[`src/registration/ports.ts`](src/registration/ports.ts), no de las clases de
infraestructura.

Los puertos cubren el repositorio, notificaciones, hashing, auditoría, reloj,
generación de IDs y tokens y lectura de feature flags. El punto de composición
está en [`src/create-registration-service.ts`](src/create-registration-service.ts);
es el único módulo que conecta el servicio con adaptadores concretos.

## Adaptadores incluidos

- `InMemoryUserRepository` y `ConsoleNotificationSender` permiten ejecutar el
  demo localmente sin servicios externos.
- Los adaptadores `PostgresUserRepository` y `SmtpEmailSender` declaran los
  puertos respectivos, pero informan explícitamente que no están configurados:
  este ejercicio no incluye drivers ni credenciales para esos servicios.
- `SystemClock`, los generadores, el hasher, el logger y el lector de flags
  encapsulan sus detalles de implementación en `src/infra/`.

## Puesta en marcha

```bash
npm install
npm test
npm run typecheck
npm run demo
# También funciona: npx tsx src/demo.ts
```

Los tests construyen un servicio nuevo para cada caso con dobles propios. No
congelan el reloj global, no parchean builtins ni modifican `process.env`.
