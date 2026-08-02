# AGENTS.md

API NestJS 11 (Postgres + TypeORM, logging con pino). Las features viven en `src/modules/<feature>/`; la infraestructura de BD en `src/database/`; el logging en `src/logger/`.

## Comandos

- `npm run start:dev` — servidor dev con watch
- `npm run build` — compila a `dist/` (lo borra antes). Buen typecheck de saneamiento; `npx tsc --noEmit` también funciona.
- `npm run lint` — ESLint con tipos (`recommendedTypeChecked`) y **ejecuta `--fix`** (muta archivos)
- `npm run format` — Prettier (`singleQuote`, `trailingComma: all`)
- `npm test` — tests unitarios Jest (`test/unit/**/*.spec.ts`, config en `package.json`)
- `npm run test:e2e` — tests e2e (`test/e2e/*.e2e-spec.ts`, config en `test/jest-e2e.json`)

## Base de datos (la parte no obvia)

- Postgres 16 vía `docker compose up -d` (db `ferreteria`, user/pass `postgres`/`postgres`, puerto 5432). La BD debe estar corriendo tanto para la app como para cualquier comando de migración.
- La conexión se lee de `.env` (`DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE`). `.env` está en gitignore — créalo (los defaults coinciden con `src/database/database.config.ts` y `docker-compose.yml`). El CLI de migraciones lo carga vía `dotenv/config` en `src/database/data-source.ts`.
- `synchronize: false`: los cambios de esquema van solo por migraciones. Scripts propios (envuelven el CLI de TypeORM con `-r tsconfig-paths/register`):
  - `npm run migration:add <Name>` — genera una migración del diff de entidades en `src/database/migrations/<timestamp>-<Name>.ts`
  - `npm run migration:run` / `migration:revert` / `migration:show`
  - `npm run migration:remove` — borra el último archivo de migración solo si no fue aplicado
  - `npm run migration:drop` — **`schema:drop`, destructivo**
- Entidades: archivos con nombre `*.entity.ts`. El auto-cargado en runtime (`autoLoadEntities: true` en `DatabaseModule`) exige registrarlas con `TypeOrmModule.forFeature` en el módulo de la feature; el CLI de migraciones en cambio barre `src/**/*.entity.ts` desde disco, así que `migration:add` detecta entidades nuevas incluso antes de cablearlas.
- `DatabaseModule` es `@Global()`; `ConfigModule.forRoot({ isGlobal: true })` está en `AppModule`.

## Estructura de features

Cada feature en `src/modules/<feature>/` con subcarpetas `entities/`, `controllers/`, `services/` y `dtos/`, más su `<feature>.module.ts` (debe importarse en `AppModule`):

```
src/modules/products/
├── controllers/          # endpoints REST
│   ├── products.controller.ts
│   └── base-products.controller.ts
├── dtos/                 # una subcarpeta por recurso: dtos/product/, dtos/base-product/
│   └── product/
│       └── create-product.dto.ts
├── entities/             # una clase por tabla
│   ├── producto.entity.ts
│   ├── base-product.entity.ts
│   └── product-attribute.entity.ts
├── services/             # lógica de negocio + @InjectRepository
│   ├── products.service.ts
│   └── base-products.service.ts
└── products.module.ts    # TypeOrmModule.forFeature([...]) + providers + controllers
```

Patrón usado: `@InjectRepository(Entity)` en el service + `TypeOrmModule.forFeature([Entity])` en el módulo de la feature.

### DTOs y validación

- `main.ts` registra `new ValidationPipe({ whitelist: true, transform: true })` global. Con `whitelist: true`, **todo campo que recibe el body necesita un decorator de validación**, si no se descarta en silencio.
- Para campos numéricos añade `@Type(() => Number)` (de `class-transformer`) junto a `@IsNumber()`: `transform: true` convierte strings a number, pero solo si el decorator `@Type` está presente.
- Objetos anidados (p. ej. `productAttributes: { attributeId, attributeValueId }[]`) requieren una clase DTO aparte decorada y `@ValidateNested({ each: true })` + `@Type(() => MiDto)`.
- `class-validator` y `class-transformer` ya están instalados.
- Cada propiedad lleva `@ApiProperty(...)` (de `@nestjs/swagger`) para aparecer en Scalar (ver sección Documentación). Usa `@ApiProperty({ type: () => [MiDto] })` para arreglos de DTOs.

## Flujo de specs (spec-driven)

- Los specs viven en `specs/` (`NN-slug.md`, estado en `Status:`: `Draft`/`Aprobado`/`Implementado`, etc.) con config en `specs/.spec-config.yml`.
- Flujo: `/spec` diseña y guarda el spec (Draft) → el humano lo cambia a `Aprobado` → `/spec-impl NN-slug` crea la rama `spec-NN-slug`, implementa paso a paso pausando tras cada paso, y al final verifica los acceptance criteria y marca el spec `Implementado`.
- No marques un spec como `Aprobado` por tu cuenta; eso lo hace el humano.

## Documentación (Scalar / OpenAPI)

- Docs interactivos en http://localhost:3000/docs vía `@scalar/nestjs-api-reference`.
- El documento OpenAPI se genera con `@nestjs/swagger`: `SwaggerModule.createDocument(app, config)` en `src/main.ts` usando `DocumentBuilder` (`.addBearerAuth()`).
- Los endpoints/DTOs solo aparecen en Scalar si llevan los decorators de Swagger (`@ApiProperty`, `@Body`, `@Param`, etc.). Ambos paquetes (`@nestjs/swagger`, `@scalar/nestjs-api-reference`) están instalados.

## Gotchas

- El alias de rutas `@/*` → `./src/*` funciona en la app y en el CLI de migraciones (tsconfig-paths) **y en Jest** (configs de `package.json` y `test/jest-e2e.json` tienen `moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" }`). Los tests pueden usar `@/` o imports relativos.
- El logging es `nestjs-pino`: transporte pino-pretty solo cuando `NODE_ENV !== 'production'` (prod = JSON plano). `main.ts` usa `bufferLogs` + `app.useLogger(app.get(Logger))`.
- `npm run lint` reformatea código que se desvíe de Prettier (las entidades se escriben en comillas dobles / 4 espacios / sin punto y coma; tras un lint quedan en single quote).
- El `README.md` es la plantilla upstream de Nest, no describe este repo.
- `npm install` puede avisar de paquetes con scripts no aprobados (nestjs/swc/scarf); no rompe la instalación.
