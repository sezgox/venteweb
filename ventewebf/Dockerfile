# Usa una imagen base de Node, que incluye npm.
FROM node:20-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de configuración de dependencias (package.json y package-lock.json)
# Esto permite que Docker cachee la capa de instalación si estos archivos no cambian.
COPY package*.json ./

# Instala las dependencias.
# Si tu proyecto usa @angular/cli globalmente, deberías instalarlo aquí,
# pero la práctica moderna es usarlo localmente (npm run start).
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Expone el puerto por defecto de ng serve
EXPOSE 4200

# Define el comando para ejecutar la aplicación en modo desarrollo.
# Es crucial usar '--host 0.0.0.0' para que el servidor escuche
# en todas las interfaces y sea accesible desde el host fuera del contenedor.
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0"]
