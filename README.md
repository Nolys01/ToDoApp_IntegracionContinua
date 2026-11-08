# ToDoApp - Docker Project

Aplicación de tareas con una interfaz web estática, una API REST en Node.js/Express y PostgreSQL. Docker Compose orquesta los dos contenedores y conserva las tareas en un volumen nombrado.

## Requisitos

- Docker Engine y Docker Compose v2.
- Puerto `3000` disponible en el equipo.

## Configuración y ejecución

1. Copia `.env.example` a `.env` en la raíz del proyecto. El archivo `.env` incluido sirve para desarrollo local; cambia `DB_PASSWORD` antes de usarlo en un entorno compartido.
2. Desde la raíz del proyecto, ejecuta:

   ```sh
   docker compose up -d --build
   ```

3. Abre [http://localhost:3000](http://localhost:3000) en el navegador.

Compose espera a que PostgreSQL pase su healthcheck antes de iniciar el backend. Al arrancar, el backend crea la tabla `todos` si aún no existe.

## API

- `GET /todos`: devuelve las tareas en orden de creación.
- `POST /todos`: crea una tarea. Envía JSON como `{"title":"Preparar entrega"}`.
- `GET /health`: informa el estado de la API, la conexión con PostgreSQL y el host de la base de datos.

## Persistencia y mantenimiento

Los datos se guardan en el volumen Docker `pgdata` y sobreviven al reinicio o recreación de los contenedores. Para detener la aplicación sin borrar los datos:

```sh
docker compose down
```

Para borrar también los datos persistidos, ejecuta `docker compose down -v`.

## Variables de entorno

La aplicación requiere `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `DB_PORT`. El host predeterminado para la red de Compose es `db`. Usa `.env.example` como plantilla; no compartas ni confirmes el archivo `.env`.
