# Browser-assisted import — test release

## User flow

1. Download `/downloads/coursework-browser-helper.zip` from Coursework's Add Course dialog.
2. Unzip and load the extension unpacked in Chrome/Edge developer mode. No npm, model account or school API Token is required to run it.
3. Sign in directly at the school's actual Canvas site and complete MFA yourself. Open the extension while that school tab is active.
4. Discover courses, check term dates, select up to five and export `.coursework.json`. Keep the popup open until export ends.
5. In Coursework select that file, inspect the course/account label and missing materials, then explicitly confirm saving to your current account. PDF/DOCX extraction reuses the existing client extractor.

School sessions remain in the user's own browser. This release neither collects passwords nor exports cookies, localStorage or browser profiles. It makes ordinary read requests using the already authenticated school session, including Canvas `/api/v1` routes. It does **not** promise to avoid all data endpoints, authenticate a remote cloud browser or support every LMS.

## Architecture and reuse decision

`browser-extension/collector.mjs` → explicit data-only package → `lib/coursework/browser-package.mjs` → `browser.import` service action → existing R2 materials, task persistence and grade snapshots.

No AI/model calls are used for collection or import. No new npm dependency, browser hosting subscription, login-password store or database migration was needed. Existing task persistence was extracted into one shared routine so API and browser import preserve task identifiers and protected submission states consistently. Existing PDF/DOCX code moved to `lib/client-files.ts` without a second extractor.

Before implementation reviewed [Chrome scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [Playwright authentication](https://playwright.dev/docs/auth), and [Canvas Course Downloader's client](https://github.com/jasp-nerd/canvas-course-downloader/blob/main/src/canvas/client.ts). The latter is MIT-licensed and informed the session-request approach; no source was copied. Its full exporter includes unrelated teacher workflows and a larger build/runtime, so this scoped extension is an independent implementation rather than embedding the entire project. Stagehand/Browser Use remain optional future discovery tools, not runtime dependencies for fixed Canvas reads.

## Scope and gaps

- Desktop Chrome/Edge only for collection. Imported material is usable from the cloud UI on mobile. A phone-only remote browser requires a separately configured provider; none was provisioned or charged.
- Browser-session validity is decided by the school. Login redirects/HTML/401 stop collection; 403 produces an explicit permission gap; rate limiting stops rather than repeated retries.
- Course list pagination is same-origin and bounded. Each course exports at most 500 tasks and 100 grading groups; excess content fails clearly rather than claiming a full import.
- Up to eight syllabus/lecture files per course are attempted; combined attachments are capped at 8MB, each file at 4MB. Unsupported or CORS-blocked downloads remain named gaps. External video systems are not downloaded. The original package remains on the user's device for recovery.
- Course export is student-provided provenance, not a school-signed identity or official submission receipt. Browser data cannot directly mark tasks Submitted/Graded. Older browser snapshots are rejected; partial imports do not replace a previously complete grade snapshot or erase omitted tasks.
- Syllabus HTML remains a page snapshot until a complete readable attachment is imported. A successful download is not proof of complete reading or correct syllabus coverage.
- Extension has only `activeTab` and `scripting`, no blanket host or Cookie permission. It never uploads automatically; users explicitly select and confirm the file in their authenticated cloud account.
- The Site's owner-only audience is preserved. Sharing GitHub source does not grant testers access to that private Site. Testers can run or deploy the code with their own accounts.

## Validation

Run `node --test lib/coursework/*.test.mjs browser-extension/collector.test.mjs`, TypeScript typecheck and `npm run build`. The mocked tests check pagination, session expiry, changed account, hostile origins, projections excluding credential fields, deduplication, owner isolation, protected states, partial snapshots and stale versions. They do not prove real-school or real-extension browser compatibility. Managed Sites browser QA is skipped when `cua_repl.js` is unavailable, as required by the Sites skill. No production school credentials were used.

Package: `python scripts/package-browser-helper.py`; the package uses an explicit file list. Do not put actual `.coursework.json`, school materials, browser profiles or credentials in source control. For multi-model local continuation read `skills/coursework-browser-import/SKILL.md` and `skills/cloud-local-sync/SKILL.md`.
