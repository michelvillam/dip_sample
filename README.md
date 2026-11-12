# Clase 3 — Dependency Inversion

> **Proyecto:** OfiDocs · alta y confirmación de usuarios
> **Principio:** DIP (Dependency Inversion)

---

## El contexto

`UserRegistrationService` es el caso de uso de alta de usuarios: valida, crea la
cuenta en estado pendiente, manda el correo de confirmación y la activa cuando el
usuario introduce el código.

La lógica es correcta y los 12 tests están en verde. El problema no se ve en el
servicio: **se ve en el test**.

Abre `test/user-registration-service.test.ts` y lee el `beforeEach`. Para poder
probar una función que valida un email y guarda una fila, ese bloque necesita:

- vaciar a mano el estado global de **tres** módulos de infraestructura,
- **congelar el reloj del proceso entero** con `vi.useFakeTimers()`,
- **parchear `Math.random()`**, un builtin del lenguaje,
- y **escribir en `process.env`**.

Cuatro trucos. Para probar un caso de uso de treinta líneas.

Y ahora la prueba definitiva. Ejecuta esto:

```bash
npx tsx src/demo.ts
```

Revienta. Solo funciona con `npm run demo`, que por dentro hace
`NODE_ENV=test tsx src/demo.ts`. Es decir: **para que la aplicación arranque hay
que mentirle y decirle que está en un test.**

---

## Puesta en marcha

```bash
npm install
npm test          # 12 tests, todos en verde
npm run demo      # da de alta un usuario y lo confirma
```

---

## Qué hay dentro

```
src/
  types.ts
  infra/
    postgres-user-repository.ts   Repositorio real… con "modo test" dentro
    smtp-email-sender.ts          Envío SMTP… con "modo test" dentro
    audit-logger.ts               Singleton global de auditoría
    password-hasher.ts            Sal leída de process.env
    feature-flags.ts              Flags leídos de process.env
  registration/
    user-registration-service.ts  ⟵ El caso de uso
    create-registration-service.ts  Punto único de construcción
  demo.ts
```

---

## Tu misión

### Parte 1 — Identifica las dependencias ocultas

`UserRegistrationService` no recibe **nada** por constructor. Haz la lista
completa de todo aquello de lo que depende sin decirlo. Hay más de lo que parece:
además de los tres colaboradores que instancia con `new`, depende de un singleton
importado, de los flags de entorno, del reloj del sistema y del generador de
números aleatorios.

> El reloj y el aleatorio **también son dependencias**. Son entrada del sistema
> que viene de fuera, exactamente igual que la base de datos. Que el lenguaje te
> los regale como funciones globales no los convierte en otra cosa.

### Parte 2 — Invierte la dependencia

Define en el dominio las **abstracciones que el caso de uso necesita**, expresadas
en su lenguaje y no en el de la tecnología: no `PostgresUserRepository`, sino
`UserRepository`; no `SmtpEmailSender`, sino `NotificationSender`.

Luego haz que el servicio las reciba por constructor y que sean las clases de
infraestructura las que dependan de esas abstracciones, y no al revés. Esa
inversión de la flecha es literalmente el principio: *los módulos de alto nivel
no dependen de los de bajo nivel; ambos dependen de abstracciones.*

`create-registration-service.ts` es tu **composition root**: el único sitio de
todo el proyecto donde se nombran las clases concretas.

### Parte 3 — Cobra el premio

Con las dependencias inyectadas, escribe un **segundo archivo de tests**
(`test/user-registration-service.solid.test.ts`) que cubra los mismos casos
usando dobles de prueba propios. Ese archivo debe quedar así:

- [ ] Sin `vi.useFakeTimers()`
- [ ] Sin `vi.spyOn`
- [ ] Sin tocar `process.env`
- [ ] Sin funciones `__reset*`
- [ ] Cada test construye su propio servicio y no comparte estado con ningún otro

Cuando lo tengas, pon los dos archivos de test uno al lado del otro. Esa
comparación **es** la clase.

### Parte 4 — Limpia la infraestructura

Cuando el caso de uso ya no dependa de las clases concretas, borra de
`postgres-user-repository.ts` y `smtp-email-sender.ts` todo lo que sabe de los
tests: el `NODE_ENV === 'test'`, el almacén en memoria y las funciones `__reset*`.
Ese conocimiento se muda a un `InMemoryUserRepository` que vive en los tests,
donde siempre debió estar.

Y comprueba el resultado: `npx tsx src/demo.ts` debe arrancar **sin** la mentira
de `NODE_ENV=test`.

---

## Criterios de aceptación

1. `npm test` en verde. **El archivo de tests original no se toca**: debe seguir
   pasando tal cual (por eso construye el servicio a través de
   `createRegistrationService()`).
2. `npm run typecheck` sin errores.
3. `src/registration/` no importa **nada** de `src/infra/`.
4. Ningún archivo de `src/` contiene `process.env`, `new Date()` ni `Math.random()`
   fuera de las implementaciones de infraestructura.
5. El nuevo archivo de tests cumple la lista de la Parte 3.

---

## Pistas (si te atascas)

<details>
<summary>Pista 1 — dónde va la interfaz</summary>

Error clásico: crear `src/infra/user-repository.interface.ts`. Si la abstracción
vive junto a la implementación, sigue siendo del bajo nivel y no has invertido
nada. **La interfaz pertenece a quien la usa**, no a quien la implementa: va en
`src/registration/` (o en un `src/domain/`), y `infra` la importa desde allí.
</details>

<details>
<summary>Pista 2 — el reloj</summary>

`interface Clock { now(): Date }`. Dos líneas. En producción,
`{ now: () => new Date() }`. En los tests, `{ now: () => new Date('2024-03-01') }`.
Adiós a `vi.useFakeTimers()` para siempre. Lo mismo con un `TokenGenerator` y un
`IdGenerator`.
</details>

<details>
<summary>Pista 3 — inyección de dependencias ≠ framework de inyección</summary>

No necesitas ningún contenedor, ni decoradores, ni librerías. "Inyectar una
dependencia" es pasarla por el constructor. Nada más. El contenedor es una
comodidad para proyectos grandes, no el principio.
</details>

---

## Reto extra

El flag `WELCOME_EMAIL` se consulta dentro del caso de uso. ¿Es el flag una
dependencia que hay que inyectar, o es que el envío del correo de bienvenida
directamente **no debería ser responsabilidad de este servicio**? (Pista: lo que
aprendiste en la clase 1 sobre SRP aplica aquí.) Argumenta tu decisión: en esta
no hay una única respuesta correcta, pero sí hay respuestas mal justificadas.
