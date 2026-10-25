FROM gradle:8.14.5-jdk21@sha256:c3dbf585165204a35635e0d6c4c15bc8f9b1effe787f18ded27805e1766992b5
USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
COPY build-service/template/build.gradle.kts build-service/template/settings.gradle.kts /work/project/
COPY build-service/local/runner.py /opt/modhorizon/runner.py
RUN mkdir -p /work/project/src/main/java/dev/modhorizon /work/project/src/main/resources \
 && printf 'package dev.modhorizon; public class Bootstrap extends org.bukkit.plugin.java.JavaPlugin {}' > /work/project/src/main/java/dev/modhorizon/Bootstrap.java \
 && printf 'name: Bootstrap\nversion: 1.0\nmain: dev.modhorizon.Bootstrap\napi-version: 1.21\n' > /work/project/src/main/resources/plugin.yml
WORKDIR /work/project
# Resolve trusted dependencies once, before any generated source is submitted.
RUN gradle --no-daemon --max-workers=1 -g /opt/gradle-cache -Dorg.gradle.java.installations.auto-download=false -PminecraftVersion=1.21.4 clean jar \
 && mkdir -p /opt/template \
 && cp build.gradle.kts settings.gradle.kts /opt/template/ \
 && cp -r .gradle /opt/project-cache \
 && rm -rf /work/project \
 && chmod -R a+rX /opt/gradle-cache /opt/project-cache /opt/template /opt/modhorizon
USER 1000:1000
WORKDIR /work
ENV GRADLE_USER_HOME=/work/gradle-home
ENTRYPOINT ["python3", "/opt/modhorizon/runner.py"]
