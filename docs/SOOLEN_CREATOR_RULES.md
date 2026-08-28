# Soolen AI Creator Rules — staged for next upload

## Product
- Company: Soolen AI Technologies Sdn. Bhd.
- Platform: Soolen AI
- Primary product: AI App Builder

## Creation inputs
- Text idea
- Voice idea/transcript
- Hand-drawn sketch upload
- Reference image upload
- Image/sketch can be used as a visual app-template input
- Existing app/reference can guide modifications

## Fair AI usage
- Show an estimated AI cost before a charge whenever a paid operation is triggered.
- No hidden fees.
- Failed generation is automatically refunded when credits were charged.
- Failed modification is automatically refunded when credits were charged.
- Simple modifications cost substantially less than major structural changes.
- Preserve existing functionality when a requested change is small.

## Quality gates
- Normalize generated specifications.
- Run self-test before reporting generation success.
- Run self-test after modifications.
- Add publish-readiness checks before the future Publish action.

## Optional demo video
- Demo video is optional.
- Demo video is a paid unlock.
- A purchased demo can be embedded in the customer's created app where supported.

## Advertising
- Maximum 1 advertisement per user/device local calendar day.
- Do not show an advertisement on every app open.
- Reopening the app multiple times on the same local day must not create another ad impression.
- The staged DailyAdSlot uses localStorage for the daily frequency cap. A server-side account-level cap can be added later if cross-device enforcement is required.

## Tomorrow's UI integration
1. Add `components/creator/SketchUpload.js` to the Create screen.
2. Pass the uploaded image data/reference to `/api/generate` using `sketchImage` or `referenceImages`.
3. Add `components/ads/DailyAdSlot.js` to a natural non-blocking placement in the app shell.
4. Before paid Generate/Modify actions, call `/api/pricing/quote` and display the estimate.
5. Keep Create → Modify → Preview → Test → Publish → Rollback as the main flow.
