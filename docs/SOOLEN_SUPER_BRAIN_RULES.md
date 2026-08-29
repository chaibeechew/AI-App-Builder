# Soolen AI Super Brain Rules

Status: Core architecture rule

## Purpose
Soolen AI should become more capable through reasoning, planning, testing, repair and reusable method-level experience without turning customer private content into shared training data by default.

## Brain architecture
Soolen Super Brain is composed of cooperating capabilities: Reasoning Brain, Memory Brain, Experience Brain, Planner Brain, Specialist Brains, Critic/Test Brain, Device Intelligence Brain, Autonomous Engine and Meta Brain.

The normal loop is:

Goal → Reason → Plan → Act → Test → Critic → Repair → Verify → Extract safe reusable experience → Meta evaluation.

## Customer Data — Task Use Only by Default
Customer prompts, photos, videos, voice samples, files, source code and private project information may be used as context only for the customer-requested task by default.

They must not automatically become permanent global training data, cross-customer memory or reusable raw examples.

Global learning from identifiable or private customer content requires a separate explicit opt-in and must support applicable withdrawal/deletion controls.

## Learn the method, not the customer's private data
Soolen may retain safe method-level experience where appropriate, such as non-identifying success/failure codes, strategy effectiveness, model/runtime compatibility, performance classes, repair patterns and generalized technical lessons.

Reusable experience must not contain raw customer media, voice samples, secrets, authentication material, full private prompts, personal files or reconstructable private content.

## Memory separation
System knowledge, reusable Soolen experience, project memory and private task context are separate logical data classes. Private task context must not silently flow into global experience storage.

## Critic before acceptance
Autonomous output is not considered complete merely because generation finished. The system should test completion, functional correctness, security, privacy and output verification. Failed checks return affected work to repair rather than silently accepting it.

## Autonomous permission boundary
Autonomous does not mean unlimited permission. Soolen may autonomously choose methods and coordinate work only inside the user's authorized task scope and the applicable security/privacy policy.

Network access, background compute, shared compute, private-data reuse and other elevated capabilities must not be inferred merely from installation or ordinary use.

## Device-first execution
Use the existing Soolen Device-First rules. Device capability should influence workload size, model/runtime choice, quality and parallelism. Executable generated work requires sandboxing and least privilege.

## Specialist architecture
Specialists may cover coding, UI/UX, database, testing, security, media, voice/audio and other domains. Specialists operate under the same central privacy/security policy; an agent cannot grant itself additional permissions.

## Meta learning
Meta learning compares safe experience signals to improve future strategy selection. It may learn that one method is more reliable, faster or safer than another, but must not use this mechanism to bypass customer-data restrictions.

## Security invariant
Privacy and security controls are enforcement requirements, not suggestions to the language model. Where technically possible they must be implemented as deterministic code checks, sandbox boundaries, allowlists, scoped permissions and data-lifecycle controls.
