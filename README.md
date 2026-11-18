# ToDoApp - Docker Project

Aplicación de gestión de tareas con frontend web, API REST en Node.js/Express y PostgreSQL. Docker Compose orquesta los dos contenedores en una red privada y conserva los datos en un volumen nombrado.

## Estructura del proyecto

```text
.
├── .github/workflows/ci.yml
├── Jenkinsfile
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

## Integración Continua con Jenkins (Entrega 2)

### Infraestructura

Ejecuta Jenkins como contenedor con la imagen `jenkins/jenkins:lts`, un volumen persistente `jenkins_home` y acceso al socket Docker del host. El agente que ejecuta el pipeline también necesita Docker CLI y Docker Compose v2; la imagen oficial de Jenkins no los incluye por defecto. Por ejemplo, en un host Linux:

```sh
docker run -d --name jenkins --restart unless-stopped \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --add-host=host.docker.internal:host-gateway \
  jenkins/jenkins:lts
```

El mapeo `host.docker.internal` permite que el agente Jenkins consulte el puerto publicado por Compose. El usuario Jenkins debe tener permisos para usar el socket Docker.

### Plugins y credenciales

Instala los plugins **Git**, **Pipeline**, **Docker Pipeline** y **Pipeline: Stage View**. Configura en Jenkins credenciales de tipo **Secret text** con estos IDs; sus valores deben corresponder a las credenciales de la base de datos:

- `todoapp-db-user`
- `todoapp-db-password`
- `todoapp-db-name`

El `Jenkinsfile` inyecta esos valores con `credentials()` y configura `DB_HOST=db`, `DB_PORT=5432`, `COMPOSE_PROJECT_NAME=todoapp-ci` y `APP_PORT=3001`. El puerto `3001` se publica en el host para las pruebas; el backend continúa escuchando en el puerto interno `3000`.

### Pipeline y disparador

Configura un Pipeline desde SCM para que Jenkins lea el `Jenkinsfile` de la raíz del repositorio. Sus etapas son:

1. **Checkout**: descarga el código y muestra el commit actual.
2. **Build**: obtiene la imagen de PostgreSQL y construye sin caché la imagen del backend.
3. **Test**: levanta el entorno Compose, espera hasta 30 segundos a que ambos contenedores estén saludables y la API responda, comprueba la resolución DNS del servicio `db` y realiza pruebas HTTP de creación y lectura de una tarea.
4. **post**: imprime los logs si falla, confirma el resultado si tiene éxito y siempre detiene los contenedores y elimina las redes y volúmenes de prueba con `docker compose down -v`.

El disparador `Poll SCM` está configurado con `* * * * *`: Jenkins consulta el repositorio cada minuto y ejecuta el pipeline cuando detecta cambios.
