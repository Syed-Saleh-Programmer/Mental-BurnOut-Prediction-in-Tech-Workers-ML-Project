# GitHub Pages deployment

The workflow at [pages.yml](../.github/workflows/pages.yml) runs on **every push**, including branch and tag pushes, and can also be started with **Run workflow**. Every run builds the frontend; successful pushes to the repository's **default branch** also publish it. Other branches validate the build without replacing the public site.

## What Pages hosts

GitHub Pages serves the static Vite frontend. It cannot run the Python FastAPI process, hold HR analyses, load the saved model, or provide the assessment API. Those functions require a separately hosted backend.

There is currently no public backend URL configured in this project. The frontend can still deploy and open its landing/workspace interfaces. API-dependent actions explicitly report that the analysis service is not connected. No model predictions or assessment results are fabricated as a fallback.

## One-time repository setup

1. Push this project, including `.github/workflows/pages.yml`, to your GitHub repository.
2. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. Ensure Actions are enabled for the repository.
3. If the first run happened before Pages was enabled, rerun it from **Actions → Build and deploy Workwell to GitHub Pages**.
4. Push to the default branch, or run the workflow manually with the default branch selected.
5. Open the deployment URL shown in the workflow's `github-pages` environment.

The default branch is read from GitHub event metadata; it is not hard-coded to `main` or `master`. The deployment environment must allow that branch. Actions are pinned to full commit SHAs from the official Vite deployment example. Only the deploy job receives Pages-write and OIDC-token permissions.

## Use the default GitHub Pages URL

The deployment uses **`https://OWNER.github.io/REPOSITORY/`**, where GitHub supplies the owner and repository names. A repository named `OWNER.github.io` uses the root address `https://OWNER.github.io/`. No custom domain, domain purchase, or DNS configuration is needed.

In repository **Settings → Pages**, keep **Source** set to **GitHub Actions** and remove any value under **Custom domain**. If a custom domain is inherited from the owner's `OWNER.github.io` site repository, remove it in that repository's Pages settings as well. Then rerun the workflow or push to the default branch. The deployment environment displays the resulting site URL.

The workflow checks that the reported hostname ends in `.github.io`, and derives asset paths from GitHub's Pages metadata. It does not guess an account name or hard-code a domain. This local update does not change remote repository settings.

## URLs, repository names, and refreshes

`actions/configure-pages` supplies the real Pages base path to Vite, supporting both repository sites and root user/organization sites. Pages builds use hash routing, for example:

```text
https://OWNER.github.io/REPOSITORY/
https://OWNER.github.io/REPOSITORY/#/hr
https://OWNER.github.io/REPOSITORY/#/individual
```

Bookmarks and refreshes retain the hash route without requiring server-side SPA rewrites. Local Vite and combined FastAPI builds keep their existing clean paths (`/hr`, `/individual`). The skip link focuses the main content without modifying the router hash.

Only `dist` is uploaded to Pages. Python code, uploaded analyses, the original CSV/model, and research assets are not copied into the static artifact. Research resource links and downloads use the configured backend.

## Connect FastAPI when a public URL is available

### 1. Host the backend

Run the existing FastAPI application on a host that supports Python and the required model/data assets. Its public URL must use **HTTPS**, and `/api/health` must return `status: ready`. The existing [Dockerfile](../Dockerfile) is an optional packaging path; this Pages workflow does not deploy a backend.

Use a single worker with the current in-memory analysis store. The existing authentication, data-retention, and model-suitability limits still apply; see [README](../README.md#privacy-and-deployment-boundaries).

### 2. Allow the Pages origin on the backend

Set this environment variable **on the backend host**, then restart FastAPI:

```text
WORKWELL_ALLOWED_ORIGINS=https://YOUR_GITHUB_USERNAME.github.io
```

Replace `YOUR_GITHUB_USERNAME` with the repository owner's GitHub username or organization name. Use the frontend's actual `.github.io` origin. Origins do not include the repository path or a trailing slash. Multiple allowed origins can be comma-separated. The middleware permits the GET, POST, and DELETE requests needed by the app and handles preflight requests for JSON submissions. Credentials/cookies are not enabled.

Without this variable, the backend keeps its same-origin behavior used by the local Vite proxy and combined serving.

### 3. Configure the frontend repository variable

In **Settings → Secrets and variables → Actions → Variables**, create a repository variable:

| Name | Example value |
| --- | --- |
| `WORKWELL_BACKEND_URL` | `https://your-api.example.org` |

Use the backend base URL, **without `/api`**, credentials, query parameters, or a fragment. This is public frontend configuration, not a secret. The workflow checks HTTPS before building. The URL is embedded at build time, so push a commit or manually rerun the workflow after changing it.

API requests, CSV downloads, API documentation, PDFs, notebook downloads, and the research video all use this backend URL. No browser request to a public Pages site should depend on `127.0.0.1:8000`.

### 4. Verify the connected deployment

- Open the landing page and navigate into both workspaces.
- Confirm the individual questionnaire loads; submit illustrative answers and inspect the summary.
- In HR, explicitly load demo data or upload a small sample and inspect its charts/export.
- Refresh a hash route and check that it opens correctly.
- Confirm requests reach the HTTPS backend and that its CORS response allows your exact Pages origin.

## Build configuration

| Setting | Set by | Purpose |
| --- | --- | --- |
| `VITE_PAGES=true` | Workflow | Enables static-host-compatible hash routing and explicit missing-backend handling |
| `VITE_BACKEND_URL` | Workflow, from `WORKWELL_BACKEND_URL` | Public backend base URL |
| `--base` | Workflow, from Pages metadata | Correct asset paths for repository/root sites |
| `WORKWELL_ALLOWED_ORIGINS` | Backend host | Allowed cross-origin frontend origins |

For local experimentation, copy [frontend/.env.example](../frontend/.env.example) to `frontend/.env.local` and set the frontend values. Environment overrides are ignored by Git. Restart Vite after changing them.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Configure Pages step fails | Enable Pages with **GitHub Actions** as its source, then rerun |
| Build succeeds but deploy is skipped | Only the default branch publishes; branch/tag pushes still build |
| Deploy is rejected by the environment | Allow the default branch in the `github-pages` environment's deployment rules |
| Default URL check reports a custom domain | Remove the Custom domain in Pages settings, including an inherited domain on the owner site if applicable, then rerun |
| Landing works but analysis service is unavailable | Host FastAPI, set `WORKWELL_BACKEND_URL`, and rebuild |
| Browser reports CORS errors | Set the exact Pages origin on the backend and restart it |
| Old backend URL is still used | Repository variables are build-time inputs; rerun the workflow |
| Blank page or asset 404s | Keep the workflow's Pages-derived `--base`; do not substitute a guessed repository name |
| Deep link gives a Pages 404 | Use the generated `/#/hr` or `/#/individual` link, not `/hr` as a server path |

## Local verification

Local verification on 30 October 2026 covered workflow YAML structure and pinned action references; production builds with and without a backend URL; and Chrome tests against a strict static server at `/workwell/`, with no SPA rewrites. The tests verified hash navigation, refreshes, keyboard skip navigation, explicit missing-service errors, and real cross-origin HR imports, download/resource URLs, and CBI submission against a separate local FastAPI instance. The actual GitHub deployment still requires the repository setup above and has not been run remotely from this workspace.

The reproducible static-host check is [scripts/verify_pages.mjs](../scripts/verify_pages.mjs). It serves a built directory at `http://127.0.0.1:4173/workwell/` and uses installed Chrome. It defaults to `tmp/pages-unconnected`; use `PAGES_TEST_DIR` for a different build and `PAGES_TEST_BACKEND` when testing a connected build. The backend must allow the test origin through CORS. Build test artifacts with the same Pages environment variables and `--base /workwell/`, using a temporary `--outDir` so the normal `dist` stays separate.

## Official references

- [Vite: deploying to GitHub Pages](https://vite.dev/guide/static-deploy#github-pages)
- [GitHub: custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub: configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [FastAPI: CORS middleware](https://fastapi.tiangolo.com/tutorial/cors/)
