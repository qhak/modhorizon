import org.gradle.api.initialization.resolve.RepositoriesMode
import org.gradle.util.GradleVersion

// Server-owned template. Never replace this file with generated model output.
check(GradleVersion.current() == GradleVersion.version("8.14.5")) {
    "This scaffold expects a provisioned Gradle 8.14.5 distribution."
}

val allowedVersions = setOf(
    "1.21.1", "1.21.2", "1.21.3", "1.21.4", "1.21.5",
    "1.21.6", "1.21.7", "1.21.8", "1.21.9", "1.21.10", "1.21.11"
)
val minecraftVersion = providers.gradleProperty("minecraftVersion").orNull
require(minecraftVersion != null && minecraftVersion in allowedVersions) {
    "minecraftVersion must be one of the server-supported Paper 1.21.x versions."
}

rootProject.name = "GeneratedPlugin"

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
        maven("https://repo.papermc.io/repository/maven-public/")
    }
}
