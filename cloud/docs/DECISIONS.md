# Coursework — 2026-11-08

Source baseline is the current Site v2, not the older Drive ZIP or GitHub cloud folder. Existing queues and review workflows are retained.

Research before implementation: [Canvas OAuth](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth), [Courses](https://developerdocs.instructure.com/services/canvas/resources/courses), [Assignment groups](https://developerdocs.instructure.com/services/canvas/resources/assignment_groups). KTH Canvas API tooling was considered; the existing Worker fetch layer is reused instead of a Node-specific client.

Paste a Canvas course URL, use the user's configured authorized API connection, preview active courses and term metadata, select and import. Missing term dates are explicitly uncertain. A pasted URL never grants access. This version retains personal Token setup; multi-user institution OAuth is not implemented and requires administrator-issued developer keys. Other LMS systems remain manual import with adapter metadata, not working automatic connectors.

Course and task identifiers prevent repeat-import duplicates. Pagination is bounded and same-origin; credentials are not forwarded to a new school or hostile pagination host. Syllabus pages remain snapshots; supported same-school file links are downloaded with bounded sizes, PDF/DOCX text is extracted using the existing browser extractor. Missing files/permissions/extraction remain gaps. Up to eight linked attachments are attempted.

Final/midterm/recurring labels are name-based candidates, not verified syllabus semantics. Red impact estimates use published points and group weights, with a 10% threshold. Grade scenarios distinguish currently graded versus zero-filled ungraded work. Drop rules, bonus items, grading periods and missing groups explicitly prevent treating estimates as official Canvas results.

Local tests and typecheck/build pass; external school access and UI interaction are not tested. Managed Sites has no cua_repl.js, so browser QA is skipped per Sites instructions. No paid models were invoked. Windows desktop is a separate implementation and has not been rebuilt.

## Browser-assisted import follow-up

See BROWSER_IMPORT.md for the tested package contract and source decisions. User explicitly authorized development, publication of validated updates and synchronization to GitHub. Session collection is local to the real school browser; no third-party hosted browser account exists here. No model use or subscription was introduced.

## Public anonymous access

User requested a public URL without email/ChatGPT login. Hosted sign-in stays optional for existing private account data. Anonymous API writes still require a high-entropy HttpOnly Secure SameSite=Lax bearer cookie, bootstrapped by a same-origin POST; only the SHA256-derived guest owner ID scopes database records and encryption. No shared anonymous owner or browser-supplied owner ID is accepted. Cookie inactivity lifetime is 30 days; refresh renews it. Clearing the cookie or changing browsers loses access unless files were exported; optional login does not silently merge guest data. Each guest has 20-course and 100MB material checks. Model calls require that visitor's own saved model configuration; no shared creator model key is used. Access policy should be changed from owner-only to public only after the new code is published.

Regression tests cover token validation/stability, guest/user separation, download authorization, private model settings and guest quotas. HTTP anonymous smoke checks are recorded in the release receipt after deployment. No real customer data is used.

## Beginner onboarding guide

User requested detailed setup instructions usable without AI experience. Added public /guide with two entry paths: material organization without model setup, and own-provider AI setup. Covers anonymous-space retention, desktop extension/manual mobile import, syllabus completeness, API account/key/billing distinctions, four setting fields, exact provider base URLs, first source-grounded question, and common errors. Provider buttons only fill configuration fields and never make network/model requests, provision accounts, charge credits or generate keys. Models remain user-chosen from official account availability. Existing sign-in and tenant isolation are unchanged.

Official sources checked before writing: OpenAI billing help (ChatGPT and API separately billed, possible account-specific credits), OpenAI model documentation, DeepSeek official API documentation, Claude key/overview documentation. Claude workspace-scoped key requirement is explained because extra workspace request headers are not exposed in this app. No current price/model ID is hardcoded. The guide explicitly distinguishes model-list checks from successful generation. This is UI/content-only; typecheck, build and public HTTP content checks are appropriate. Browser visual QA remains unverified without cua_repl.js. No live provider requests are made for this update.

## 2026-11-08 — Contextual first-run setup

Replace the long /guide article with a four-step setup before the dashboard: choose AI/library mode, connect AI (optional), create/import first course, review and enter. /guide redirects to /?setup=1. Place help beside fields, collapse advanced settings, save step progress per owner, and enforce completion readiness server-side. Existing workspaces with courses/outputs remain accessible. API checks list models only; generation is never automatically billed. Manual library courses may omit school URL; Canvas still requires a real URL.

Reuse existing React, backend model settings, file extraction and browser importer; no additional dependency or model call. References: https://www.w3.org/WAI/tutorials/forms/multi-page/ and https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/ . Tests cover completion gates, persistence, ownership, optional course deferral and existing workspaces. Browser tools are unavailable here, so visual/browser interaction QA remains pending.

Every release runs scripts/sync-github.py after committing source. It preserves desktop files and verifies remote SHA. GitHub write permission is currently unavailable; pending receipts retain the exact local commit for a later authorized push.
