import { shaderCompilerServer, compileShader } from "./compiler-server";
shaderCompilerServer(process.env.SHADER_COMPILER_TOKEN || "", compileShader, process.env.SHADER_COMPILER_PYTHON || "python")
  .listen(3231, "127.0.0.1", () => console.log("Private raw GLSL compiler ready on loopback:3231; Iris rendering is not verified."));
