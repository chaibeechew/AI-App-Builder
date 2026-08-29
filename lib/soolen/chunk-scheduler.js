// Soolen Autonomous Chunk Scheduler
// Bounded retries, affected-work-only regeneration and cancellation.

export function createChunkScheduler(jobs = [], options = {}) {
  const maxRetries = Math.max(0, Math.min(5, Number(options.maxRetries ?? 2)));
  const concurrency = Math.max(1, Math.min(8, Number(options.concurrency ?? 1)));
  const state = new Map(jobs.map((job) => [job.id, { ...job, status: "pending", attempts: 0, errorCode: null, output: null }]));
  let cancelled = false;

  function list() { return [...state.values()]; }
  function cancel() { cancelled = true; for (const job of state.values()) if (["pending","queued"].includes(job.status)) job.status = "cancelled"; }
  function invalidate(ids = []) { for (const id of ids) { const job = state.get(id); if (job) Object.assign(job, { status: "pending", attempts: 0, errorCode: null, output: null }); } }

  async function run(executor) {
    if (typeof executor !== "function") throw new Error("SOOLEN_EXECUTOR_REQUIRED");
    const queue = () => list().filter((j) => j.status === "pending" || (j.status === "failed" && j.attempts <= maxRetries));
    while (!cancelled && queue().length) {
      const batch = queue().slice(0, concurrency);
      await Promise.all(batch.map(async (job) => {
        if (cancelled) return;
        job.status = "running";
        job.attempts += 1;
        try {
          job.output = await executor({ ...job });
          job.status = "complete";
          job.errorCode = null;
        } catch (error) {
          job.errorCode = error?.code || error?.name || "EXECUTION_FAILED";
          job.status = job.attempts > maxRetries ? "blocked" : "failed";
        }
      }));
    }
    return { cancelled, jobs: list(), complete: list().every((j) => j.status === "complete") };
  }

  return { maxRetries, concurrency, list, run, cancel, invalidate };
}
