// Genera una nueva migración en src/database/migrations a partir del diff de entidades.
const { spawnSync } = require('child_process');

const name = process.argv[2];

if (!name) {
    console.error('❌ Falta el nombre de la migración.');
    console.error('   Uso: npm migration:add <NombreMigracion>');
    console.error('   Ej:  npm migration:add CreatePersonasTable');
    process.exit(1);
}

if (/[\\/]/.test(name)) {
    console.error('❌ El nombre no puede contener rutas ni separadores (/ o \\).');
    process.exit(1);
}

// tsconfig-paths/register es necesario para resolver los alias (@features/*)
const result = spawnSync(
    `node -r tsconfig-paths/register node_modules/typeorm/cli-ts-node-commonjs.js migration:generate -d src/database/data-source.ts "src/database/migrations/${name}"`,
    { stdio: 'inherit', shell: true },
);

process.exit(result.status ?? 1);
