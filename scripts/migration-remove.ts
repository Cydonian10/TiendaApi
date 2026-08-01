// Equivalente a: dotnet ef migrations remove
// Elimina el archivo de la última migración SOLO si aún no fue aplicada
// a la base de datos. Si ya fue aplicada, indica revertirla primero.
import { readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { AppDataSource } from '../src/database/data-source';

const MIGRATIONS_DIR = join(__dirname, '..', 'src', 'database', 'migrations');

async function main() {
    const files = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.ts'))
        .sort();

    if (files.length === 0) {
        console.log('No hay migraciones para eliminar.');
        return;
    }

    const lastFile = files[files.length - 1];
    // El archivo es "<timestamp>-<Nombre>.ts" pero en la tabla "migrations"
    // TypeORM guarda el nombre como "<Nombre><timestamp>".
    const timestamp = lastFile.split('-')[0];

    await AppDataSource.initialize();

    let appliedNames: string[] = [];
    try {
        const rows: Array<{ name: string }> = await AppDataSource.query(
            'SELECT "name" FROM "migrations"',
        );
        appliedNames = rows.map((r) => r.name);
    } catch {
        // La tabla "migrations" aún no existe: ninguna migración fue aplicada.
    } finally {
        await AppDataSource.destroy();
    }

    if (appliedNames.some((name) => name.endsWith(timestamp))) {
        console.error(
            `❌ La migración "${lastFile}" ya fue aplicada a la base de datos.`,
        );
        console.error('   Primero reviértela con: pnpm migration:revert');
        process.exit(1);
    }

    unlinkSync(join(MIGRATIONS_DIR, lastFile));
    console.log(`✅ Migración eliminada: ${lastFile}`);
}

main().catch((err: Error) => {
    console.error('❌ Error al eliminar la migración:', err.message ?? err);
    process.exit(1);
});
