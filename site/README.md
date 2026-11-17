# wengualabs.com

The site of Wengua Labs LLC: the home page, `/support` and `/privacy`, in Chinese and English.

- The pages are in `public/`: plain HTML and one stylesheet, with no build step.
- `wrangler.jsonc` configures the Cloudflare Worker `wengualabs`, which serves `public/` on `wengualabs.com` and `www.wengualabs.com`.
- **Publishing**: Cloudflare builds from this repository. Every push to `main` deploys the site with `npx wrangler@4.156.2 deploy`, run from this folder. Builds and their logs are under the Worker's **Deployments** tab.
- **Privacy policy**: `public/privacy.html` is a copy of `apps/mobile/public/legal/privacy.html`. Edit the app's copy, then copy it here; `apps/mobile/tests/paywall.test.tsx` checks that the two match.
- **DNS**: lives in Cloudflare. Keep the MX, SPF and `google._domainkey` records, or mail to support@wengualabs.com stops.

Setup history and the App Store side: [docs/IOS_APP_STORE_RELEASE.md](../docs/IOS_APP_STORE_RELEASE.md), step 七.
