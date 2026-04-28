# Release Checklist

## Pre-Release

- [ ] `npm ci` succeeds on a clean machine
- [ ] `npm run lint` has no blocking issues
- [ ] `npm run security:audit` has no high/critical findings
- [ ] `npm run build` succeeds and outputs expected chunks
- [ ] Manual smoke test: new game flow, fire flow, turn progression, game over flow

## Security and Headers

- [ ] Confirm `public/_headers` is deployed with CSP and policy headers
- [ ] Verify `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `CSP` in production response headers
- [ ] Confirm no unexpected third-party origins are required by CSP

## Performance and Caching

- [ ] Confirm asset cache headers are immutable for `/assets/*`
- [ ] Confirm HTML cache policy is `must-revalidate`
- [ ] Verify initial load path does not eagerly load deferred visual FX bundle

## Deployment

- [ ] Merge PR only after `Security and Build` workflow passes
- [ ] Deploy to Cloudflare Pages production
- [ ] Validate production URL loads and controls are interactive
- [ ] Verify audio unlock and gameplay events function in production build

## Rollback

- [ ] Keep previous successful deployment ID/tag documented
- [ ] If regression detected, rollback to previous deployment immediately
- [ ] Capture incident notes and create follow-up issue
