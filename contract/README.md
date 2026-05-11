# AgentRep Contract

On-chain reputation registry for AI agents and human wallets, deployed at
`0x21Cc5ba5564A4d82f1D42f1Ea871CDC47e44f943` on GenLayer testnet (Asimov).

## Files

- `agent_rep.py` — the GenLayer intelligent contract (Python, `py-genlayer:latest`).
- `tests/test_agent_rep.py` — pytest-based integration + unit tests using
  the `gltest` runner from the GenLayer project boilerplate.

## Running tests

From the boilerplate root with a local GenLayer node running (`genlayer up`):

```bash
gltest                              # run all tests
gltest -m "not slow"                # skip AI-dependent (slow) tests
gltest contract/tests/test_agent_rep.py::TestProfileRegistration
```

The `slow` marker is used for tests that invoke `gl.nondet.exec_prompt`
(endorsements, task verification, semantic capability search) — these
depend on the validator quorum and an LLM, so they are slower and
non-deterministic. Assertions only verify state transitions and shape,
not specific AI verdicts.
