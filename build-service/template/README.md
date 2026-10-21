# Server-owned Gradle template

This is a build definition for a future isolated worker, not a worker or a sandbox. The Next.js application does not execute it. No wrapper binary, container runner, dependency cache, or compiler environment is included. It has not been compiled or used to produce a verified JAR in this repository.

The scaffold pins **Gradle 8.14.5** and Java 21, uses only the built-in Java plugin, and admits every Paper 1.21 patch from 1.21.1 through 1.21.11. Version admission happens in the immutable settings file before the dependency coordinate is built. Annotation processing is disabled. Only project Java classes and resources enter `build/libs/plugin.jar`; Paper remains a `compileOnly` dependency provided by the server.

The [Gradle 8.14.5 release notes](https://docs.gradle.org/8.14.5/release-notes.html) include the repository-security fixes from 8.14.4; Gradle's [published security overview](https://blog.gradle.org/gradle-security-subscription) identifies 8.14.5 as a maintained patched baseline. Review [Gradle security advisories](https://github.com/gradle/gradle/security/advisories) again before production provisioning. Keep the approved distribution immutable and verify its published checksum. A toolchain update must update the settings check and worker image together.

The worker must copy these server-owned files into a fresh job directory and add only validated `src/main/java/` and supported resource files. Do not accept user `settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`, init scripts, wrapper files, dependency declarations, or additional classpath entries. Never mount the host's Gradle home or inject host/user Gradle configuration. Supply the selected version from the validated job request, not generated text.

During a separate trusted provisioning step, resolve the allowlisted Paper API and its vetted transitive dependencies into a versioned cache, including Gradle's Kotlin DSL caches. Freeze cache contents and dependency checksums. Paper's snapshot coordinates alone are not immutable pins. The repository URLs exist for this controlled preparation step; they do not authorize build-time network access.

Inside the provisioned, secret-free, network-disabled sandbox, the intended invocation is:

```text
gradle --offline --no-daemon --max-workers=1 -Dorg.gradle.java.installations.auto-download=false -PminecraftVersion=1.21.4 clean jar
```

The worker must supply the approved Gradle binary, Java 21 installation, isolated Gradle home and vetted caches. Never run this command on untrusted source on the web host. Resource limits, process-tree deadlines, source path checks, output validation and cleanup are the worker's responsibility. `--offline`, `--no-daemon` and this template do not themselves provide isolation. See [the required architecture](../../docs/architecture.md) and [the HTTP build protocol](../../docs/backend.md).
