import os
from github import Github, RateLimitExceededException
from datetime import datetime, timedelta, timezone
import json
import time

token = os.getenv('GITHUB_TOKEN')
if not token:
    raise ValueError("GITHUB_TOKEN environment variable is not set")

g = Github(token)
user = g.get_user()

RECENT_DAYS = 7
AVG_LINE_LENGTH = 50

def get_total_lines_of_code(repo):
    return (repo.size * 1024) // AVG_LINE_LENGTH

def is_recently_deployed(repo):
    try:
        # Use get_commits() to check the latest commit date efficiently
        latest_commit = repo.get_commits()[0]
        commit_date = latest_commit.commit.author.date.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - commit_date < timedelta(days=RECENT_DAYS)
    except Exception:
        return False

def fetch_repositories():
    repos = []
    seen_names = set() # To prevent duplicates
    
    print(f"Fetching repositories for {user.login}...")
    
    for repo in user.get_repos():
        # 1. Skip forks to ensure only YOUR projects are visualized
        # 2. Skip if we've already processed this name
        if repo.fork or repo.name in seen_names:
            continue
            
        try:
            total_lines = get_total_lines_of_code(repo)
            commit_count = repo.get_commits().totalCount
            recent = 1 if is_recently_deployed(repo) else 0
            score = (total_lines * 0.4) + (commit_count * 0.3) + (recent * 0.3)
            
            repos.append({
                "name": repo.name,
                "complexity_score": score,
                "url": repo.html_url
            })
            seen_names.add(repo.name)
            print(f"Processed: {repo.name}")
            
        except RateLimitExceededException:
            print("Rate limit hit. Sleeping...")
            time.sleep(60)
        except Exception as e:
            print(f"Skipping {repo.name}: {e}")
            
    return repos

def export_to_json(data, path):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    repos = fetch_repositories()
    output_path = "../frontend/public/portfolio-data.json"
    export_to_json(repos, output_path)
    print(f"Success! {len(repos)} repositories exported to {output_path}")