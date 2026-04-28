# CloudFlare Pages Deployment Guide

This project is configured to deploy to CloudFlare Pages using Vite as the build tool.

## Prerequisites

- A GitHub account
- A CloudFlare account
- This repository pushed to GitHub

## Deployment Steps

### 1. Push to GitHub

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for CloudFlare Pages deployment"
git push origin main
```

### 2. Connect to CloudFlare Pages

1. Log in to your [CloudFlare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** > **Overview**
3. Click **Create application** > **Pages** > **Connect to Git**
4. Select your repository: **ScorchedEarth**
5. Click **Begin setup**

### 3. Configure Build Settings

Use the following build configuration:

- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (leave blank for root)
- **Node version**: Use default or specify `18` or higher

### 4. Environment Variables

No environment variables are required for this project.

### 5. Deploy

1. Click **Save and Deploy**
2. CloudFlare will build and deploy your site
3. Your site will be available at: `https://<your-project-name>.pages.dev`

## Custom Domain (Optional)

To use a custom domain:

1. Go to your project in CloudFlare Pages
2. Click **Custom domains**
3. Click **Set up a custom domain**
4. Follow the instructions to configure your DNS

## Local Development

To run the development server locally:

```bash
npm install
npm run dev
```

The site will be available at `http://localhost:3000`

## Build Locally

To build the project locally:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Security Verification

Run dependency and build verification before release:

```bash
npm run security:audit
npm run build
```

CI also runs these checks automatically in GitHub Actions via `.github/workflows/security-and-build.yml`.

## Response Headers

Security and caching headers are configured in `public/_headers` for Cloudflare Pages, including:

- Content Security Policy (CSP)
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Asset and HTML cache-control directives

After deployment, verify headers on:

- `/index.html`
- `/help.html`
- `/assets/*`

## Release Process

Use the full release runbook in `RELEASE_CHECKLIST.md` before promoting to production.

## Automatic Deployments

CloudFlare Pages will automatically deploy:

- **Production**: When you push to `main` branch
- **Preview**: When you create a pull request

## Troubleshooting

### Build fails on CloudFlare Pages

- Check that Node version is 18 or higher
- Verify build command is `npm run build`
- Check build logs for specific errors

### Game doesn't load after deployment

- Check browser console for errors
- Verify all assets are loading correctly
- Check that paths in HTML are correct (using `/` prefix)

### Performance issues

The initial bundle is large (~1.4MB) due to:

- PixiJS rendering engine
- GSAP animation library
- Howler audio engine
- All game logic

This is normal for a game application. CloudFlare's CDN will help with load times, and deferred-loading optimizations reduce first-load impact.
