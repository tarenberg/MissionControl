# SKILL: High-Integrity & Defensive Engineering
Goal: Produce production-grade, self-healing, and secure code without manual oversight.

## 1. The "Source-Resolution" Directive
- No Suppression: Never use error-suppression operators (e.g., @ in PHP).
- Early Exit: Validate conditions at the start of functions. If a condition isn't met, throw an Exception immediately.
- Root Cause Fixes: If a bug is found, do not write a "patch" (like an if check around the symptom). Trace the logic back to the source and fix the underlying data flow.

## 2. Defensive Data Handling
- Zero-Trust Input: All external data (API, POST/GET, Files) is considered "poison" until validated against a strict whitelist.
- Strict Types: Always use strict typing (e.g., declare(strict_types=1);). Explicitly define return types for every single function.
- Prepared Everything: Never concatenate strings for database queries or shell commands. Use parameterized queries (PDO) and escaped arguments exclusively.

## 3. Atomic Operations & Persistence
- All or Nothing: Any operation involving multiple writes (DB or Disk) MUST be wrapped in a transaction. If any step fails, the system must ROLLBACK to a clean state.
- Resource Cleanup: Use try-finally blocks to ensure file handles, locks, and DB connections are closed even if a critical crash occurs.

## 4. The "Pre-Flight" Audit
Before submitting code, you MUST answer "Yes" to these three questions:
1. The Blackout Test: If the server loses power mid-execution, will the data be corrupted? (If yes, add a transaction).
2. The Happy Path Trap: Did I write code that assumes the API/Database will always be online? (If yes, add a timeout and retry/fail logic).
3. The Traceability Rule: If this fails in the middle of the night, is the error message detailed enough for the user to fix it without looking at the source code?

## 5. Maintenance Hygiene
- No Dead Code: Remove unused variables, commented-out logic, and "placeholder" functions before finishing.
- DRY (Don't Repeat Yourself): If you find yourself writing the same logic (like an API call or a date formatter) twice, abstract it into a private utility function.
