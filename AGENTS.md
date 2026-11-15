<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Controlled PLM writes use transactional PostgreSQL commands through authenticated server functions; the legacy client store is a read-only reference cache because optimistic browser writes cannot authorize manufacturing definitions.
- Entity profiles use a shared dialog provider and linked identifiers so related records open consistently across all PLM pages.
- Controlled files use private storage and short-lived signed URLs; password verification uses an authenticated server function before a signature action.
- tsconfig has `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitReturns` off to keep dense UI code readable.
- Shared PLM presentation uses the reference MES theme tokens, sidebar, top bar and panel patterns; search opens existing record profiles without introducing a second data source.
- Controlled identities and revisions share a typed payload contract and organization/site scope; draft edits carry expected versions and released content remains immutable to preserve history.
- File registration consumes a server-issued verification receipt in a user-scoped transaction, binding the real file hash into revision content; this prevents forged browser metadata and keeps signed links scoped.
- New user-created workspaces are sandbox-only; production scope and controlled actions require verified Access Hub authority and never inherit local administrator privileges.
- Appendix A governs package workflow (Draft/In review/Approved/Released); publication, consumer acceptance and effectivity are separate, resolving the WP7 lifecycle wording conflict.
- Password recovery uses a public reset page and the shared root auth listener to capture recovery sessions; ordinary sign-in never substitutes for a recovery link.
