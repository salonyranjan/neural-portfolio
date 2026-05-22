import os
from github import Github, RateLimitExceededException
from datetime import datetime, timedelta, timezone
import json
import time

# 1. Setup GitHub Auth
token = os.getenv('GITHUB_TOKEN')
if not token:
    raise ValueError("GITHUB_TOKEN environment variable is not set!")

g = Github(token)
user = g.get_user()

# Constants
RECENT_DAYS = 14  # Projects updated within 2 weeks get a boost
AVG_LINE_LENGTH = 50 

def get_repo_complexity(repo):
    """Calculates a normalized score based on size and activity."""
    # repo.size is in KB
    total_lines_estimate = (repo.size * 1024) // AVG_LINE_LENGTH
    
    # Calculate recency bonus
    try:
        last_push = repo.pushed_at.replace(tzinfo=timezone.utc)
        is_recent = 1 if (datetime.now(timezone.utc) - last_push < timedelta(days=RECENT_DAYS)) else 0
    except:
        is_recent = 0

    # Complexity Algorithm: Heavily weight size and commit history
    # We add a 30% boost if the repo was recently touched
    base_score = (total_lines_estimate * 0.5) + (repo.stargazers_count * 20)
    final_score = base_score * (1.3 if is_recent else 1.0)
    
    return round(final_score, 2)

def fetch_repositories():
    repos = []
    print(f"🚀 Initializing Neural Map Fetcher for: {user.login}")
    
    # Sort by updated time, newest first
    for repo in user.get_repos(sort='updated', direction='desc'):
        # Filter: Skip forks, private repos, or non-portfolio work
        if repo.fork or repo.private:
            continue
            
        try:
            print(f"📡 Processing: {repo.name}")
            
            # Extract live demo from GitHub 'homepage' field
            demo_url = repo.homepage if repo.homepage and repo.homepage.startswith("http") else None
            
            repo_entry = {
                "name": repo.name,
                "complexity_score": get_repo_complexity(repo),
                "url": repo.html_url
            }
            
            # Only add demoUrl key if a valid link exists
            if demo_url:
                repo_entry["demoUrl"] = demo_url
            
            repos.append(repo_entry)
            
            # Rate limit safety
            if g.get_rate_limit().core.remaining < 20:
                print("⚠️ Approaching API limit. Sleeping for 60s...")
                time.sleep(60)
                
        except Exception as e:
            print(f"❌ Skipping {repo.name}: {e}")
            
    return repos

if __name__ == "__main__":
    # Ensure directory exists relative to script location
    data_dir = os.path.join(os.path.dirname(__file__), "../frontend/data")
    os.makedirs(data_dir, exist_ok=True)
    
    output_path = os.path.join(data_dir, "portfolio-data.json")
    
    data = fetch_repositories()
    
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
        
    print(f"\n✅ Success! {len(data)} projects mapped to {output_path}")