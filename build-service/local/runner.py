"""Runs only inside the restricted, offline Docker job. Never executes the plugin."""
import base64
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import threading
import zipfile

MAX_BODY = 200_000
JAVA_PATH = re.compile(r"src/main/java/(?:[A-Za-z_][A-Za-z0-9_]*/)*[A-Za-z_][A-Za-z0-9_]*\.java")
RESOURCES = {"src/main/resources/plugin.yml", "src/main/resources/config.yml"}


def validate(payload):
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 1 or payload.get("platform") != "paper" or payload.get("minecraftVersion") != "1.21.4" or payload.get("javaVersion") != 21:
        raise ValueError("Local builder currently supports Paper 1.21.4 / Java 21 only.")
    project = payload.get("project")
    if not isinstance(project, dict) or not isinstance(project.get("files"), list) or not 1 <= len(project["files"]) <= 30:
        raise ValueError("Invalid project files.")
    seen = set()
    total = 0
    for item in project["files"]:
        if not isinstance(item, dict):
            raise ValueError("Invalid source entry.")
        path, content = item.get("path"), item.get("content")
        if not isinstance(path, str) or not (JAVA_PATH.fullmatch(path) or path in RESOURCES) or path in seen:
            raise ValueError("Source path is not allowed.")
        if not isinstance(content, str) or len(content) > 40_000 or "\x00" in content:
            raise ValueError("Source content is invalid.")
        total += len(content.encode("utf-8"))
        seen.add(path)
    if total > 150_000 or "src/main/resources/plugin.yml" not in seen or not any(JAVA_PATH.fullmatch(path) for path in seen):
        raise ValueError("Project is missing required sources or is too large.")
    return project["files"]


def build(payload):
    files = validate(payload)
    root = Path("/work/project")
    root.mkdir()
    for name in ("build.gradle.kts", "settings.gradle.kts"):
        shutil.copyfile(Path("/opt/template") / name, root / name)
    shutil.copytree("/opt/gradle-cache", "/work/gradle-home")
    shutil.copytree("/opt/project-cache", root / ".gradle")
    for item in files:
        target = root / item["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(item["content"], encoding="utf-8")
    command = ["gradle", "--offline", "--no-daemon", "--max-workers=1", "-Dorg.gradle.java.installations.auto-download=false", "-Dorg.gradle.jvmargs=-Xmx512m -XX:MaxMetaspaceSize=256m", "-PminecraftVersion=1.21.4", "clean", "jar"]
    output = bytearray()
    with subprocess.Popen(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True) as proc:
        def drain():
            while True:
                chunk = proc.stdout.read(4096)
                if not chunk:
                    break
                output.extend(chunk[:max(0, 160_000 - len(output))])
        reader = threading.Thread(target=drain, daemon=True)
        reader.start()
        try:
            proc.wait(timeout=75)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
            return {"success": False, "logs": ["Compilation exceeded the 75-second deadline."]}
        finally:
            reader.join(timeout=2)
    logs = [line[:2000] for line in output.decode("utf-8", errors="replace").splitlines()[-95:]]
    if proc.returncode != 0:
        return {"success": False, "logs": logs or ["Compilation failed."]}
    artifact = root / "build/libs/plugin.jar"
    if not artifact.is_file() or artifact.stat().st_size > 5_000_000:
        raise ValueError("Compiler did not produce a bounded plugin JAR.")
    with zipfile.ZipFile(artifact) as archive:
        entries = archive.infolist()
        if len(entries) > 2000 or sum(entry.file_size for entry in entries) > 20_000_000 or "plugin.yml" not in archive.namelist() or not any(entry.filename.endswith(".class") for entry in entries) or archive.testzip() is not None:
            raise ValueError("Compiler produced an invalid JAR.")
    return {"success": True, "logs": logs + ["Compiled offline in a disposable container. Gameplay has not been tested."], "artifactBase64": base64.b64encode(artifact.read_bytes()).decode("ascii")}


if __name__ == "__main__":
    try:
        raw = sys.stdin.buffer.read(MAX_BODY + 1)
        if len(raw) > MAX_BODY:
            raise ValueError("Build request exceeds 200 KB.")
        result = build(json.loads(raw))
    except Exception as error:
        result = {"success": False, "logs": [str(error)[:1000]]}
    print(json.dumps(result))
