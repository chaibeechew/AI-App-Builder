# Batch 130 — Billion-Scale Free AI Foundation

## Goal

Make LANERIQ's free-AI direction an enforceable runtime policy instead of a marketing assumption:

- Local first
- Offline capable by design
- Cloud optional where possible
- Private by default
- Compute once, reuse safely
- Sync only what is necessary
- Same-user devices only
- Free/zero modes never enter LANERIQ-managed paid inference

## Execution ladder

1. Deterministic
2. Scoped reuse
3. Local cache
4. Local engine (NPU → GPU → CPU preference remains in Device Compute policy)
5. Same-user device mesh
6. Verified free provider
7. Verified sponsored capacity
8. Explicit user-approved BYO compute
9. Queue / store-and-forward
10. LANERIQ-managed paid compute only in explicit balanced/paid policy

Zero/free modes stop before step 10.

## Connectivity states

- `online_fast`
- `online_limited`
- `online_expensive`
- `local_network_only`
- `offline`

Remote provider routes require real internet connectivity. `local_network_only` may use a same-user device mesh but cannot claim a cloud route. Fully offline work falls back to local execution or a store-and-forward queue.

## Privacy-safe reconnect sync

Privacy classes are enforced as policy:

- P0 system metadata: aggregate metadata sync allowed
- P1 aggregate operational metadata: aggregate metadata sync allowed
- P2 pseudonymous minimal metadata: minimal metadata only
- P3 user-private content: local by default; sync only after explicit private-sync opt-in, encryption and delta availability
- P4 highly sensitive: never automatic sync

Plaintext private content is never authorized by this policy.

## Existing architecture preserved

Batch 130 extends, rather than replaces:

- Zero-Cost Admission Controller
- Semantic Reuse Network v2
- Provider Router hard-stop semantics
- Device Compute thermal guardian
- NPU → GPU → CPU preference
- own-Desktop preference
- encrypted sync protocol
- cross-user compute forced OFF

## Truth boundary

This batch is **CODE_READY policy and contract evidence**.

It does **not** claim:

- native offline LLM inference is LIVE on iOS/Android/Desktop
- same-user LAN/WebRTC device-mesh transport is LIVE
- native secure key custody or cross-device key exchange is LIVE
- encrypted private sync is Production LIVE
- sponsored compute capacity exists in Production
- billion-user capacity has been load-tested
- all social/economic costs are literally zero

The target is specifically to keep **LANERIQ-managed paid inference at zero for free/zero-mode execution paths**, while compute may be supplied by the user's own device, explicitly verified free/sponsored capacity, or an explicitly approved BYO provider.
