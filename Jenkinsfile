pipeline {
  agent any

  triggers {
    pollSCM('* * * * *')
  }

  environment {
    DB_USER = credentials('todoapp-db-user')
    DB_PASSWORD = credentials('todoapp-db-password')
    DB_NAME = credentials('todoapp-db-name')
    DB_HOST = 'db'
    DB_PORT = '5432'
    COMPOSE_PROJECT_NAME = 'todoapp-ci'
    APP_PORT = '3001'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git log -1 --oneline'
      }
    }

    stage('Build') {
      steps {
        sh 'docker compose pull db'
        sh 'docker compose build --no-cache backend'
      }
    }

    stage('Test') {
      steps {
        sh 'docker compose up -d'
        sh '''
          set -eu
          API_URL="http://host.docker.internal:${APP_PORT}"
          deadline=$(( $(date +%s) + 30 ))
          ready=false

          while [ "$(date +%s)" -lt "$deadline" ]; do
            backend_id=$(docker compose ps -q backend)
            db_id=$(docker compose ps -q db)

            if [ -n "$backend_id" ] && [ -n "$db_id" ]; then
              backend_health=$(docker inspect --format='{{.State.Health.Status}}' "$backend_id" 2>/dev/null || true)
              db_health=$(docker inspect --format='{{.State.Health.Status}}' "$db_id" 2>/dev/null || true)
              if [ "$backend_health" = "healthy" ] &&
                 [ "$db_health" = "healthy" ] &&
                 curl -sf --max-time 1 "$API_URL/health" >/dev/null; then
                ready=true
                break
              fi
            fi

            sleep 1
          done

          if [ "$ready" != "true" ]; then
            echo "La API o los contenedores no estuvieron saludables dentro de 30 segundos."
            docker compose ps
            exit 1
          fi
        '''
        sh '''docker compose exec -T backend node -e "require('dns').lookup(process.env.DB_HOST, (err, addr) => { if (err) process.exit(1); console.log('DNS OK:', process.env.DB_HOST, '->', addr); })"'''
        sh '''
          set -eu
          API_URL="http://host.docker.internal:${APP_PORT}"
          http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/todos" \
            -H "Content-Type: application/json" \
            -d '{"title":"Prueba automatizada Jenkins"}')

          if [ "$http_code" != "201" ]; then
            echo "Se esperaba HTTP 201 al crear la tarea; se recibió HTTP $http_code."
            exit 1
          fi

          todos=$(curl -sf "$API_URL/todos")
          if ! printf '%s' "$todos" | grep -Fq '"Prueba automatizada Jenkins"'; then
            echo "La tarea creada no apareció en la respuesta de GET /todos."
            exit 1
          fi
        '''
      }
    }
  }

  post {
    failure {
      echo 'El pipeline falló; se recopilan los logs de Docker Compose antes de limpiar.'
      sh 'docker compose logs --no-color || echo "No se pudieron obtener los logs de Docker Compose."'
    }
    success {
      echo 'Build, comunicación entre contenedores y pruebas CRUD completados correctamente.'
    }
    always {
      sh '''
        if [ -f docker-compose.yml ]; then
          docker compose down -v --remove-orphans
        fi
      '''
    }
  }
}
