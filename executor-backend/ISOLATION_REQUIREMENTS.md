# Soolen Executor Backend Isolation Requirements

Generated customer code is untrusted. Never run it in the LANERIQ AI web process or directly on an unrestricted host.

A production platform isolation driver MUST enforce:

- Separate ephemeral container or microVM per job.
- Non-root user and read-only root filesystem.
- No host filesystem mounts, Docker socket, cloud metadata credentials, environment secrets, SSH agent, or service-account credentials.
- Network denied by default. Any future allowlist requires an explicit product permission and separate policy review.
- CPU, memory, PID, disk, output-size and wall-clock limits.
- Workspace destroyed after every job.
- Dependency installation restricted by allowlist/lockfile policy; lifecycle scripts disabled unless explicitly approved.
- Build and browser-test processes separated from the control plane.
- Browser tests use an isolated origin and cannot navigate to arbitrary external hosts.
- Logs must be bounded and redact credentials/private data.
- A missing, timed-out or inconclusive result is failure/inconclusive, never success.

`server.js` deliberately returns `platform-isolation-driver-not-connected` until a real isolation platform driver is supplied. This fail-closed behavior must not be removed.