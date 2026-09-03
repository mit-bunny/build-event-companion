# Contributing

Thank you for helping improve Build Event Companion.

## Development setup

Use Node.js `20.19+` or `22.12+` and npm.

```bash
cd build-event-companion
npm ci
npm test
npm run validate:sample
npm run build:sample
cd .tmp/sample-site
npm install
npx playwright install chromium
npm run audit:layout
npm run test:remote
```

## Pull requests

1. Keep each change focused.
2. Use fictional or explicitly public test data only.
3. Never commit registration exports, credentials, deployment identifiers, or personal contact details.
4. Update tests when behavior changes.
5. Run the privacy audit and test suite before opening a pull request.

From the repository root:

```bash
node scripts/audit-public-repo.mjs
```

Describe the user-visible effect, testing performed, and any privacy implications in the pull request.
