# Coursework — 2026-11-08

Source baseline is the current Site v2, not the older Drive ZIP or GitHub cloud folder. Existing queues and review workflows are retained.

Research before implementation: [Canvas OAuth](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth), [Courses](https://developerdocs.instructure.com/services/canvas/resources/courses), [Assignment groups](https://developerdocs.instructure.com/services/canvas/resources/assignment_groups). KTH Canvas API tooling was considered; the existing Worker fetch layer is reused instead of a Node-specific client.

Paste a Canvas course URL, use the user's configured authorized API connection, preview active courses and term metadata, select and import. Missing term dates are explicitly uncertain. A pasted URL never grants access. This version retains personal Token setup; multi-user institution OAuth is not implemented and requires administrator-issued developer keys. Other LMS systems remain manual import with adapter metadata, not working automatic connectors.

Course and task identifiers prevent repeat-import duplicates. Pagination is bounded and same-origin; credentials are not forwarded to a new school or hostile pagination host. Syllabus pages remain snapshots; supported same-school file links are downloaded with bounded sizes, PDF/DOCX text is extracted using the existing browser extractor. Missing files/permissions/extraction remain gaps. Up to eight linked attachments are attempted.

Final/midterm/recurring labels are name-based candidates, not verified syllabus semantics. Red impact estimates use published points and group weights, with a 10% threshold. Grade scenarios distinguish currently graded versus zero-filled ungraded work. Drop rules, bonus items, grading periods and missing groups explicitly prevent treating estimates as official Canvas results.

Local tests and typecheck/build pass; external school access and UI interaction are not tested. Managed Sites has no cua_repl.js, so browser QA is skipped per Sites instructions. No paid models were invoked. Windows desktop is a separate implementation and has not been rebuilt.

## Browser-assisted import follow-up

See BROWSER_IMPORT.md for the tested package contract and source decisions. User explicitly authorized development, publication of validated updates and synchronization to GitHub. Session collection is local to the real school browser; no third-party hosted browser account exists here. No model use or subscription was introduced.
