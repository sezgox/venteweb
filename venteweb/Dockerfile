FROM node:20

WORKDIR /usr/src/app

# Copiar package.json y lock
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código (ignora node_modules/dist/generated gracias a .dockerignore)
COPY . .

# Generar Prisma Client dentro del contenedor
RUN npx prisma generate

EXPOSE 3000

# Entry point: primero migraciones, luego hot reload
CMD npx prisma migrate dev --name init --skip-seed && npm run start:dev
