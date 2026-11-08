# ToDoApp - Docker Project

Aplicación de gestión de tareas con frontend web, API REST en Node.js/Express y PostgreSQL. Docker Compose orquesta los dos contenedores en una red privada y conserva los datos en un volumen nombrado.

## Estructura del proyecto

```text
.
├── .github/workflows/ci.yml
├── backend/
│   ├── public/index.html
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Requisitos

- Git.
- Docker Engine con Docker Compose v2.
- Puerto `3000` disponible en el equipo.

## Clonar, configurar y ejecutar

Clona el repositorio y entra al directorio del proyecto:

```sh
git clone https://github.com/Nolys01/ToDoApp_IntegracionContinua.git
cd ToDoApp_IntegracionContinua
```

Crea el archivo local de variables de entorno desde la plantilla. En PowerShell:

```powershell
Copy-Item .env.example .env
```

En Linux o macOS:

```sh
cp .env.example .env
```

El `.env.example` usa credenciales de demostración no destinadas a producción. Para un entorno compartido, cambia `DB_PASSWORD` por un valor fuerte y no agregues `.env` a Git.

Construye la imagen e inicia ambos contenedores desde la raíz del proyecto:

```sh
docker compose up -d --build
```

Comprueba que los servicios estén levantados y que PostgreSQL figure como `healthy`:

```sh
docker compose ps
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador. El backend espera a que el healthcheck de PostgreSQL pase antes de iniciar. El nombre de host de la base de datos dentro de la red Compose es `db`.

## API y pruebas CRUD

La API ofrece estos endpoints:

| Método | Ruta | Acción |
|---|---|---|
| `GET` | `/todos` | Lista las tareas en orden descendente por ID. |
| `POST` | `/todos` | Crea una tarea con `{"title":"..."}`. |
| `PUT` | `/todos/:id` | Actualiza `title`, `completed` o ambos. |
| `DELETE` | `/todos/:id` | Elimina la tarea indicada. |
| `GET` | `/health` | Confirma el estado del servicio y la conexión a la base de datos. |

Prueba la conexión a PostgreSQL:

```sh
curl -i http://localhost:3000/health
```

Crea una tarea y lista las tareas. En la respuesta del `POST`, anota el `id` devuelto:

```sh
curl -i -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d "{\"title\":\"Preparar entrega\"}"
curl -i http://localhost:3000/todos
```

Usa el ID obtenido en el POST en las siguientes peticiones, reemplazando `1` por ese valor:

```sh
curl -i -X PUT http://localhost:3000/todos/1 -H "Content-Type: application/json" -d "{\"completed\":true}"
curl -i -X PUT http://localhost:3000/todos/1 -H "Content-Type: application/json" -d "{\"title\":\"Entrega revisada\"}"
curl -i -X DELETE http://localhost:3000/todos/1
```

En PowerShell, usa `curl.exe` para invocar el ejecutable de curl:

```powershell
curl.exe -i http://localhost:3000/health
curl.exe -i -X POST http://localhost:3000/todos -H "Content-Type: application/json" --data-raw '{"title":"Preparar entrega"}'
curl.exe -i http://localhost:3000/todos
curl.exe -i -X PUT http://localhost:3000/todos/1 -H "Content-Type: application/json" --data-raw '{"completed":true}'
curl.exe -i -X PUT http://localhost:3000/todos/1 -H "Content-Type: application/json" --data-raw '{"title":"Entrega revisada"}'
curl.exe -i -X DELETE http://localhost:3000/todos/1
```

Reemplaza `1` en las solicitudes `PUT` y `DELETE` por el ID devuelto al crear la tarea.

## Persistencia y mantenimiento

PostgreSQL guarda sus datos en el volumen nombrado `pgdata`, que persiste al detener o recrear los contenedores:

```sh
docker compose down
docker compose up -d
```

Para detener los servicios y eliminar también el volumen con los datos:

```sh
docker compose down -v
```

> `docker compose down -v` elimina permanentemente los datos de la base de datos.

## Variables de entorno

La aplicación obtiene sus credenciales de `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`. Compose fija `DB_HOST=db`, el nombre DNS del servicio PostgreSQL; el puerto interno de PostgreSQL es `5432`. El archivo `.env` es local y está excluido de Git.

## Integración continua

El workflow de GitHub Actions en `.github/workflows/ci.yml` se ejecuta en `push` y `pull_request` dirigidos a `main`. Prepara `.env` desde la plantilla, construye la imagen, inicia Compose, consulta `/health` y detiene los servicios al terminar.
