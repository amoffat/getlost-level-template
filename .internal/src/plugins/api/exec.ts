import { execa } from "execa";
import express from "express";
import { extname, resolve } from "path";

const internalDir = process.cwd();
const scriptsDir = resolve(internalDir, "scripts");

export const router = express.Router({ mergeParams: true });

// Map file extensions to interpreters
const interpreterMap: Record<string, string> = {
  ".sh": "bash",
  ".py": "python",
  ".ts": "tsx",
};

interface ScriptResponse {
  error?: string;
  stdout?: string;
  stderr?: string;
}

// POST endpoint to execute a script from the scripts directory
router.post("/:scriptName", async (req, res) => {
  let statusCode = 500;
  let responseData: ScriptResponse = {};

  try {
    const { scriptName } = req.params;
    const scriptPath = resolve(scriptsDir, scriptName);

    // Security check: ensure the script is within the scripts directory
    if (!scriptPath.startsWith(scriptsDir + "/")) {
      statusCode = 403;
      responseData.error =
        "Access denied: script must be within the scripts directory";
      return res.status(statusCode).json(responseData);
    }

    // Get the file extension
    const ext = extname(scriptName);
    const interpreter = interpreterMap[ext];

    if (!interpreter) {
      statusCode = 400;
      responseData.error = `Unsupported script type: ${ext}. Supported types: ${Object.keys(interpreterMap).join(", ")}`;
      return res.status(statusCode).json(responseData);
    }

    // Get arguments from request body (can be an array or object)
    const args = req.body.args || [];
    const argsArray = Array.isArray(args) ? args : [args];

    // Execute the script
    console.log(
      `Executing script: ${scriptPath} with args: ${argsArray.join(" ")}`,
    );
    const result = await execa(interpreter, [scriptPath, ...argsArray], {
      cwd: internalDir,
      env: { ...process.env, ...req.body.env },
      reject: false,
    });
    console.log("Script execution completed:", {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });

    // Check exit code
    if (result.exitCode !== 0) {
      statusCode = 500;
      responseData = {
        error: `Script exited with code ${result.exitCode}`,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } else {
      statusCode = 200;
      responseData = {
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }
  } catch (error: any) {
    console.error("Script execution error:", error);
    statusCode = 500;
    responseData = {
      error: error.message || "Failed to execute script",
      stdout: error.stdout,
      stderr: error.stderr,
    };
  }

  return res.status(statusCode).json(responseData);
});
