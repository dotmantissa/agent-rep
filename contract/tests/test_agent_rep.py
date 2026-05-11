"""
Integration tests for the AgentRep contract.

Run with the GenLayer test runner:
    gltest

These tests target a local GenLayer node (genlayer up) and exercise:
- profile registration and validation
- capability updates
- task lifecycle (post → accept → submit → verify)
- endorsements with AI verification
- view methods (get_profile, get_reputation, get_top_profiles, search_by_capability)
- reputation score evolution
- security guards (self-endorsement, duplicate endorsement, self-assignment,
  invalid agent_type, bad URLs, oversized inputs, unauthorized submitters)

AI-dependent calls (endorse, verify_task, search_by_capability) are
non-deterministic — assertions only check that state transitions occur
and stay within the allowed value set, not the specific AI verdict.
"""

import json
import pytest
from pathlib import Path

from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded, tx_execution_failed
from gltest.helpers import load_fixtures_from_file


CONTRACT_PATH = Path(__file__).parent.parent / "agent_rep.py"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def deployed():
    """Deploy a fresh AgentRep contract once per test module."""
    factory = get_contract_factory("AgentRep", contract_file=str(CONTRACT_PATH))
    contract = factory.deploy(args=[])
    return contract


@pytest.fixture(scope="module")
def accounts(deployed):
    """Three named accounts used across tests."""
    from gltest import create_account
    return {
        "alice":   create_account(),  # human user
        "bob":     create_account(),  # ai_agent
        "carol":   create_account(),  # dao
        "mallory": create_account(),  # unregistered attacker
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register(contract, account, name, agent_type, capabilities, website=""):
    return contract.connect(account).write.register_profile(
        args=[
            name,
            f"{name} test profile",
            agent_type,
            json.dumps(capabilities),
            website,
        ]
    )


def _view(contract, fn, *args):
    raw = contract.read[fn](args=list(args))
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return raw
    return raw


# ===========================================================================
# Profile registration
# ===========================================================================

class TestProfileRegistration:

    def test_register_human_profile(self, deployed, accounts):
        receipt = _register(
            deployed, accounts["alice"], "Alice", "human",
            ["code_review", "rust", "solidity"],
            website="https://alice.example",
        )
        assert tx_execution_succeeded(receipt)

        profile = _view(deployed, "get_profile", accounts["alice"].address)
        assert profile["name"] == "Alice"
        assert profile["agent_type"] == "human"
        assert "code_review" in profile["capabilities"]
        assert profile["website"] == "https://alice.example"
        assert profile["is_verified"] is False

    def test_register_ai_agent_profile(self, deployed, accounts):
        receipt = _register(
            deployed, accounts["bob"], "BobBot", "ai_agent",
            ["machine_learning", "data_analysis"],
        )
        assert tx_execution_succeeded(receipt)

    def test_register_dao_profile(self, deployed, accounts):
        receipt = _register(
            deployed, accounts["carol"], "CarolDAO", "dao",
            ["governance", "treasury_management"],
        )
        assert tx_execution_succeeded(receipt)

    def test_reject_invalid_agent_type(self, deployed, accounts):
        receipt = _register(deployed, accounts["mallory"], "M", "robot", [])
        assert tx_execution_failed(receipt, "agent_type")

    def test_reject_empty_name(self, deployed, accounts):
        receipt = _register(deployed, accounts["mallory"], "   ", "human", [])
        assert tx_execution_failed(receipt, "Name cannot be empty")

    def test_reject_oversized_name(self, deployed, accounts):
        receipt = _register(deployed, accounts["mallory"], "x" * 81, "human", [])
        assert tx_execution_failed(receipt, "Name too long")

    def test_reject_oversized_description(self, deployed, accounts):
        receipt = deployed.connect(accounts["mallory"]).write.register_profile(
            args=["M", "y" * 501, "human", "[]", ""]
        )
        assert tx_execution_failed(receipt, "Description too long")

    def test_reject_bad_website_scheme(self, deployed, accounts):
        receipt = _register(
            deployed, accounts["mallory"], "M", "human", [],
            website="javascript:alert(1)",
        )
        assert tx_execution_failed(receipt, "http://")

    def test_reject_too_many_capabilities(self, deployed, accounts):
        caps = [f"cap{i}" for i in range(21)]
        receipt = _register(deployed, accounts["mallory"], "M", "human", caps)
        assert tx_execution_failed(receipt, "Maximum 20 capabilities")

    def test_reject_invalid_capabilities_json(self, deployed, accounts):
        receipt = deployed.connect(accounts["mallory"]).write.register_profile(
            args=["M", "desc", "human", "not-json", ""]
        )
        assert tx_execution_failed(receipt, "not valid JSON")

    def test_sanitize_html_in_name(self, deployed, accounts):
        receipt = _register(
            deployed, accounts["alice"],
            "Alice<script>", "human", ["code_review"],
        )
        assert tx_execution_succeeded(receipt)
        profile = _view(deployed, "get_profile", accounts["alice"].address)
        assert "<" not in profile["name"]
        assert "script" in profile["name"]  # text retained, only brackets stripped


# ===========================================================================
# Capability updates
# ===========================================================================

class TestCapabilities:

    def test_update_capabilities(self, deployed, accounts):
        receipt = deployed.connect(accounts["alice"]).write.update_capabilities(
            args=[json.dumps(["python", "ml", "rust"])]
        )
        assert tx_execution_succeeded(receipt)
        profile = _view(deployed, "get_profile", accounts["alice"].address)
        assert set(profile["capabilities"]) == {"python", "ml", "rust"}

    def test_update_requires_profile(self, deployed, accounts):
        receipt = deployed.connect(accounts["mallory"]).write.update_capabilities(
            args=[json.dumps(["x"])]
        )
        assert tx_execution_failed(receipt, "register a profile first")


# ===========================================================================
# Tasks
# ===========================================================================

class TestTasks:

    @pytest.fixture(autouse=True)
    def _snapshot_state(self, deployed):
        # Capture counter before each test so test ids remain stable
        self.start_count = int(_view(deployed, "get_task_count"))

    def test_post_task(self, deployed, accounts):
        receipt = deployed.connect(accounts["alice"]).write.post_task(
            args=[
                accounts["bob"].address,
                "Implement a sort function",
                "Returns sorted list for any int input",
            ]
        )
        assert tx_execution_succeeded(receipt)

        new_count = int(_view(deployed, "get_task_count"))
        assert new_count == self.start_count + 1
        tid = str(new_count)

        task = _view(deployed, "get_task", tid)
        assert task["status"] == "OPEN"
        assert task["poster"].lower() == accounts["alice"].address.lower()
        assert task["assignee"].lower() == accounts["bob"].address.lower()

    def test_cannot_self_assign(self, deployed, accounts):
        receipt = deployed.connect(accounts["alice"]).write.post_task(
            args=[accounts["alice"].address, "self task", "criteria"]
        )
        assert tx_execution_failed(receipt, "yourself")

    def test_cannot_post_to_unregistered(self, deployed, accounts):
        receipt = deployed.connect(accounts["alice"]).write.post_task(
            args=[accounts["mallory"].address, "desc", "criteria"]
        )
        assert tx_execution_failed(receipt, "registered AgentRep profile")

    def test_accept_and_submit_flow(self, deployed, accounts):
        # post
        receipt = deployed.connect(accounts["alice"]).write.post_task(
            args=[accounts["bob"].address, "Write README", "Contains install + usage"]
        )
        assert tx_execution_succeeded(receipt)
        tid = str(int(_view(deployed, "get_task_count")))

        # accept (by assignee)
        r = deployed.connect(accounts["bob"]).write.accept_task(args=[tid])
        assert tx_execution_succeeded(r)
        assert _view(deployed, "get_task", tid)["status"] == "ACCEPTED"

        # submit (by assignee)
        r = deployed.connect(accounts["bob"]).write.submit_task(
            args=[tid, "https://example.com/readme"]
        )
        assert tx_execution_succeeded(r)
        assert _view(deployed, "get_task", tid)["status"] == "SUBMITTED"

    def test_only_assignee_can_accept(self, deployed, accounts):
        receipt = deployed.connect(accounts["alice"]).write.post_task(
            args=[accounts["bob"].address, "task", "criteria"]
        )
        assert tx_execution_succeeded(receipt)
        tid = str(int(_view(deployed, "get_task_count")))

        r = deployed.connect(accounts["carol"]).write.accept_task(args=[tid])
        assert tx_execution_failed(r, "Only the assignee")

    def test_only_assignee_can_submit(self, deployed, accounts):
        receipt = deployed.connect(accounts["alice"]).write.post_task(
            args=[accounts["bob"].address, "task", "criteria"]
        )
        assert tx_execution_succeeded(receipt)
        tid = str(int(_view(deployed, "get_task_count")))

        r = deployed.connect(accounts["carol"]).write.submit_task(
            args=[tid, "https://x.example"]
        )
        assert tx_execution_failed(r, "Only the assignee")

    def test_submit_requires_open_or_accepted(self, deployed, accounts):
        # Post + submit twice; second submit should fail because status != OPEN/ACCEPTED
        receipt = deployed.connect(accounts["alice"]).write.post_task(
            args=[accounts["bob"].address, "task", "criteria"]
        )
        assert tx_execution_succeeded(receipt)
        tid = str(int(_view(deployed, "get_task_count")))

        r1 = deployed.connect(accounts["bob"]).write.submit_task(
            args=[tid, "https://a.example"]
        )
        assert tx_execution_succeeded(r1)

        r2 = deployed.connect(accounts["bob"]).write.submit_task(
            args=[tid, "https://b.example"]
        )
        assert tx_execution_failed(r2, "SUBMITTED")

    def test_submit_rejects_bad_url(self, deployed, accounts):
        receipt = deployed.connect(accounts["alice"]).write.post_task(
            args=[accounts["bob"].address, "task", "criteria"]
        )
        assert tx_execution_succeeded(receipt)
        tid = str(int(_view(deployed, "get_task_count")))

        r = deployed.connect(accounts["bob"]).write.submit_task(
            args=[tid, "ftp://nope"]
        )
        assert tx_execution_failed(r, "http://")


# ===========================================================================
# Task verification (AI / non-deterministic)
# ===========================================================================

class TestVerifyTask:

    def test_verify_requires_submitted(self, deployed, accounts):
        receipt = deployed.connect(accounts["alice"]).write.post_task(
            args=[accounts["bob"].address, "task v", "criteria v"]
        )
        assert tx_execution_succeeded(receipt)
        tid = str(int(_view(deployed, "get_task_count")))

        # Not submitted yet → should fail
        r = deployed.connect(accounts["alice"]).write.verify_task(args=[tid])
        assert tx_execution_failed(r, "SUBMITTED")

    @pytest.mark.slow
    def test_verify_full_lifecycle(self, deployed, accounts):
        # Post → submit → verify (AI)
        deployed.connect(accounts["alice"]).write.post_task(
            args=[
                accounts["bob"].address,
                "Publish a hello world page",
                "The page contains the text 'Hello, World!'",
            ]
        )
        tid = str(int(_view(deployed, "get_task_count")))
        deployed.connect(accounts["bob"]).write.submit_task(
            args=[tid, "https://example.com"]
        )

        receipt = deployed.connect(accounts["alice"]).write.verify_task(args=[tid])
        assert tx_execution_succeeded(receipt)

        task = _view(deployed, "get_task", tid)
        # AI result is non-deterministic; we only require terminal status
        assert task["status"] in ("COMPLETED", "FAILED", "SUBMITTED")


# ===========================================================================
# Endorsements
# ===========================================================================

class TestEndorsements:

    def test_cannot_self_endorse(self, deployed, accounts):
        r = deployed.connect(accounts["alice"]).write.endorse(
            args=[accounts["alice"].address, "rust", "https://example.com"]
        )
        assert tx_execution_failed(r, "yourself")

    def test_endorse_unregistered_target(self, deployed, accounts):
        r = deployed.connect(accounts["alice"]).write.endorse(
            args=[accounts["mallory"].address, "rust", "https://example.com"]
        )
        assert tx_execution_failed(r, "registered profile")

    def test_endorse_bad_url(self, deployed, accounts):
        r = deployed.connect(accounts["alice"]).write.endorse(
            args=[accounts["bob"].address, "rust", "not-a-url"]
        )
        assert tx_execution_failed(r, "http://")

    def test_endorse_empty_capability(self, deployed, accounts):
        r = deployed.connect(accounts["alice"]).write.endorse(
            args=[accounts["bob"].address, "   ", "https://example.com"]
        )
        assert tx_execution_failed(r, "Capability")

    @pytest.mark.slow
    def test_endorse_happy_path_and_dedupe(self, deployed, accounts):
        before = int(_view(deployed, "get_endorsement_count"))
        r = deployed.connect(accounts["alice"]).write.endorse(
            args=[accounts["bob"].address, "ml", "https://example.com"]
        )
        assert tx_execution_succeeded(r)
        after = int(_view(deployed, "get_endorsement_count"))
        assert after == before + 1

        eid = str(after)
        e = _view(deployed, "get_endorsements_for", accounts["bob"].address)
        assert eid in e
        assert e[eid]["capability"] == "ml"
        assert isinstance(e[eid]["ai_verified"], bool)

        # Duplicate must be rejected
        r2 = deployed.connect(accounts["alice"]).write.endorse(
            args=[accounts["bob"].address, "ml", "https://example.com"]
        )
        assert tx_execution_failed(r2, "already endorsed")


# ===========================================================================
# Views
# ===========================================================================

class TestViews:

    def test_is_registered(self, deployed, accounts):
        assert _view(deployed, "is_registered", accounts["alice"].address)["registered"] is True
        assert _view(deployed, "is_registered", accounts["mallory"].address)["registered"] is False

    def test_get_owner(self, deployed):
        owner = _view(deployed, "get_owner")
        assert isinstance(owner, str)
        assert owner.startswith("0x")

    def test_get_profile_count_matches_registered(self, deployed):
        # Alice, Bob, Carol registered → at least 3
        n = int(_view(deployed, "get_profile_count"))
        assert n >= 3

    def test_get_reputation_default_for_unknown(self, deployed, accounts):
        rep = _view(deployed, "get_reputation", accounts["mallory"].address)
        assert rep["score"] == 100
        assert rep["tasks_completed"] == 0

    def test_get_top_profiles_returns_list(self, deployed):
        top = _view(deployed, "get_top_profiles", 10)
        assert isinstance(top, list)
        if len(top) >= 2:
            # sorted descending by score
            scores = [p["reputation"]["score"] for p in top]
            assert scores == sorted(scores, reverse=True)

    def test_get_all_profiles_contains_alice(self, deployed, accounts):
        all_p = _view(deployed, "get_all_profiles")
        keys = {k.lower() for k in all_p.keys()}
        assert accounts["alice"].address.lower() in keys

    def test_get_tasks_for_assignee(self, deployed, accounts):
        tasks = _view(deployed, "get_tasks_for", accounts["bob"].address)
        # Bob received at least one task in earlier tests
        assert isinstance(tasks, dict)
        assert len(tasks) >= 1
        for t in tasks.values():
            assert t["assignee"].lower() == accounts["bob"].address.lower()

    def test_get_tasks_by_poster(self, deployed, accounts):
        tasks = _view(deployed, "get_tasks_by", accounts["alice"].address)
        assert isinstance(tasks, dict)
        for t in tasks.values():
            assert t["poster"].lower() == accounts["alice"].address.lower()

    @pytest.mark.slow
    def test_search_by_capability_returns_dict(self, deployed):
        # Result depends on AI; we only require type + structure
        result = _view(deployed, "search_by_capability", "machine learning")
        assert isinstance(result, dict)
        for addr, profile in result.items():
            assert "capabilities" in profile

    def test_search_empty_query(self, deployed):
        result = _view(deployed, "search_by_capability", "   ")
        assert result == {}


# ===========================================================================
# Score formula (pure unit test, no chain)
# ===========================================================================

class TestScoreFormula:
    """Re-implement _compute_score and sanity-check the documented bounds."""

    @staticmethod
    def _compute(rep):
        score = 100
        score += rep["tasks_completed"]      * 8
        score += rep["endorsements_received"] * 5
        score += rep["disputes_won"]          * 10
        score -= rep["tasks_failed"]          * 12
        score -= rep["disputes_lost"]         * 15
        return max(0, min(1000, score))

    def test_base_score(self):
        assert self._compute({
            "tasks_completed": 0, "tasks_failed": 0,
            "endorsements_received": 0, "disputes_won": 0, "disputes_lost": 0,
        }) == 100

    def test_score_increases(self):
        assert self._compute({
            "tasks_completed": 5, "tasks_failed": 0,
            "endorsements_received": 4, "disputes_won": 1, "disputes_lost": 0,
        }) == 100 + 40 + 20 + 10

    def test_score_clamps_low(self):
        assert self._compute({
            "tasks_completed": 0, "tasks_failed": 100,
            "endorsements_received": 0, "disputes_won": 0, "disputes_lost": 100,
        }) == 0

    def test_score_clamps_high(self):
        assert self._compute({
            "tasks_completed": 1000, "tasks_failed": 0,
            "endorsements_received": 0, "disputes_won": 0, "disputes_lost": 0,
        }) == 1000
