# SPEC 07 — Imágenes polimórficas con subida a disco y storage intercambiable

> **Status:** Aprobado
> **Depends on:** SPEC 02, SPEC 06
> **Date:** 2026-08-02
> **Objective:** Crear el módulo de imágenes con subida multipart a disco local, tabla `image` con relación polimórfica (`entityType`/`entityId`), una imagen principal por entidad, y un `StorageService` intercambiable que permita migrar a Firebase/S3 sin cambiar el API.

## Scope

**In:**

- Entidad `Image` (tabla `image`): `id`, `url`, `entityType`, `entityId`, `isMain`. Solo `entityType = 'product'` por ahora (diseño polimórfico).
- Índice `(entityType, entityId)` y **unique parcial** `(entityType, entityId)` `WHERE is_main` (una principal por entidad).
- `POST /images` (multipart: `file` + `entityType` + `entityId`): multer `diskStorage` en `uploads/`, filename con uuid, `fileFilter` jpeg/png/webp, límite 5 MB → **400**.
- Validación: `entityType` solo `'product'`, `entityId` debe existir (404), `file` obligatorio (400). Primera imagen de la entidad → `isMain = true` automático.
- `GET /images?entityType&entityId` lista las imágenes de la entidad (sin paginar; orden `isMain` desc, `id` asc).
- `PATCH /images/:id` con `{ isMain: true }` marca principal (desmarca las otras de la misma entidad). 404 si no existe.
- `DELETE /images/:id` borra el registro **y el archivo** del disco. 404 si no existe.
- `StorageService` (interfaz `save`/`remove`) + `LocalStorageService`; la tabla guarda la URL.
- Servir `/uploads` como estático desde `main.ts` (`express.static`, sin dependencia nueva).
- `ImagesModule` registrado en `AppModule` con `forFeature([Image, Product])`.
- Dependencia nueva: `multer` (y `@types/multer` dev) para `diskStorage`/`fileFilter`.

**Out of scope (for future specs):**

- Firebase/S3 como backend real (solo queda la interfaz; la implementación es un spec futuro).
- Imágenes en `base_product`.
- Paginación del listado de imágenes.
- Limpieza automática de imágenes huérfanas al borrar un producto (SPEC 06 no toca imágenes; se borran por su endpoint).

## Data model

```ts
// src/modules/images/entities/image.entity.ts
@Entity('image')
export class Image {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) url: string; // '/uploads/<uuid>.ext'
  @Column({ type: 'varchar', length: 50 }) entityType: string; // 'product'
  @Column({ type: 'int' }) entityId: number;
  @Column({ type: 'boolean', default: false }) isMain: boolean;
}
// Migración: CREATE TABLE image + índice (entityType, entityId)
// + CREATE UNIQUE INDEX ... ON image(entity_type, entity_id) WHERE is_main
```

```ts
// src/modules/images/storage/storage.service.ts (interfaz)
export interface StorageService {
  save(file: Express.Multer.File): Promise<string>; // guarda binario, devuelve URL
  remove(url: string): Promise<void>;
}

// src/modules/images/storage/local-storage.service.ts
// Guarda en uploads/ con nombre uuid + ext; devuelve `/uploads/<uuid>.<ext>`.
// Elimina el archivo del disco en remove(). Futuro: FirebaseStorageService
// implementando la misma interfaz — el API no cambia.
```

```ts
// src/modules/images/dtos/create-image.dto.ts (campos del multipart)
export class CreateImageDto {
  @IsIn(['product']) @ApiProperty({ example: 'product' }) entityType: string;
  @IsInt() @Type(() => Number) @ApiProperty({ example: 1 }) entityId: number;
}

// src/modules/images/dtos/set-main-image.dto.ts
export class SetMainImageDto {
  @IsBoolean() @IsNotEmpty() @ApiProperty() isMain: boolean; // true
}

// src/modules/images/dtos/image.dto.ts (respuesta)
export class ImageDto {
  @ApiProperty() id: number;
  @ApiProperty() url: string;
  @ApiProperty() entityType: string;
  @ApiProperty() entityId: number;
  @ApiProperty() isMain: boolean;
  static fromEntity(img: Image): ImageDto { ... }
}
```

Convenciones:

- `url` almacenada: `/uploads/<uuid>.<ext>` (servida por `express.static`).
- Multer options definidas en el módulo: `diskStorage`, `fileFilter` (mimetype jpeg/png/webp), `limits.fileSize: 5 * 1024 * 1024`.
- `GET /images` no usa `PaginationDto` — listado simple (conjunto pequeño).
- Al marcar principal se usa el unique parcial: desmarcar las demás (`UPDATE ... SET is_main = false WHERE entity_type AND entity_id`) y marcar la elegida en la misma transacción.
- Si el INSERT falla tras guardar el archivo → borrar el archivo en el `catch` (evitar huérfanos).

## Implementation plan

1. `npm i multer` y `npm i -D @types/multer`.
2. Crear `Image` entity en `src/modules/images/entities/image.entity.ts`.
3. Migración `CreateImage`: tabla + índice `(entityType, entityId)` + unique parcial `WHERE is_main`; aplicar con `npm run migration:run`.
4. Crear `StorageService` (interfaz) y `LocalStorageService` (`uploads/`, uuid).
5. Crear DTOs `CreateImageDto`, `SetMainImageDto`, `ImageDto`.
6. Crear `ImagesService`: validar entidad (404), guardar archivo + fila (primera imagen → isMain), listar, marcar principal (transacción), borrar (registro + archivo).
7. Crear `ImagesController` (`POST /images`, `GET /images`, `PATCH /images/:id`, `DELETE /images/:id`) con `FileInterceptor` + multer options.
8. Registrar `ImagesModule` en `AppModule` (`forFeature([Image, Product])`).
9. En `main.ts`: `app.use('/uploads', express.static(join(process.cwd(), 'uploads')))`.
10. `npm run build`, `npm run lint` y verificación manual (subir/listar/marcar/borrar + servir `/uploads/<file>`).

## Acceptance criteria

- [ ] `POST /images` con un jpeg/png/webp válido responde **201** con `ImageDto`; la primera imagen de la entidad queda con `isMain: true`.
- [ ] Archivo ausente → **400**; formato no permitido → **400**; archivo > 5 MB → **400**.
- [ ] `entityType` distinto de `'product'` → **400**; `entityId` de un product inexistente → **404**.
- [ ] `GET /images?entityType=product&entityId=N` devuelve las imágenes de la entidad (principal primero, sin paginar).
- [ ] `PATCH /images/:id` con `{ isMain: true }` marca esa imagen y desmarca las otras de la misma entidad; id inexistente → **404**.
- [ ] `DELETE /images/:id` borra el registro y el archivo del disco; id inexistente → **404**.
- [ ] `GET /uploads/<file>` sirve el archivo (HTTP 200).
- [ ] En BD existe `image` con índice `(entityType, entityId)` y unique parcial `WHERE is_main` (una sola principal por entidad).
- [ ] `npm run build` compila sin errores de tipos.
- [ ] `npm run lint` pasa sin errores.

## Decisions

- **Sí:** la tabla guarda solo la **URL**; el binario vive en disco. Base para migrar a cloud sin tocar el esquema.
- **Sí:** `StorageService` como interfaz → `LocalStorageService` hoy; Firebase/S3 mañana implementando la misma interfaz (el API no cambia, solo se agrega un backend nuevo).
- **Sí:** relación polimórfica `entityType`/`entityId`, validando solo `'product'` por ahora (la columna ya lo permite para otros).
- **Sí:** `isMain` con unique parcial `(entityType, entityId) WHERE is_main` — la BD garantiza una principal por entidad.
- **Sí:** subida multipart con multer (viene con platform-express; se instala explícito para `diskStorage`/`fileFilter`).
- **Sí:** servir `/uploads` con `express.static` en `main.ts` (sin `ServeStaticModule` — menos dependencias).
- **No:** paginación en el listado de imágenes (conjunto pequeño; se agrega si crece).
- **No:** limpieza automática de imágenes al borrar el product en SPEC 06 (los archivos se gestionan desde `DELETE /images/:id`; limpieza en cascada es un spec futuro).
- **No:** Firebase en este spec.

## Risks

| Risk                                                           | Mitigation                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Archivo guardado en disco pero INSERT falla → huérfano.        | Borrar el archivo en el `catch` del service.                                           |
| Multer es dependencia transitiva de platform-express.          | Instalarla explícita (`multer` + `@types/multer`) para importarla con seguridad.       |
| Borrar un product deja imágenes huérfanas (SPEC 06).           | Documentado; limpieza en cascada como spec futuro.                                     |
| Servir `/uploads` estático puede exponer archivos no deseados. | Solo se sirve la carpeta `uploads/`; control de acceso/auth queda para un spec futuro. |

## What is **not** in this spec

- Implementación Firebase/S3 del `StorageService`.
- Imágenes en `base_product`.
- Paginación del listado de imágenes.
- Limpieza automática de imágenes al borrar un producto.
- Autenticación/permisos sobre `/uploads`.

Cada uno de esos, si llega, va en su propio spec.
