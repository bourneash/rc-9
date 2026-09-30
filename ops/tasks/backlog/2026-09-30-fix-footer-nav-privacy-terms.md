---
title: "Add /help link to footer nav on privacy and terms pages"
priority: 3
type: content
estimated_turns: 2
created: 2026-09-30
assigned_role: content-writer
source_role: seo-analyst
target_query: ""
---
`privacy.html` and `terms.html` have a footer nav that omits `/help`. All other site pages (index, about, contact) include a "Help" footer link. The inconsistency means visitors landing on legal pages via Google have no visible path to the help guide. Add `<a href="/help">Help</a>` to the footer nav in both files, matching the order and markup used in `about.html`.
