plugins {
    java
}

// The worker supplies this validated property; generated source cannot set it.
val minecraftVersion = providers.gradleProperty("minecraftVersion").get()

group = "dev.modhorizon.generated"
version = "1.0.0"

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}

dependencies {
    compileOnly("io.papermc.paper:paper-api:$minecraftVersion-R0.1-SNAPSHOT")
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.release.set(21)
    // Untrusted Java must not trigger classpath annotation processors.
    options.compilerArgs.add("-proc:none")
}

tasks.jar {
    archiveFileName.set("plugin.jar")
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
}
