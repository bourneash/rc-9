// Cloudflare Worker — passthrough to static assets, plus:
//   - /go/<id>  affiliate redirect (302) — populate AFFILIATE_REDIRECTS as deals land
//   - /admin/*, /api/*  block (302 → /404)
//
// Game itself is served straight off the static-assets binding (Vite build → site/dist).

const AFFILIATE_REDIRECTS = {
  // 'example-game-portal': 'https://www.example.com/affiliate?id=...',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/go/')) {
      const id = url.pathname.slice(4).split('/')[0];
      const dest = AFFILIATE_REDIRECTS[id];
      if (dest) {
        return Response.redirect(dest, 302);
      }
      return Response.redirect(new URL('/404', url.origin).toString(), 302);
    }

    if (url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/')) {
      return Response.redirect(new URL('/404', url.origin).toString(), 302);
    }

    return env.ASSETS.fetch(request);
  },
};
