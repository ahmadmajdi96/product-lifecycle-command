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

- PLM data is persisted in Lovable Cloud; the client store is a shared cache with optimistic writes and error reloads, not localStorage demo storage.
- Entity profiles use a shared dialog provider and linked identifiers so related records open consistently across all PLM pages.
- Controlled files use private storage and short-lived signed URLs; password verification uses an authenticated server function before a signature action.
- tsconfig has `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitReturns` off to keep dense UI code readable.
- Shared PLM presentation uses the reference MES theme tokens, sidebar, top bar and panel patterns; search opens existing record profiles without introducing a second data source.
