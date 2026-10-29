# Device-risk signup review (disabled by default)

This feature is review-only. Scores are uncalibrated matching points, not fraud probabilities, and never block an account or grant or deny credits. Browser signals are spoofable and do not identify a person reliably. No cross-project linking is performed.

## What is built

For this voluntary test, a visitor can explicitly opt in to collection before email signup, email login, or Google sign-in. A pending marker is set only when the box is checked. After authentication and email confirmation, the account page in the same browser collects the device signals and sends them to a same-origin authenticated endpoint. Multiple devices can be recorded for one account; repeated observations of the same stored device ID do not create duplicate rows. These are **observed account devices**, not necessarily confirmed new signups. Signup completion on another browser, cleared storage, blocked scripts, opting out, or direct API usage can bypass collection. No IP is collected. Do not rely on this as a one-account-per-person control.

The server validates the payload, uses a per-project server-side HMAC key for individual signals, and stores protected values and the verified account ID in D1. The owner can access at most 100 recent records through `GET /api/device-risk`; an associated email is joined from the billing table when available. Email is not stored in the fingerprint table. Records older than 30 days are excluded from results and removed on the next record or owner read; this is not a scheduled hard-deletion guarantee. Account deletion removes that account's records. A concurrent account-deletion marker prevents a new write. Values are pseudonymous, not anonymous.

## Activation prerequisites

- Perform a UK/EU privacy and legal review for this specific use, determine the lawful basis and whether consent is required, publish an accurate notice, and establish a deletion/retention process **before activation**. The signup notice included here is not a complete privacy policy.
- Apply the D1 migration in the intended environment before enabling. Keep the feature disabled if migration or testing fails.
- Set `DEVICE_RISK_ENABLED=true`, `DEVICE_RISK_OWNER_EMAIL` to the verified owner account's email, and `DEVICE_RISK_HMAC_SECRET` to a random server-only secret of at least 32 bytes in the deployment secret manager. Never set a public-prefixed secret or commit it. Use a distinct key for each project. Rotating it makes previous hashes incomparable.
- Verify that the owner login works and that another signed-in user and an unauthenticated request cannot see records. Test actual email and OAuth signups in a safe environment, validate deletion, and confirm access logs don't contain request bodies.
- Set up scheduled deletion of expired records if hard 30-day retention is required. Current cleanup happens on later record or owner read only.
- The desktop pairing flow uses a five-minute, memory-only bearer credential delivered to the app via a localhost listener with an unpredictable state. The browser must permit loopback requests from the HTTPS site. Test this against the real browser and deployment; it is not yet production-verified. Do not expose or log the bearer credential.

The desktop app must be running and its **Connect ModHorizon** button pressed. Sign in as the configured owner in the browser and approve the connection. Token expiry requires reconnecting. The app's local demo is separate from online data.
