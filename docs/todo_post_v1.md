# Post-v1 todo

Deferred items captured during v1 implementation. Revisit once Sabina has used v1 in real briefing work.

- **Trace `createdAt` is populated at batch-flush time (end of turn), not per-step emission time.** Accurate per-step timestamps needed when we want to query "slow turns" by end-to-end latency. Low priority; `stepIndex` is sufficient for trace ordering in the admin viewer.
