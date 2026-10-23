# Reference images and text — v0.5.0

Previously the create form previewed attachments but validation discarded them, and follow-ups did not send them. New projects and follow-ups now use the same request body for quotes and generation. The follow-up composer exposes the same attach/remove controls. Files apply to the current message; the owner must reattach them on later turns.

## Transport and validation

- Up to six files and 180,000 encoded/UTF-8 bytes combined, within the unchanged 200,000-byte full request limit. Existing source can reduce available attachment capacity.
- Browser images are rasterized to JPEG, max side 768 pixels, quality 0.72. Browser source images over 20 MB are rejected. Server accepts only inline base64 PNG/JPEG with matching signature/header, positive dimensions and at most 768 pixels per side. This is bounded header validation, not full image decoding. Corrupt images may still be rejected by the provider.
- Text/code filenames must have a supported extension; each file is at most 40,000 characters. No silent truncation. Total budgets count UTF-8 bytes; binary/NUL data, unsafe filenames, unsupported MIME, remote URLs and malformed base64 are rejected before a reservation/model call.
- OpenAI Responses uses image content blocks with low detail; the legacy Chat Completions adapter uses its image URL block. Claude receives base64 image blocks; Gemini Interactions receives inline image content with low resolution. Text references enter the JSON user context with explicit filenames. Raw image data is never serialized as model text.
- References are treated as untrusted user data. With an image, shared instructions ask for an observable visual brief, separating observations from inferred techniques, prioritising an implementable subset and disclosing omissions. This incorporates the owner's research report's image-brief guidance; broader shader modularization is not part of this release.

## Credits and retention

Quotes now estimate the composed system/user context, including selected skills, source, repair diagnostics and reference text. Each bounded image adds a conservative 8,192-input-token reservation allowance, not base64 character count or a claim about exact provider tokenization. The same estimator supplies fallback input usage when upstream usage is missing. Provider-reported input usage remains authoritative when supplied. The one-credit minimum, rates and settlement/refund rules are unchanged; actual costs may differ from estimates.

No extra image-description model call or automatic retry was added. The UI displays an attachment-inclusive estimate and reservation. Existing model-menu estimates are labelled as before references.

ModHorizon does not copy attachment data into its stored project object, browser project history, source ZIP or build logs. Only a reference count is logged. The selected AI provider processes the uploaded data under its own policies. OpenAI Responses and Gemini requests explicitly disable response storage; this is not a promise of zero provider retention. Images are not recalled after reload or retained on later turns; attach again when needed. This release does not change authentication, provider keys or the testing model lock.

## Validation and limits

Automated checks cover new/follow-up validation, malformed and remote inputs, spoofed image types, dimensions/count/byte limits, unsafe names, text references, all four adapter payload variants, usage/fallback accounting and absence of attachment bytes from project history. Isolated browser checks use a real reference image and intercepted API responses: create, quote, follow-up, JPEG resizing, persisted history, desktop/mobile layout and no console exceptions. No live provider generation or paid API call was used. Real model visual interpretation and improved shader quality remain owner acceptance checks; structural and transport success do not establish those outcomes.

Primary API references checked 23 October 2026:

- [Official OpenAI images and vision documentation](https://developers.openai.com/api/docs/guides/images-vision?api-mode=responses)
- [Claude image content blocks](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Gemini Interactions image inputs](https://ai.google.dev/gemini-api/docs/image-understanding)
