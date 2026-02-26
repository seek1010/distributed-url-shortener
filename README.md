# Distributed URL Shortener

A globally distributed URL shortener built with AWS CDK, Lambda, Lambda@Edge, DynamoDB Global Tables, CloudFront, and a React + Vite dashboard.

## Repo Description (GitHub)

Global URL shortener using AWS Lambda@Edge + DynamoDB Global Tables with a React dashboard for fast link creation and low-latency redirects.

## Architecture

- `dashboard/`: React frontend for creating short URLs
- `lambda/shorten.ts`: API Lambda for URL creation
- `lambda/redirect.ts`: Lambda@Edge for global redirects
- `lib/distributed-url-shortener-stack.ts`: CDK infrastructure stack
- DynamoDB table stores `shortCode -> longUrl` mappings (+ TTL + clicks)
- CloudFront routes:
  - `/shorten` -> API Gateway -> `shorten` Lambda
  - `/{shortCode}` -> `redirect` Lambda@Edge -> 301 redirect

## Prerequisites

- Node.js 20+
- AWS CLI configured (`aws configure`)
- CDK bootstrap done in `us-east-1`

## Install

```bash
npm ci
cd dashboard && npm ci
```

## Deploy

```bash
npm run deploy:outputs
```

This deploys the stack and writes `cdk-outputs.json` with the current CloudFront/API endpoints.

## Run Dashboard (Auto-configured)

```bash
npm run dev:all
```

This reads `cdk-outputs.json`, injects:

- `VITE_CF_DOMAIN`
- `VITE_SHORTEN_API`

and starts the dashboard.

First-time one-command flow:

```bash
npm run dev:all:deploy
```

## Useful Commands

- `npm run build`: compile TypeScript (backend/CDK/lambda)
- `npm test`: run Jest tests
- `npx cdk synth`: generate CloudFormation template
- `npm --prefix dashboard run build`: build dashboard

## API

`POST /shorten`

Request:

```json
{
  "url": "https://www.google.com",
  "custom": "optional-code",
  "expiresInDays": 30
}
```

Response:

```json
{
  "shortUrl": "https://<domain>/<shortCode>",
  "shortCode": "<shortCode>"
}
```

## Troubleshooting

- If dashboard shows `Network error`:
  - redeploy (`npm run deploy:outputs`)
  - restart dashboard (`npm run dev:all`)
  - hard refresh browser (`Ctrl+Shift+R`)
- If `cdk deploy` says stack is updating, wait for `UPDATE_COMPLETE` then rerun.

## Notes

- Stack is deployed in `us-east-1` because Lambda@Edge requires it.
- CloudFront deployment/updates can take a few minutes.
