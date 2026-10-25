import unittest
from runner import validate


class RunnerValidation(unittest.TestCase):
    def payload(self):
        return {"schemaVersion": 1, "platform": "paper", "minecraftVersion": "1.21.4", "javaVersion": 21,
                "project": {"files": [{"path": "src/main/java/dev/example/Example.java", "content": "class Example {}"},
                                      {"path": "src/main/resources/plugin.yml", "content": "name: Example"}]}}

    def test_valid_source(self):
        self.assertEqual(len(validate(self.payload())), 2)

    def test_path_script_duplicate_and_size_rejected(self):
        for path in ["../escape.java", "build.gradle.kts", "/tmp/evil", "src/main/java/a/../../evil.java"]:
            value = self.payload()
            value["project"]["files"].append({"path": path, "content": "text"})
            with self.assertRaises(ValueError):
                validate(value)
        value = self.payload()
        value["project"]["files"].append(value["project"]["files"][0])
        with self.assertRaises(ValueError):
            validate(value)
        value = self.payload()
        value["project"]["files"][0]["content"] = "x" * 40_001
        with self.assertRaises(ValueError):
            validate(value)

    def test_unprepared_version_and_wrong_platform_rejected(self):
        for key, value in [("minecraftVersion", "1.21.11"), ("platform", "forge"), ("javaVersion", 17)]:
            payload = self.payload()
            payload[key] = value
            with self.assertRaises(ValueError):
                validate(payload)


if __name__ == "__main__":
    unittest.main()
