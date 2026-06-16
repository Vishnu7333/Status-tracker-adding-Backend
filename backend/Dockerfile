# Build stage using Maven and JDK 21
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml and resolve dependencies to cache them
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy sources and package the jar
COPY src ./src
RUN mvn package -DskipTests

# Runtime stage using JRE 21
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
