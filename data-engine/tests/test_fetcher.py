import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("fetcher", Path(__file__).parents[1] / "fetcher.py")
fetcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetcher)


def repository(**overrides):
    fields = dict(name="example", size=100, stargazers_count=2,
                  pushed_at=datetime.now(timezone.utc) - timedelta(days=30),
                  fork=False, private=False, homepage="https://example.com",
                  html_url="https://github.com/example/example")
    return SimpleNamespace(**(fields | overrides))


class FetcherTests(unittest.TestCase):
    def test_score_handles_missing_dates_and_minimum_size(self):
        self.assertEqual(fetcher.get_repo_complexity(repository(size=0, pushed_at=None)), 50)

    def test_recent_naive_date_receives_activity_bonus(self):
        repo = repository(pushed_at=datetime.now(timezone.utc).replace(tzinfo=None))
        self.assertEqual(fetcher.get_repo_complexity(repo), 1383.2)

    def test_fetch_skips_forks_private_repos_and_invalid_homepages(self):
        repos = [repository(), repository(fork=True), repository(private=True),
                 repository(name="invalid", homepage="httpbroken"),
                 repository(name="empty", homepage=None)]
        user = SimpleNamespace(get_repos=lambda **kwargs: repos)
        data = fetcher.fetch_repositories(user)
        self.assertEqual([entry["name"] for entry in data], ["example", "invalid", "empty"])
        self.assertEqual(data[0]["demoUrl"], "https://example.com")
        self.assertNotIn("demoUrl", data[1])
        self.assertNotIn("demoUrl", data[2])

    def test_partial_api_failure_aborts_fetch(self):
        def interrupted_repositories(**kwargs):
            yield repository()
            raise RuntimeError("API unavailable")
        with self.assertRaisesRegex(RuntimeError, "API unavailable"):
            fetcher.fetch_repositories(SimpleNamespace(get_repos=interrupted_repositories))

    def test_atomic_write_round_trips_unicode(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "portfolio.json"
            data = [{"name": "Physics · Engineering"}]
            fetcher.write_portfolio(data, target)
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")), data)
            self.assertEqual(list(Path(directory).iterdir()), [target])

    def test_empty_update_preserves_existing_data(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "portfolio.json"
            target.write_text("previous data", encoding="utf-8")
            with self.assertRaises(ValueError):
                fetcher.write_portfolio([], target)
            self.assertEqual(target.read_text(encoding="utf-8"), "previous data")

    def test_failed_replacement_preserves_data_and_removes_temporary_file(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "portfolio.json"
            target.write_text("previous data", encoding="utf-8")
            with patch.object(fetcher.os, "replace", side_effect=OSError("disk unavailable")):
                with self.assertRaises(OSError):
                    fetcher.write_portfolio([{"name": "new"}], target)
            self.assertEqual(target.read_text(encoding="utf-8"), "previous data")
            self.assertEqual(list(Path(directory).iterdir()), [target])


if __name__ == "__main__":
    unittest.main()
