# Public pages

`privacy.html` is the Privacy Policy linked from Settings in the app. It is
plain static HTML with no JavaScript, intended for GitHub Pages.

## Before publishing

Replace these placeholders:

| Placeholder                | Where                           |
| -------------------------- | ------------------------------- |
| `Nikita Domitrak`          | `docs/privacy.html`, section 10 |
| `nikitadomitrak@gmail.com` | `docs/privacy.html`, section 10 |
| `veselhmelnik`             | `constants/legal.ts`            |

## Publishing with GitHub Pages

1. Push the `docs` folder to GitHub on the `main` branch.
2. In the repository: **Settings → Pages → Deploy from a branch**, branch
   `main`, folder `/docs`.
3. The page becomes available at:
   `https://veselhmelnik.github.io/workout-tracker/privacy.html`

## After publishing

Update `PRIVACY_POLICY_URL` in `constants/legal.ts` with the real username, and
with the repository name if it is not `setline`. Open Settings → Privacy Policy
once on a device to confirm the link resolves.
