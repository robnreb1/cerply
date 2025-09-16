# CI quick refs

## Web Smoke (API-linked)
- Manual run with custom API:
  ```bash
  gh workflow run "Web Smoke (API-linked)" -f api_base=https://cerply-api-staging.onrender.com --ref $(git rev-parse --abbrev-ref HEAD)
  gh run watch --exit-status
  ```
