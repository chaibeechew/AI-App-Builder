# Soolen AI — Device-First / Zero-Cloud-Cost Architecture Rules

Status: Core architecture rule

These rules define the long-term compute architecture for LANERIQ AI and Soolen AI. Product features should follow them unless a future migration explicitly replaces this architecture.

## 1. Device-first by default

When a user actively starts Build, Generate, Transform, Test, Preview, Render, Voice, Image or Video work, Soolen AI should prefer compute available on the user's own authorized device before paid cloud compute.

Eligible resources include CPU, GPU and NPU/Neural Engine where the operating system and runtime permit access.

Device compute belongs to the user. Installing the app does not grant unlimited background compute access.

The architectural target is zero mandatory per-generation cloud-GPU cost for workloads that an authorized customer device or customer compute pool can execute. This is a cost target, not a promise that electricity, hardware, storage, bandwidth or every optional service has zero cost.

## 2. Soolen Brain

Soolen Brain provides intelligence and accumulated automation knowledge. It should understand natural-language goals, plan application architecture and media projects, select appropriate local capabilities/models, split large work into smaller jobs, validate results, repair/retry failed jobs, and avoid requiring users to understand programming, models or GPU configuration.

## 3. Soolen Device Engine

The Device Engine executes approved work using the user's device where practical. It detects capability rather than assuming it.

Capability detection may include device class, memory, CPU concurrency, GPU/WebGPU availability, supported model formats, storage, battery/power state and thermal constraints when exposed by the platform.

It automatically reduces workload for weaker devices and can increase quality or parallelism for stronger devices.

## 4. Soolen Automation Engine

The Automation Engine coordinates build, test, repair, preview, packaging and media pipelines. App creation should use local build/test resources where practical instead of treating cloud compute as the default.

All executable build steps must run in a constrained sandbox with an allowlist, resource limits and explicit task scope. Generated code must not receive unrestricted host-system access.

## 5. Video duration is device-driven

Soolen AI must not impose a permanent architectural video-duration limit. Duration is a user choice subject to available authorized compute, storage, memory, power/thermal limits and model/runtime capability.

The UI may offer convenient presets such as 15 seconds, 30 seconds, 1 minute and 3 minutes while allowing longer projects when the runtime supports them.

## 6. 15-second chunk strategy

Fifteen seconds is the default logical video chunk, not a maximum video length.

Soolen Brain should convert a longer project into a storyboard and a sequence of independently renderable chunks. Example: a 3-minute project can be represented as twelve 15-second chunks. The Device Engine may shorten chunks on weaker hardware or increase chunk size on capable hardware when the active model supports it.

Each chunk has its own job state and checkpoint. If one chunk fails or the user changes one scene, only affected chunks should be regenerated whenever possible. Completed valid chunks should be reused rather than recomputed.

Multiple authorized GPUs/devices may render independent chunks in parallel. A single device may render them sequentially.

## 7. Scene Continuity Engine

Soolen AI should preserve continuity across independently generated chunks. A project continuity manifest may include character/reference descriptors, authorized identity references, clothing, environment, visual style, palette, camera direction, motion, voice assignment, timing, seed/model metadata where supported, and boundary/keyframe references.

The end state/keyframe of one scene can be used as context for the next scene when supported. Continuity validation occurs before final assembly, and only problematic chunks should be retried when practical.

## 8. Merge and finishing pipeline

After valid chunks are ready, Soolen Automation Engine assembles them into the requested project. The finishing pipeline may include transitions, original or authorized replacement audio, AI narration, music, sound effects, captions, normalization and final MP4/WebM export.

Media capabilities may include text-to-video, image-to-video, photo animation, video editing, real-person-to-cartoon stylization and cartoon-to-realistic-human-style interpretation. Llama-class language models may plan/orchestrate these jobs but are not assumed to be video-generation models themselves.

## 9. Compute tiers

1. Personal Device Compute — the user's own device processes the user's active task.
2. Company Compute Pool — an organization may explicitly authorize its own workstations or GPU servers for internal jobs.
3. Soolen Compute Network — a future opt-in network may use voluntarily shared idle compute.
4. Soolen Cloud Compute — optional fallback/acceleration, not the default architectural dependency.

## 10. Shared compute consent

Shared compute is separate from normal app usage and must never be silently enabled by installation.

A future Soolen Compute Network must require explicit opt-in. The user must be able to disable it. Resource limits must be configurable. A suggested default ceiling is no more than 5% of otherwise-idle authorized compute, while the scheduler must also respect power, temperature, foreground activity and platform restrictions.

Shared compute must not process another user's private raw content on an untrusted participant device unless a future privacy/security design makes that processing appropriate and explicitly authorized.

## 11. Compute Credits

If shared compute is introduced, contributed verified useful work can earn Compute Credits. Credits can be used for eligible Soolen AI compute tasks. Accounting should measure verified useful work rather than simply elapsed CPU/GPU time.

## 12. Privacy and control

Local processing should be preferred for sensitive customer or enterprise data when technically practical. Users and enterprise administrators should be told when work is local, company-hosted or cloud-hosted.

Device compute should normally run only during a user-requested task. Background or pooled work requires separate permission.

## 13. Cost principle

Soolen AI creates value primarily through intelligence, orchestration, automation, software and model integration rather than permanently subsidizing every user's GPU workload.

Customer-owned compute and open/local models are first-class targets. Paid cloud generation must not be a mandatory dependency for the core local-capable path. Optional cloud acceleration may exist for users who choose it or whose devices cannot execute a requested workload.

## 14. Portability rule

No core Soolen AI product flow should be permanently locked to one paid AI provider. Model/runtime adapters must be replaceable. Open/local models and customer-owned compute should be first-class deployment targets.

## 15. Product flow

User describes goal → Soolen Brain understands/plans → storyboard/job graph → Device Engine selects authorized compute → chunks/jobs render/build/test → continuity/validation → retry only affected work → merge/package → voice/music/captions where requested → preview → install/export.

The user should not need to manually configure CPU/GPU/model details for normal operation.