# Private local Paper builder

This is a loopback-only testing service for **Paper 1.21.4 / Java 21**. It does not expose your PC to the live Cloudflare site. Use the local ModHorizon preview with it. Other platforms and versions remain unsupported until separate dependency images are provisioned and verified.

## Setup

1. Install Docker Desktop from https://docs.docker.com/desktop/setup/install/windows-install/. Choose per-user installation and WSL 2. Open it, review its terms and finish setup. Docker's Linux engine must be running.
2. From the repository folder, run `npm run setup:local-builder`. It saves a random builder credential and loopback endpoint in ignored `.dev.vars`, preserving provider keys.
3. Run `npm run prepare:local-builder`. This builds a trusted Java/Gradle image and resolves only the server-owned Paper dependencies. The Docker context excludes private files. This step requires Internet access and disk space; generated source is not involved.
4. Run `npm run check:local-builder` to prove offline compilation and rejection of invalid Java. It saves an example JAR under ignored `.data/compiler-check/`; no AI call is made.
5. Run `npm run local:builder` in one terminal.
6. Run `npm run local:preview` in another terminal and open http://127.0.0.1:3215/create. Select Plugin, Paper, 1.21.4 and Luna. The preview uses local billing data, so its balance is separate from your live account.

Use the application's Files/Build/Test tabs and download button to inspect the JAR and installation guide. A successful compile is not proof that gameplay works or that a plugin is safe. Test on a disposable local Minecraft server.

## Isolation

The HTTP front end binds 127.0.0.1:3230, requires bearer authentication, checks Host/Origin, admits one job at a time, and caps request size and read time. Both the service and container independently validate submitted paths. No submitted Gradle scripts or dependency definitions are admitted.

Every job starts a fresh nonroot Docker container with networking disabled, read-only root, no host mounts, no Docker socket, no app/API secrets, dropped capabilities, no new privileges, one CPU, 2 GiB memory/swap ceiling, a process limit and bounded temporary filesystems. The immutable Gradle template disables annotation processing and compiles offline from a prewarmed cache. Compilation has a 75-second deadline; the host forcibly removes a container at 100 seconds or excessive output. Jobs never run the generated plugin.

The local service cannot be used as a public build endpoint. Do not create a public tunnel to it or add its loopback URL to Cloudflare production secrets. Shut it down when testing ends.

## Validation status

HTTP/validation/isolation tests can run without Docker. Actual image preparation, offline compilation, JAR contents and timeout cleanup require a running Docker installation. Until those succeed, the builder is prepared source code, not a verified working compiler.
