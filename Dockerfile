# ==============================================================================
# Issue Pilot - Production Multi-Stage Dockerfile
# Stage 1: Compile Native C++ Ranking Engine (C++20, utf8proc)
# Stage 2: Compile Spring Boot Application (Java 21, Maven)
# Stage 3: Minimal Eclipse Temurin JRE 21 Runtime Container
# ==============================================================================

# --- Stage 1: Build Native C++ Ranking Engine ---
FROM gcc:13-bookworm AS cpp-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build/ranking_engine
COPY ranking_engine/CMakeLists.txt ./
COPY ranking_engine/include ./include
COPY ranking_engine/src ./src
COPY ranking_engine/tests ./tests

RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --config Release \
    && ctest --test-dir build --output-on-failure

# --- Stage 2: Build Spring Boot Application JAR ---
FROM maven:3.9.9-eclipse-temurin-21 AS jar-builder

WORKDIR /build
COPY pom.xml ./
# Pre-download dependencies for Docker layer caching
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# --- Stage 3: Minimal Production Runtime ---
FROM eclipse-temurin:21-jre-jammy AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy C++ ranking engine binary
COPY --from=cpp-builder /build/ranking_engine/build/issue_pilot_ranking_engine /app/ranking_engine/build/issue_pilot_ranking_engine
RUN chmod +x /app/ranking_engine/build/issue_pilot_ranking_engine

# Copy executable Spring Boot JAR
COPY --from=jar-builder /build/target/issue-pilot-*.jar /app/issue-pilot.jar

# Production runtime configuration
ENV SERVER_PORT=8000 \
    PORT=8000 \
    CPP_ENGINE_PATH=/app/ranking_engine/build/issue_pilot_ranking_engine

EXPOSE 8000

# Health check against Spring Boot actuator / API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8000} -Djava.security.egd=file:/dev/./urandom -jar /app/issue-pilot.jar"]
