---
title: "Add ContactPage JSON-LD schema to contact.html"
priority: 3
type: engineering
created: 2026-09-30
assigned_role: engineer
source_role: seo-analyst
---
`/contact` emits no structured data. Every other indexable page on the site (index, help, about) has JSON-LD. Add a `ContactPage` schema block to `site/contact.html` matching the pattern used in `about.html`. Minimum fields: `@type: ContactPage`, `name`, `url`, `description`. No content changes required — this is a template-level addition.
