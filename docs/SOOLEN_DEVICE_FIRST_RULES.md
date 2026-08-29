# Soolen AI — Device-First Compute Rules

Status: Core architecture rule

These rules define the long-term compute architecture for AI App Builder and Soolen AI. Product features should follow them unless a future migration explicitly replaces this architecture.

## 1. Device-first by default

When a user actively starts Build, Generate, Transform, Test, Preview, Render, Voice, Image or Video work, Soolen AI should prefer compute available on the user's own authorized device before paid cloud compute.

Eligible resources include CPU, GPU and NPU/Neural Engine where the operating system and runtime permit access.

Device compute belongs to the user. Installing the app does not grant unlimited background compute access.

## 2. Soolen Brain

Soolen Brain provides intelligence and accumulated automation knowledge. It should:

- understand the user's natural-language goal;
- plan application architecture, pages, data and workflows;
- plan video scripts, scenes, prompts, audio and transformations;
- select appropriate local capabilities/models;
- break large work into smaller jobs;
- validate results and request repair/retry when needed;
- avoid requiring users to understand programming, models or GPU configuration.

## 3. Soolen Device Engine

The Device Engine executes approved work using the user's device where practical. It should detect capabilities rather than assume them.

Capability detection may include device class, memory, CPU concurrency, GPU/WebGPU availability, supported model formats, storage, battery/power state and thermal constraints when exposed by the platform.

It must automatically degrade workloads for weaker devices and can increase quality/parallelism for stronger devices.

## 4. Soolen Automation Engine

The Automation Engine coordinates build, test, repair, preview, packaging and media pipelines. App creation should use local build/test resources where practical instead of treating cloud compute as the default.

All executable build steps must run in a constrained sandbox with an allowlist, resource limits and explicit task scope. Generated code must not receive unrestricted host-system access.

## 5. Video duration is device-driven

Soolen AI must not impose a permanent architectural 30-second video limit. Video duration is a user choice subject to available authorized compute, storage, memory, battery/power, thermal limits and model/runtime capability.

The product may offer convenient presets such as 10 seconds, 30 seconds, 1 minute and 3 minutes, while allowing longer durations when the active runtime can support them. A device that cannot efficiently process the requested duration should not silently fail; Soolen AI should estimate the workload and offer lower resolution, smaller models, sequential rendering, longer processing time, or an authorized compute-pool option.

Long generation should be decomposed into short scenes/chunks and assembled automatically. For example, a 3-minute project can be planned as many independently renderable scenes. Device capability determines scene size, resolution, concurrency and model size.

The pipeline may include text-to-video, image-to-video, photo animation, video editing, real-person-to-cartoon stylization, cartoon-to-realistic-human-style interpretation, authorized voice processing, AI narration, music, captions and final MP4 assembly.

Llama-class language models may plan and orchestrate media jobs but are not themselves assumed to be video-generation models.

## 6. Compute tiers

1. Personal Device Compute — the user's own device processes the user's own active task.
2. Company Compute Pool — an organization may explicitly authorize its own workstations or GPU servers for internal jobs.
3. Soolen Compute Network — a future opt-in network may use voluntarily shared idle compute.
4. Soolen Cloud Compute — optional fallback/acceleration, not the default architectural dependency.

## 7. Shared compute consent

Shared compute is separate from normal app usage and must never be silently enabled by installation.

A future Soolen Compute Network must require explicit opt-in. The user must be able to disable it. Resource limits must be configurable. A suggested default ceiling is no more than 5% of otherwise-idle authorized compute, but the actual scheduler must also respect power, temperature, foreground activity and platform restrictions.

Shared compute must not process another user's private raw content on an untrusted participant device unless a future privacy/security design makes that processing appropriate and explicitly authorized.

## 8. Compute Credits

If shared compute is introduced, contributed work can earn Compute Credits. Credits can be used for eligible Soolen AI compute tasks. Credit accounting must measure verified useful work rather than simply elapsed CPU/GPU time.

## 9. Privacy and control

Local processing should be preferred for sensitive customer or enterprise data when technically practical. Users and enterprise administrators should be told when work is local, company-hosted or cloud-hosted.

Device compute should normally run only during a user-requested task. Background or pooled work requires separate permission.

## 10. Cost principle

Soolen AI should create value primarily through intelligence, orchestration, automation, software and model integration rather than permanently subsidizing every user's GPU workload.

The architecture should minimize per-generation cloud cost while preserving optional cloud acceleration for devices that cannot complete a requested workload locally.

## 11. Portability rule

No core Soolen AI product flow should be permanently locked to one paid AI provider. Model/runtime adapters must be replaceable. Open/local models and customer-owned compute should be first-class deployment targets.

## 12. Product promise

The intended experience is:

User describes the goal → Soolen Brain understands and plans → Device Engine selects authorized compute → Automation Engine executes/builds/tests/renders → user previews the result → Soolen AI packages or installs/exports it.

The user should not need to manually configure CPU/GPU/model details for normal operation.
