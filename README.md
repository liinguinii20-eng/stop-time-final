# Base44 App

## Usar SQLite localmente (opción fácil)

1. Copia el archivo de entorno preparado para SQLite:

```bash
cp .env.sqlite .env
```

2. Instala dependencias si hace falta y genera el cliente de Prisma:

```bash
npm install
npx prisma generate --schema=prisma/schema.sqlite.prisma
```

3. Ejecuta migraciones de desarrollo (crea `dev.db` en `prisma/`):

```bash
npm run prisma:migrate:sqlite
```

4. Abrir Studio para ver los datos:

```bash
npm run prisma:studio:sqlite
```

Esto permite usar una base de datos basada en archivo sin instalar Postgres.

## Nota sobre Docker

He eliminado la configuración de Docker del repositorio a petición. Este proyecto ahora soporta:

- SQLite: opción recomendada para desarrollo local (ver sección "Usar SQLite localmente").
- Postgres: se puede usar manualmente en producción, pero ya no hay `docker-compose.yml` ni `Dockerfile` incluidos.

Si necesitas que vuelva a añadir los archivos de Docker para desplegar Postgres u otros servicios, dímelo y los recreo.
