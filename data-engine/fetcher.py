"""Refresh portfolio data from public, non-fork GitHub repositories."""

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlparse

RECENT_DAYS = 14
AVG_LINE_LENGTH = 50


def get_repo_complexity(repo):
    """Estimate repository size, with a bonus for stars and recent activity."""
    estimated_lines = max(repo.size, 1) * 1024 // AVG_LINE_LENGTH
    last_push = repo.pushed_at
    if last_push is not None:
        if last_push.tzinfo is None:
            last_push = last_push.replace(tzinfo=timezone.utc)
        is_recent = datetime.now(timezone.utc) - last_push < timedelta(days=RECENT_DAYS)
    else:
        is_recent = False
    base_score = estimated_lines * 0.5 + repo.stargazers_count * 20
    return round(base_score * (1.3 if is_recent else 1.0), 2)


def fetch_repositories(user):
    """Finish the entire fetch before replacing the existing portfolio file."""
    repositories = []
    for repo in user.get_repos(sort="updated", direction="desc"):
        if repo.fork or repo.private:
            continue
        entry = {
            "name": repo.name,
            "complexity_score": get_repo_complexity(repo),
            "url": repo.html_url,
        }
        homepage = (repo.homepage or "").strip()
        parsed = urlparse(homepage)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            entry["demoUrl"] = homepage
        repositories.append(entry)
    return repositories


def write_portfolio(data, output_path):
    """Use an atomic replacement so failed updates leave the previous data intact."""
    if not data:
        raise ValueError("No public repositories found; keeping the existing portfolio data.")
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with NamedTemporaryFile(mode="w", encoding="utf-8", dir=output_path.parent,
                                suffix=".tmp", delete=False) as temporary:
            temporary_path = Path(temporary.name)
            json.dump(data, temporary, indent=2, ensure_ascii=False)
            temporary.write("\n")
        os.replace(temporary_path, output_path)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def main():
    from github import Github

    token = os.getenv("MY_PERSONAL_TOKEN")
    if not token:
        raise ValueError("MY_PERSONAL_TOKEN environment variable is not set.")
    client = Github(token)
    try:
        user = client.get_user()
        data = fetch_repositories(user)
        output_path = Path(__file__).resolve().parent.parent / "frontend/data/portfolio-data.json"
        write_portfolio(data, output_path)
        print(f"Updated {len(data)} repositories for {user.login}.")
    finally:
        client.close()


if __name__ == "__main__":
    main()
