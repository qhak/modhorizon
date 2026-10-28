# Local community acceptance — 26 October 2026

This record concerns the local site on port 3215 with two real, confirmed Supabase sessions and local D1 data. The creator and viewer profiles are explicitly labelled test fixtures. No production community migration, publication or deployment is part of this test. Account emails, auth IDs, cookies and temporary moderator configuration are excluded.

## Completed checks

- Creator profile saved through the browser. Discovered that the first save did not refresh client profile state: the immutable handle remained editable until a refresh. Update the saved profile in client state immediately; verified the second profile locks its handle after its initial save without refreshing.
- Created a Cherry Diamond Tools test showcase with a real owner-supplied game screenshot. The uploaded screenshot was resized and the draft saved successfully.
- Anonymous reads of the private post, public showcase route and screenshot returned 404; anonymous moderation returned 401.
- Switched to a distinct confirmed account. Direct private-post and screenshot reads returned not-found messages; its edit form did not receive the creator's data. Its moderation request was denied. Its own profile saved separately.
- Creator submitted for review. Pending post/screenshot remained unavailable anonymously. With explicitly approved temporary local moderator access, the review queue displayed the correct content and screenshot.
- Approval exposed the post, screenshot, Explore entry and creator-profile project publicly on localhost.
- Editing approved content, saving as draft and resubmitting withdrew public access until another approval.
- The separate Unpublish action returned the published post to a draft and removed it from anonymous reads and Explore. The retained draft could be resubmitted and approved again.

## Interaction and cleanup checks

- Confirmed the active profile handle before the final interaction pass. The viewer added a like and a correctly attributed comment; both survived a reload. A separate creator-authored comment also persisted, with `<b>not HTML</b>` rendered literally rather than interpreted as markup.
- Viewer follow state survived reload; unfollowing worked. Found that the profile header retained the old follower total after toggling. Refresh the current server-rendered route after a successful follow mutation, preserving client state; verified the header and control both update to zero without a manual reload.
- Viewer submitted a report, which appeared under that viewer's handle in the creator/moderator queue. Hiding the reported showcase removed it from public post, screenshot and comment reads (all 404). The owner's resubmission attempt was rejected.
- Hide owner Edit/Unpublish controls for moderation-hidden rows, matching the server restriction; direct attempts still fail at the server.
- Removed the explicitly authorized temporary local moderator assignment. Restored the ignored local environment file byte-for-byte against its original hash, restarted the preview, and verified the formerly authorized signed-in account is denied moderator access.
- Retained the labelled local test profiles and hidden showcase as reproducible local fixtures; no production posts were created. Browser login switching was completed by the owner; no passwords/tokens were exported.

The scoped two-account local acceptance flow is complete. Production staging and the launch gaps below remain separate.

## Verification limits

This tests the existing local runtime and verified sessions, not a fresh signup/confirmation/SMTP sequence, production Cloudflare behavior, search indexing or download safety. Automated suite: 204 tests, TypeScript and the isolated production build pass after the UI corrections. Browser interaction results above are additional evidence, not substituted fixture tests.
