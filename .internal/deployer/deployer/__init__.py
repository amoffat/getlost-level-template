import argparse
import json
import string
import subprocess
import tarfile
import tempfile
from pathlib import Path
from typing import Any, Optional, TypedDict

import jwt
import requests
import urllib3
from urllib3.exceptions import InsecureRequestWarning

# suppress InsecureRequestWarning from requests
urllib3.disable_warnings(InsecureRequestWarning)

THIS_DIR = Path(__file__).resolve().parent
INTERNAL_DIR = THIS_DIR.parent.parent
API_URLS = {
    "local": "http://getlost-api:3000",
    "qa": "https://api.qa.getlost.gg",
    "prod": "https://api.getlost.gg",
}
GAME_URLS = {
    "qa": "https://qa.getlost.gg",
    "prod": "https://getlost.gg",
}
API: str | None = None

# This is where we will fetch the WASM binary from. We rely on our
# assemblyscript vite plugin to do the compilation and serve the WASM file.
WASM_SERVER_BASE_URL = "https://localhost:5173"


def put_level(
    *,
    api_auth_jwt: str,
    github_auth_token: str,
    level_id: str,
    commit: str,
    assets,
) -> str:
    # Step 1: Request presigned upload URL
    path = f"/v1/levels/{level_id}/upload-url"
    api_url = f"{API}{path}"

    resp = requests.post(
        api_url,
        headers={
            "Authorization": f"Bearer {api_auth_jwt}",
        },
        json={
            "githubToken": github_auth_token,
        },
        verify=False,
    )
    try:
        resp.raise_for_status()
    except requests.HTTPError as e:
        raise requests.HTTPError(
            f"{e}\nResponse body: {resp.text}", response=resp
        ) from e

    data = resp.json()
    upload_url = data["url"]
    fields = data["fields"]

    assets.seek(0)
    files = {
        "file": ("assets.tar.gz", assets, "application/gzip"),
    }
    multipart_data = fields.copy()
    resp2 = requests.post(
        upload_url,
        data=multipart_data,
        files=files,
    )
    try:
        resp2.raise_for_status()
    except requests.HTTPError as e:
        raise requests.HTTPError(
            f"{e}\nResponse body: {resp2.text}", response=resp2
        ) from e

    return f"{level_id}-{commit}"


def collect_wasm(*, tar: tarfile.TarFile, metadata: Any):
    """Compile WASM using the TypeScript CLI and add main.wasm to the provided
    tarfile handle."""
    import tempfile

    temp_dir = tempfile.TemporaryDirectory()
    out_dir = Path(temp_dir.name)
    script_dir = (INTERNAL_DIR / "scripts").resolve()
    compile_script = script_dir / "compile-wasm.ts"
    # Use npx tsx to run the script, passing the output directory
    result = subprocess.run(
        [
            "npx",
            "tsx",
            str(compile_script),
            "--release",
            "--outDir",
            str(out_dir),
            "--metadata",
            json.dumps(metadata),
        ],
        cwd=str(script_dir),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        raise RuntimeError("WASM compilation failed")

    # Add the output WASM file to the tarfile
    wasm_path = out_dir / "main.wasm"
    tar.add(wasm_path, arcname="main.wasm")
    temp_dir.cleanup()


def collect_art(level_dir: Path, tar: tarfile.TarFile):
    """Add all files in LEVEL_DIR to the provided tarfile handle using pathlib.Path."""
    for file_path in level_dir.rglob("*"):
        if file_path.is_file():
            arcname = f"level/{file_path.relative_to(level_dir)}"
            tar.add(str(file_path), arcname=arcname)


class Level(TypedDict):
    id: str
    repo: str
    commit: str
    name: str
    path: str
    mainEntrance: Optional[str]


def poll_job(
    jwt: str,
    job_id: str,
    level_id: str,
    timeout: float = 60,
) -> Level:
    """
    Polls the publish job status endpoint until completion, failure, or timeout.
    Args:
        job_id (str): The job ID to poll.
        level_id (str): The level ID associated with the job.
        total_time (float): The total time in seconds to poll before timing out.
    Raises:
        RuntimeError: If the job fails, with the error message from the API.
        requests.HTTPError: If the API call fails for any other reason.
    Returns:
        None: If the job completes successfully.
    """
    import time

    start = time.time()
    poll_interval = 2.0  # seconds
    path = f"/v1/levels/{level_id}/publish-jobs/{job_id}"
    api_url = f"{API}{path}"

    while True:
        resp = requests.get(
            api_url,
            headers={"Authorization": f"Bearer {jwt}"},
            verify=False,
        )
        resp.raise_for_status()
        data = resp.json()
        print("Got job status:", data)

        status = data["job"]["status"]
        if status == "completed":
            return data["level"]

        elif status == "failed":
            error_msg = data["job"].get("errorMessage", "Unknown error")
            raise RuntimeError(error_msg)

        if time.time() - start > timeout:
            raise TimeoutError(f"Polling timed out after {timeout} seconds.")

        time.sleep(poll_interval)


def main():
    parser = argparse.ArgumentParser(description="Create a new level in the game.")
    parser.add_argument(
        "--env",
        default="qa",
        choices=["qa", "prod", "local"],
        help="Environment to deploy to (default: qa)",
    )
    parser.add_argument(
        "--jwt",
        required=True,
        help="JWT token for authentication to GetLost API",
    )

    # It's not a jwt
    parser.add_argument(
        "--github-token",
        required=True,
        help="GitHub token for authentication to Github API",
    )
    parser.add_argument(
        "--level",
        required=True,
        help="Directory containing the level files to be uploaded",
    )
    parser.add_argument(
        "--summary",
        required=False,
        help="File path to write a markdown summary after publishing",
    )
    args = parser.parse_args()

    global API
    API = API_URLS.get(args.env)

    if args.env == "local":
        level_id = "123456"
        commit = "abc"
        repo = "amoffat/local-repo"
        game_url = "qa.getlost.gg"
    else:
        claims = jwt.decode(args.jwt, options={"verify_signature": False})
        level_id = claims["repository_id"]
        repo = claims["repository"]
        commit = claims["sha"]
        game_url = GAME_URLS[args.env]

    # Create a single tar.gz file for both wasm and art
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tar.gz") as temp_gz:
        with tarfile.open(temp_gz.name, "w:gz") as tar:
            collect_wasm(
                tar=tar,
                metadata={
                    "levelId": level_id,
                    "repo": repo,
                    "commit": commit,
                },
            )
            collect_art(Path(args.level).resolve(), tar)

        assets = open(temp_gz.name, "rb")

    job_id = put_level(
        api_auth_jwt=args.jwt,
        github_auth_token=args.github_token,
        level_id=level_id,
        commit=commit,
        assets=assets,
    )
    level = poll_job(
        jwt=args.jwt,
        job_id=job_id,
        level_id=level_id,
        timeout=60,
    )
    print("Level published successfully!", level)

    # Write summary if requested
    if args.summary:
        template_path = Path(__file__).parent / "summary_template.md"
        with open(template_path, "r") as f:
            template = string.Template(f.read())

        summary = template.safe_substitute(
            name=level["name"],
            link=f"{game_url}{level['path']}",
        )
        with open(args.summary, "w") as f:
            f.write(summary)
