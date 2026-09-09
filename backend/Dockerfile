# syntax=docker/dockerfile:1

# ============================================================
# ETAPA 1 - BUILD DO BACKEND
# ============================================================
FROM maven:3.9.9-eclipse-temurin-23 AS build

WORKDIR /app

COPY pom.xml .

RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src

RUN mvn -B -DskipTests clean package


# ============================================================
# ETAPA 2 - EXECUCAO
# ============================================================
FROM eclipse-temurin:23-jre

WORKDIR /app

# curl e utilizado exclusivamente pelo healthcheck do container.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build \
    /app/target/backend-0.0.1-SNAPSHOT.jar \
    /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]