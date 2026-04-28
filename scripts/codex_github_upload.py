#!/usr/bin/env python3
"""
Fast GitHub uploader for Codex-managed projects.

Decision order:
1. Use gh + git + SSH when the local machine is already authenticated.
2. Use Git Data API batch commits when a token is available.
3. Fall back to a dry-run manifest with clear next steps.

The default mode is dry-run. Pass --execute to write to GitHub.
"""

from __future__ import annotations

import argparse
import base64
import fnmatch
import json
import os
import shutil
import subprocess
import sys
import time
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path


API = "https://api.github.com"
DEFAULT_IGNORES = (
    ".git",
    ".DS_Store",
    ".env",
    ".env.*",
    ".idea",
    ".vscode",
    ".venv",
    "__pycache__",
    "*.log",
    "*.pyc",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "npm-debug.log*",
    "pnpm-debug.log*",
    "scratch",
    "venv",
    "yarn-debug.log*",
    "yarn-error.log*",
)


def user_path() -> dict[str, str]:
    env = os.environ.copy()
    local_bin = str(Path.home() / ".local" / "bin")
    env["PATH"] = local_bin + os.pathsep + env.get("PATH", "")
    return env


@dataclass
class Manifest:
    files: list[Path]
    skipped_ignored: list[str]
    skipped_large: list[str]
    warned_large: list[str]


def run(cmd: list[str], cwd: Path, timeout: int = 20) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd,
        env=user_path(),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
        check=False,
    )


def is_ignored(rel: str, patterns: tuple[str, ...]) -> bool:
    rel = rel.replace("\\", "/")
    name = Path(rel).name
    for pattern in patterns:
        pattern = pattern.replace("\\", "/").rstrip("/")
        if (
            fnmatch.fnmatch(rel, pattern)
            or fnmatch.fnmatch(name, pattern)
            or rel.startswith(pattern + "/")
        ):
            return True
    return False


def read_gitignore(root: Path) -> tuple[str, ...]:
    path = root / ".gitignore"
    if not path.exists():
        return ()
    patterns: list[str] = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and not line.startswith("!"):
            patterns.append(line)
    return tuple(patterns)


def build_manifest(root: Path, max_file_mb: int, include_scratch: bool = False) -> Manifest:
    patterns = DEFAULT_IGNORES + read_gitignore(root)
    if include_scratch:
        patterns = tuple(pattern for pattern in patterns if pattern != "scratch")
    max_bytes = max_file_mb * 1024 * 1024
    files: list[Path] = []
    skipped_ignored: list[str] = []
    skipped_seen: set[str] = set()
    skipped_large: list[str] = []
    warned_large: list[str] = []
    warn_bytes = 50 * 1024 * 1024
    for dirpath, dirnames, filenames in os.walk(root):
        current = Path(dirpath)
        kept_dirs = []
        for dirname in dirnames:
            rel_dir = (current / dirname).relative_to(root).as_posix()
            if is_ignored(rel_dir, patterns):
                collapsed = ignored_summary_path(rel_dir, patterns)
                if collapsed not in skipped_seen:
                    skipped_seen.add(collapsed)
                    skipped_ignored.append(collapsed)
                continue
            kept_dirs.append(dirname)
        dirnames[:] = kept_dirs

        for filename in filenames:
            path = current / filename
            rel = path.relative_to(root).as_posix()
            if is_ignored(rel, patterns):
                collapsed = ignored_summary_path(rel, patterns)
                if collapsed not in skipped_seen:
                    skipped_seen.add(collapsed)
                    skipped_ignored.append(collapsed)
                continue
            if path.stat().st_size > max_bytes:
                skipped_large.append(rel)
                continue
            if path.stat().st_size > warn_bytes:
                warned_large.append(rel)
            files.append(path)
    return Manifest(sorted(files), sorted(skipped_ignored), sorted(skipped_large), sorted(warned_large))


def ignored_summary_path(rel: str, patterns: tuple[str, ...]) -> str:
    parts = rel.split("/")
    for i in range(1, len(parts)):
        prefix = "/".join(parts[:i])
        if is_ignored(prefix, patterns):
            return prefix + "/"
    return rel


def remote_matches(url: str, owner: str, repo: str) -> bool:
    normalized = url.removesuffix(".git")
    return normalized.endswith(f":{owner}/{repo}") or normalized.endswith(f"/{owner}/{repo}")


def has_matching_remote(root: Path, owner: str, repo: str, remote_name: str) -> bool:
    existing = run(["git", "remote", "get-url", remote_name], root)
    return existing.returncode == 0 and remote_matches(existing.stdout.strip(), owner, repo)


def local_git_ready(
    root: Path,
    owner: str,
    repo: str,
    remote_name: str,
    strict_ssh_check: bool = False,
) -> tuple[bool, list[str]]:
    notes: list[str] = []
    env_path = user_path()["PATH"]
    if not shutil.which("git", path=env_path):
        return False, ["git not found"]
    remote_ready = has_matching_remote(root, owner, repo, remote_name)
    if remote_ready and not strict_ssh_check:
        return True, []
    if shutil.which("gh", path=env_path):
        auth = run(["gh", "auth", "status"], root)
        if auth.returncode != 0 and not remote_ready:
            notes.append("gh is not authenticated")
        protocol = run(["gh", "config", "get", "git_protocol", "--host", "github.com"], root)
        if protocol.returncode == 0 and protocol.stdout.strip() != "ssh" and not remote_ready:
            notes.append("gh git protocol is not ssh")
    elif not remote_ready:
        return False, ["gh not found and no matching git remote exists"]
    if strict_ssh_check:
        ssh = run(
            ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=3", "-T", "git@github.com"],
            root,
            timeout=5,
        )
        ssh_text = (ssh.stdout + ssh.stderr).lower()
        if "successfully authenticated" not in ssh_text:
            notes.append("ssh auth to git@github.com is not ready")
    return not notes, notes


def source_git_usable(root: Path) -> tuple[bool, str]:
    probe = run(["git", "rev-parse", "--is-inside-work-tree"], root)
    if probe.returncode == 0:
        return True, "source is an existing git repository"
    if (root / ".git").exists():
        return False, "source has an unusable .git entry; use Git Data API fallback"
    return True, "source can be initialized as a git repository"


def github_token(root: Path) -> str:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        return token
    if shutil.which("gh", path=user_path()["PATH"]):
        result = run(["gh", "auth", "token"], root)
        if result.returncode == 0:
            return result.stdout.strip()
    return ""


class GitHub:
    def __init__(self, token: str, delay: float) -> None:
        self.token = token
        self.delay = delay

    def request(self, method: str, path: str, payload: dict | None = None) -> dict:
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            API + path,
            data=body,
            method=method,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "codex-github-fast-uploader",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        backoff = 2
        for _ in range(6):
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    raw = resp.read().decode("utf-8")
                    if method in {"POST", "PATCH", "PUT", "DELETE"} and self.delay:
                        time.sleep(self.delay)
                    return json.loads(raw) if raw else {}
            except urllib.error.HTTPError as exc:
                text = exc.read().decode("utf-8", errors="replace")[:500]
                retry_after = exc.headers.get("retry-after")
                remaining = exc.headers.get("x-ratelimit-remaining")
                reset = exc.headers.get("x-ratelimit-reset")
                if exc.code in (403, 429):
                    if retry_after:
                        wait = int(retry_after)
                    elif remaining == "0" and reset:
                        wait = max(1, int(reset) - int(time.time()) + 1)
                    else:
                        wait = backoff
                        backoff = min(backoff * 2, 60)
                    time.sleep(wait)
                    continue
                if exc.code >= 500:
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 30)
                    continue
                raise RuntimeError(f"GitHub API {exc.code}: {text}") from exc
        raise RuntimeError("GitHub API request failed after retries")

    def get(self, path: str) -> dict:
        return self.request("GET", path)

    def post(self, path: str, payload: dict) -> dict:
        return self.request("POST", path, payload)

    def patch(self, path: str, payload: dict) -> dict:
        return self.request("PATCH", path, payload)


def ensure_branch(gh: GitHub, owner: str, repo: str, branch: str, base_branch: str) -> str:
    try:
        ref = gh.get(f"/repos/{owner}/{repo}/git/ref/heads/{branch}")
        return ref["object"]["sha"]
    except RuntimeError:
        base_ref = gh.get(f"/repos/{owner}/{repo}/git/ref/heads/{base_branch}")
        base_sha = base_ref["object"]["sha"]
        gh.post(
            f"/repos/{owner}/{repo}/git/refs",
            {"ref": f"refs/heads/{branch}", "sha": base_sha},
        )
        return base_sha


def ensure_repo_with_api(gh: GitHub, owner: str, repo: str, private: bool) -> dict:
    try:
        return gh.get(f"/repos/{owner}/{repo}")
    except RuntimeError:
        me = gh.get("/user")["login"]
        payload = {"name": repo, "private": private, "auto_init": True}
        if owner == me:
            return gh.post("/user/repos", payload)
        return gh.post(f"/orgs/{owner}/repos", payload)


def blob_for_file(gh: GitHub, owner: str, repo: str, path: Path) -> str:
    raw = path.read_bytes()
    try:
        payload = {"content": raw.decode("utf-8"), "encoding": "utf-8"}
    except UnicodeDecodeError:
        payload = {"content": base64.b64encode(raw).decode("ascii"), "encoding": "base64"}
    return gh.post(f"/repos/{owner}/{repo}/git/blobs", payload)["sha"]


def commit_batch(
    gh: GitHub,
    owner: str,
    repo: str,
    branch: str,
    root: Path,
    batch: list[Path],
    message: str,
) -> str:
    blob_cache: dict[str, str] = {}
    for _ in range(5):
        head_ref = gh.get(f"/repos/{owner}/{repo}/git/ref/heads/{branch}")
        parent_sha = head_ref["object"]["sha"]
        base_tree = gh.get(f"/repos/{owner}/{repo}/git/commits/{parent_sha}")["tree"]["sha"]

        entries = []
        for path in batch:
            rel = path.relative_to(root).as_posix()
            if rel not in blob_cache:
                blob_cache[rel] = blob_for_file(gh, owner, repo, path)
            entries.append(
                {
                    "path": rel,
                    "mode": "100755" if os.access(path, os.X_OK) else "100644",
                    "type": "blob",
                    "sha": blob_cache[rel],
                }
            )

        tree = gh.post(
            f"/repos/{owner}/{repo}/git/trees",
            {"base_tree": base_tree, "tree": entries},
        )
        commit = gh.post(
            f"/repos/{owner}/{repo}/git/commits",
            {"message": message, "tree": tree["sha"], "parents": [parent_sha]},
        )
        try:
            gh.patch(
                f"/repos/{owner}/{repo}/git/refs/heads/{branch}",
                {"sha": commit["sha"], "force": False},
            )
            return commit["sha"]
        except RuntimeError as exc:
            if "409" not in str(exc):
                raise
            time.sleep(2)
    raise RuntimeError("Too many Git reference conflicts")


def chunks(items: list[Path], size: int) -> list[list[Path]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def summarize_paths(paths: list[str], limit: int) -> dict[str, object]:
    return {
        "count": len(paths),
        "shown": paths[:limit],
        "truncated": len(paths) > limit,
    }


def require_ok(result: subprocess.CompletedProcess[str], action: str) -> None:
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"{action} failed: {detail}")


def git_current_branch(root: Path) -> str:
    branch = run(["git", "branch", "--show-current"], root).stdout.strip()
    return branch or "main"


def branch_is_behind(root: Path, branch: str) -> bool:
    upstream = run(["git", "rev-parse", "--abbrev-ref", f"{branch}@{{upstream}}"], root)
    if upstream.returncode != 0:
        return False
    counts = run(["git", "rev-list", "--left-right", "--count", f"{branch}...{upstream.stdout.strip()}"], root)
    if counts.returncode != 0:
        return False
    ahead, behind = (int(part) for part in counts.stdout.split())
    return behind > 0 and ahead >= 0


def choose_remote(root: Path, owner: str, repo: str, preferred: str) -> str:
    target = f"git@github.com:{owner}/{repo}.git"
    existing = run(["git", "remote", "get-url", preferred], root)
    if existing.returncode == 0:
        current = existing.stdout.strip()
        if remote_matches(current, owner, repo):
            return preferred
        fallback = "codex-upload"
        fallback_existing = run(["git", "remote", "get-url", fallback], root)
        if fallback_existing.returncode == 0:
            if remote_matches(fallback_existing.stdout.strip(), owner, repo):
                return fallback
            require_ok(run(["git", "remote", "set-url", fallback, target], root), "update fallback remote")
            return fallback
        require_ok(run(["git", "remote", "add", fallback, target], root), "add fallback remote")
        return fallback
    require_ok(run(["git", "remote", "add", preferred, target], root), "add remote")
    return preferred


def ensure_repo_with_gh(root: Path, owner: str, repo: str, private: bool) -> str:
    full = f"{owner}/{repo}"
    view = run(["gh", "repo", "view", full, "--json", "url", "-q", ".url"], root, timeout=30)
    if view.returncode == 0:
        return view.stdout.strip()
    visibility = "--private" if private else "--public"
    create = run(["gh", "repo", "create", full, visibility], root, timeout=60)
    require_ok(create, "create GitHub repository")
    view = run(["gh", "repo", "view", full, "--json", "url", "-q", ".url"], root, timeout=30)
    require_ok(view, "read GitHub repository URL")
    return view.stdout.strip()


def stage_manifest(root: Path, manifest: Manifest) -> None:
    rels = [path.relative_to(root).as_posix() for path in manifest.files]
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as handle:
        pathspec_file = Path(handle.name)
        handle.write("\0".join(rels))
        handle.write("\0")
    try:
        require_ok(
            run(
                ["git", "add", "--pathspec-from-file", str(pathspec_file), "--pathspec-file-nul"],
                root,
                timeout=120,
            ),
            "stage files",
        )
    finally:
        pathspec_file.unlink(missing_ok=True)


def git_upload(
    root: Path,
    owner: str,
    repo: str,
    manifest: Manifest,
    message: str,
    branch: str,
    remote_name: str,
    private: bool,
) -> dict:
    if run(["git", "rev-parse", "--is-inside-work-tree"], root).returncode != 0:
        require_ok(run(["git", "init", "-b", branch or "main"], root), "initialize git repository")

    target_branch = branch or git_current_branch(root)
    original_branch = target_branch
    if target_branch == git_current_branch(root) and branch_is_behind(root, target_branch):
        target_branch = f"codex/upload-{time.strftime('%Y%m%d-%H%M%S')}"
    repo_url = f"https://github.com/{owner}/{repo}"
    if not has_matching_remote(root, owner, repo, remote_name):
        repo_url = ensure_repo_with_gh(root, owner, repo, private)
    remote = choose_remote(root, owner, repo, remote_name)
    stage_manifest(root, manifest)

    committed = False
    if run(["git", "diff", "--cached", "--quiet"], root).returncode != 0:
        require_ok(run(["git", "commit", "-m", message], root, timeout=120), "commit files")
        committed = True

    head = run(["git", "rev-parse", "HEAD"], root)
    require_ok(head, "read HEAD")
    require_ok(
        run(["git", "push", "-u", remote, f"HEAD:{target_branch}"], root, timeout=300),
        "push branch",
    )
    return {
        "repo_url": repo_url,
        "branch": target_branch,
        "requested_branch": original_branch,
        "remote": remote,
        "last_commit": head.stdout.strip(),
        "created_commit": committed,
        "files_committed": [path.relative_to(root).as_posix() for path in manifest.files],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Choose and run the fastest GitHub upload path.")
    parser.add_argument("source", nargs="?", default=".", help="Project directory to upload")
    parser.add_argument("--repo", required=True, help="GitHub repository, e.g. owner/name")
    parser.add_argument("--branch", default="", help="Target branch. Defaults to repo default branch")
    parser.add_argument("--base-branch", default="", help="Base branch when creating a new branch")
    parser.add_argument("--new-branch", default="", help="Create or update this branch instead of target")
    parser.add_argument("--batch-size", type=int, default=200)
    parser.add_argument("--max-file-mb", type=int, default=95)
    parser.add_argument("--message", default="Bulk upload from Codex")
    parser.add_argument("--remote-name", default="origin", help="Preferred git remote name")
    parser.add_argument("--private", action="store_true", help="Create repo as private if it does not exist")
    parser.add_argument("--include-scratch", action="store_true", help="Include scratch/ preview artifacts")
    parser.add_argument("--strict-ssh-check", action="store_true", help="Probe git@github.com before choosing git+ssh")
    parser.add_argument("--list-limit", type=int, default=200, help="Number of paths to show in JSON summaries")
    parser.add_argument("--execute", action="store_true", help="Write to GitHub. Default is dry-run")
    parser.add_argument("--api-delay", type=float, default=1.0, help="Delay after mutating API calls")
    args = parser.parse_args()

    root = Path(args.source).expanduser().resolve()
    if not root.is_dir():
        raise SystemExit(f"Not a directory: {root}")
    owner, _, repo = args.repo.partition("/")
    if not owner or not repo:
        raise SystemExit("--repo must look like owner/name")

    manifest = build_manifest(root, args.max_file_mb, include_scratch=args.include_scratch)
    git_ready, git_notes = local_git_ready(
        root,
        owner,
        repo,
        args.remote_name,
        strict_ssh_check=args.strict_ssh_check,
    )
    source_git_ok, source_git_note = source_git_usable(root)
    token = github_token(root)

    chosen = "gh+git+ssh" if git_ready and source_git_ok else "git-data-api" if token else "dry-run-only"
    file_paths = [p.relative_to(root).as_posix() for p in manifest.files]
    summary = {
        "source": str(root),
        "repo": args.repo,
        "chosen_path": chosen,
        "execute": args.execute,
        "count_files": len(manifest.files),
        "bytes_files": sum(p.stat().st_size for p in manifest.files),
        "files": summarize_paths(file_paths, args.list_limit),
        "skipped_ignored": manifest.skipped_ignored,
        "skipped_large": manifest.skipped_large,
        "warned_large": manifest.warned_large,
        "local_git_notes": git_notes,
        "source_git_note": source_git_note,
    }

    if not args.execute:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0

    if not manifest.files:
        print(json.dumps(summary | {"notes": "No files to upload after filtering."}, ensure_ascii=False, indent=2))
        return 0

    if chosen == "dry-run-only":
        raise SystemExit("No authenticated upload path found. Set GITHUB_TOKEN/GH_TOKEN or install/auth gh + SSH.")

    if chosen == "gh+git+ssh":
        target_branch = args.new_branch or args.branch or git_current_branch(root)
        result = git_upload(root, owner, repo, manifest, args.message, target_branch, args.remote_name, args.private)
        print(json.dumps(summary | result, ensure_ascii=False, indent=2))
        return 0

    gh = GitHub(token=token or "", delay=args.api_delay)
    repo_info = ensure_repo_with_api(gh, owner, repo, args.private)
    base_branch = args.base_branch or repo_info["default_branch"]
    target_branch = args.new_branch or args.branch or base_branch
    ensure_branch(gh, owner, repo, target_branch, base_branch)

    last_commit = ""
    committed: list[str] = []
    for index, batch in enumerate(chunks(manifest.files, args.batch_size), start=1):
        last_commit = commit_batch(
            gh,
            owner,
            repo,
            target_branch,
            root,
            batch,
            f"{args.message} batch {index} ({len(batch)} files)",
        )
        committed.extend(p.relative_to(root).as_posix() for p in batch)

    print(
        json.dumps(
            summary
            | {
                "branch": target_branch,
                "last_commit": last_commit,
                "files_committed": committed,
                "repo_url": repo_info["html_url"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
