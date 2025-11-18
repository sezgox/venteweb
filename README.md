# Venteweb

Aplicación web completa con frontend (Angular) y backend (NestJS) basada en Docker.

## Arquitectura

- **Frontend**: Angular 18 con TailwindCSS
- **Backend**: NestJS con Prisma ORM
- **Base de datos**: PostgreSQL 14
- **Contenedor web**: Nginx

## Instalación con Docker

### Requisitos previos

- Docker y Docker Compose instalados
- Git

### Pasos de instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/sezgox/venteweb
   ```

2. **Levantar los servicios con Docker Compose**
   ```bash
   docker-compose up --build
   ```

   Este comando construirá y levantará los siguientes servicios:
   - **postgres**: Base de datos PostgreSQL en puerto 5432
   - **backend**: API NestJS en puerto 3000
   - **frontend**: Aplicación Angular servida por Nginx en puerto 80

3. **Acceder a la aplicación**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000
   - Base de datos: localhost:5432

### Comandos útiles

```bash
# Levantar servicios en background
docker-compose up -d

# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Detener servicios
docker-compose down

# Detener servicios y eliminar volúmenes
docker-compose down -v

# Reconstruir imágenes
docker-compose build --no-cache

# Entrar en un contenedor
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Estructura del proyecto

```
TFG/

├── docker-compose.yml
├── venteweb/          # Backend NestJS
├── ventewebf/         # Frontend Angular
└── README.md
```

### Configuración de la base de datos

La base de datos PostgreSQL se configura automáticamente con:
- **Usuario**: ventedbuser
- **Contraseña**: S3cret
- **Base de datos**: venteweb

Los datos persisten en un volumen Docker llamado `postgres_data`.

### Variables de entorno

El backend se configura automáticamente con la variable:
- `DATABASE_URL=postgresql://ventedbuser:S3cret@postgres:5432/venteweb`

### Desarrollo local

Si prefieres desarrollar localmente sin Docker:

1. **Backend**
   ```bash
   cd venteweb
   npm install
   npm run start:dev
   ```

2. **Frontend**
   ```bash
   cd ventewebf
   npm install
   ng serve
   ```

3. **Base de datos**
   ```bash
   # Usar el contenedor PostgreSQL existente o configurar una instancia local
   docker run -d --name postgres-dev \
     -e POSTGRES_PASSWORD=S3cret \
     -e POSTGRES_USER=ventedbuser \
     -e POSTGRES_DB=venteweb \
     -p 5432:5432 \
     postgres:14-alpine
   ```

## Troubleshooting

### Problemas comunes

1. **Error de conexión a la base de datos**
   - Asegúrate de que el contenedor postgres esté corriendo
   - Verifica las credenciales en el docker-compose.yml

2. **Error de construcción del frontend**
   - Verifica que todos los archivos estén en sus directorios correctos
   - Revisa los logs con `docker-compose logs frontend`

3. **Error de construcción del backend**
   - Asegúrate que Prisma esté correctamente configurado
   - Revisa los logs con `docker-compose logs backend`

### Limpieza

Para eliminar completamente todos los contenedores, imágenes y volúmenes:

```bash
docker-compose down -v --rmi all
docker system prune -a
```