# Agent-Rep (RepScore)

Agent-Rep is a deterministic reputation tracking system designed specifically for decentralized networks and AI validators. Built natively on GenLayer, it provides a transparent, immutable mechanism to score network participants based strictly on their historical consensus behavior and reliability.

## 🎯 The Problem

In decentralized environments powered by autonomous AI agents and independent validators, maintaining high-quality consensus is critical. When agents consistently deviate from the majority, provide poor evaluations, or act maliciously, the integrity of the entire network is compromised. Traditional penalty systems are often overly complex, subjective, or rely on centralized governance to enforce slashing and bans.

## 💡 The Agent-Rep Solution

Agent-Rep provides a mathematically deterministic, fully on-chain reputation ledger using GenLayer **Intelligent Contracts**. It automatically evaluates and adjusts validator scores in real-time, functioning as a "Verifiable Trust" layer for the ecosystem without requiring subjective human intervention.

### Core Mechanics

* **Baseline Reputation:** Every registered AI agent or validator is initialized with a default baseline score (starting at 100). This state is immutably and efficiently tracked on-chain within a `TreeMap`.
* **Deterministic Penalties:** The system continuously monitors consensus voting rounds. If an agent or validator votes against the established majority in a given round, the contract's `log_dissent` protocol is automatically triggered for that specific address.
* **Automated Score Decrements:** Dissenting behavior results in a mathematically deterministic penalty, directly decrementing the agent's reputation score by 1 point. Because this relies purely on deterministic math, it bypasses the need for complex, non-deterministic consensus methods (such as `gl.nondet` or `gl.eq_principle`), making execution incredibly fast and gas-efficient.
* **Mathematical Safeguards:** The Intelligent Contract logic includes rigorous underflow protection, ensuring that an agent's score can never drop below zero, maintaining strict state stability regardless of how many penalties an agent accrues.
* **Verifiable Trust Graph:** By continuously updating these scores based on actual network participation, Agent-Rep builds a public trust index. Other protocols, smart applications, or clients can instantly query an agent's RepScore before delegating tasks, ensuring that only the most reliable, consensus-aligned agents are utilized for critical operations.

## 🔄 System Workflow

1. **Initialization:** A new AI agent or validator address is registered within the Intelligent Contract and assigned the default starting score of 100.
2. **Network Participation:** The agent actively participates in standard network voting, evaluations, or data processing rounds.
3. **Consensus Review:** At the conclusion of a round, the network's voting results are evaluated against the individual agent's output.
4. **Automated Scoring:**
   * *If the agent aligned with the majority:* Their score is maintained, indicating reliable behavior.
   * *If the agent dissented:* The contract securely executes `log_dissent(validator_addr)`, applying the deterministic penalty.
5. **State Update:** The newly adjusted RepScore is permanently written to the GenLayer blockchain, serving as a live, queryable metric of that agent's trust level for the entire Web3 ecosystem.

---
*Quantifying trust. Securing consensus.*
