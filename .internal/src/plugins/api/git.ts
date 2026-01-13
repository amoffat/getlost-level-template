import { execa } from "execa";
import express from "express";
import { resolve } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");

export const router = express.Router({ mergeParams: true });

// POST endpoint to add, commit, and push level changes
router.post("/publish", async (req, res) => {
  try {
    // Get list of currently staged files
    const { stdout: stagedFiles } = await execa(
      "git",
      ["diff", "--staged", "--name-only"],
      { cwd: repoDir }
    );
    const previouslyStaged = stagedFiles
      .split("\n")
      .filter((f) => f.trim().length > 0);

    // Unstage everything
    await execa("git", ["reset", "HEAD"], { cwd: repoDir });

    // Stage only the level directory
    await execa("git", ["add", "level"], { cwd: repoDir });

    // Commit with TBD message
    const commitMessage = "TBD: Update level";
    await execa("git", ["commit", "--allow-empty", "-m", commitMessage], {
      cwd: repoDir,
    });

    // Restage previously staged files
    if (previouslyStaged.length > 0) {
      await execa("git", ["add", ...previouslyStaged], { cwd: repoDir });
    }

    // Get current branch name
    const { stdout: currentBranch } = await execa(
      "git",
      ["branch", "--show-current"],
      {
        cwd: repoDir,
      }
    );

    // Push to the current branch using porcelain format
    await execa("git", ["push", "origin", currentBranch], {
      cwd: repoDir,
    });

    res.json({
      success: true,
      message: "Level changes published successfully",
      branch: currentBranch,
    });
  } catch (error: any) {
    console.error("Git publish error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to publish level changes",
    });
  }
});
