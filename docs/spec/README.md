# Cerply Spec (working set)
Source of truth lives here. Update BEFORE coding. Keep docs/functional-spec.md as the high-level summary.

- functional-spec.md → high-level capabilities, status ticks
- use-cases.md → scenarios + acceptance tests
- usps-plan.md → how features deliver Cerply USPs
- flags.md → feature flags & defaults
- api-routes.json → snapshot from running API (dev-only)
- changelog.md → spec changes, one-liners

Process: for every change, update spec first, implement, run `npm run spec:snapshot`, commit.
