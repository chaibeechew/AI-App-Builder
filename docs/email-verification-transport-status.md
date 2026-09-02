# Email Verification Transport Status Contract

Production readiness is healthy only when all three LANERIQ verification stages are true: guard, storage, and delivery.

A `503` from `/api/auth/verification/request` with the delivery stage false is a transport configuration failure, not a reason to bypass LANERIQ verification or enable paid SMS. Fix the outbound email transport, redeploy Production, and request a fresh code.
