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

- Keep the administration surface at `/warzone` with no links from public pages, so its entry point remains undisclosed to visitors.
- Store uploaded profile pictures as private storage paths in the existing site settings; resolve short-lived image URLs for display, with writes restricted to admins and visitor reads restricted to the current picture, because public buckets are unavailable.
