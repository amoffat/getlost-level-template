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

// POST endpoint to execute a script from the scripts directory
router.post("/:scriptName", async (req, res) => {
  try {
    const { scriptName } = req.params;
    const scriptPath = resolve(scriptsDir, scriptName);

    // Security check: ensure the script is within the scripts directory
    if (!scriptPath.startsWith(scriptsDir + "/")) {
      return res.status(403).json({
        success: false,
        error: "Access denied: script must be within the scripts directory",
      });
    }

    // Get the file extension
    const ext = extname(scriptName);
    const interpreter = interpreterMap[ext];

    if (!interpreter) {
      return res.status(400).json({
        success: false,
        error: `Unsupported script type: ${ext}. Supported types: ${Object.keys(interpreterMap).join(", ")}`,
      });
    }

    // Get arguments from request body (can be an array or object)
    const args = req.body.args || [];
    const argsArray = Array.isArray(args) ? args : [args];

    // Execute the script
    const { stdout, stderr } = await execa(
      interpreter,
      [scriptPath, ...argsArray],
      {
        cwd: internalDir,
        env: { ...process.env, ...req.body.env },
      },
    );

    res.json({
      success: true,
      stdout,
      stderr,
      script: scriptName,
    });
  } catch (error: any) {
    console.error("Script execution error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute script",
      stdout: error.stdout,
      stderr: error.stderr,
    });
  }
});
