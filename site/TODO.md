## TODO LIST

Add a game mode option when creating a new game that allows the player to drive their vehicle while it is another players turn (drive during turn). This would allow for more dynamic gameplay where players can move their tanks around the map even when it is not their turn to shoot. This could be useful for repositioning or dodging incoming fire from other players. The shooting player must be stationary to shoot, but the other players can move around the map while it is not their turn and while a projectile is in the air.

---------------

Add a new 'defend the base' game mode - Add a game new mode where there are buildings (or even missle launch sites) on the ground that the player has to defend from incoming asteroids. Incoming missles are heading toward the buildings / city / silos and the player has to defend them/shoot them down before they hit the buildings. The buildings would kind of work like tanks, have their own health and can be destroyed (they fall down or blow up). If all the buildings are destroyed the game is over, and a score is shown based on how  many missles were shot down and how many buildings remain. The sub menu options could include a defend forever, a limited ammo mode, a preset number of incoming missles.

---------------

Add multiplayer over a network, maybe using WebRTC or WebSockets. This would allow players to compete against each other in real-time, adding a new layer of excitement to the game. This is a full enterprise solution needed, something that can scale. Lobbys, invite codes to a game, ability to wait for players, or have the game leader start it anyway. This should allow for users to play with friends or other players around the world, using a code for example to join a specific game. Maybe a queue of available games to join and/or a quick join button. Allow the game to start when the required number of players have joined. This would require a server-side component to manage the game state and player connections. Allow the host to start the game before the required number of players have joined if they choose to do so. Handle player disconnections gracefully, allowing players to rejoin the game if they lose their connection, if they have not been destroyed, skip players if not reconnected after a certain amount of time. Put adjustable time limits on turns to keep the game moving. Show player status (connected, disconnected, rejoining, etc) in the game UI.

---------------

Please review this site, I'd like to ensure it is production ready, and follows best practices for security, performance, and accessibility. Please add any items you find to this TODO list (following this format) so they can be addressed.

Production hardening pass 1 (stability + UX): Add a focused bug bash checklist and fix the top 10 gameplay blockers (turn lock edge-cases, stuck projectiles, control desync, invalid weapon states, modal focus traps), with explicit reproduction steps and expected behavior for each bug.

---------------

Production hardening pass 2 (performance): Reduce first-load bundle size (currently a large single JS bundle) via route/module code-splitting and lazy-loading non-critical systems (help panel, optional effects, debug tooling), then re-measure startup time and FPS on low-end devices.

---------------

Production hardening pass 3 (accessibility): Ensure full keyboard navigation for setup/game menus, visible focus indicators, proper ARIA labels for controls/sliders, semantic headings in modals, and color-contrast validation for HUD + terrain themes.

---------------

Production hardening pass 4 (security + deployment): Add/verify production headers and policies (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), dependency audit workflow, and a release checklist for cache/versioning/rollback.

---------------

Production hardening pass 5 (quality gates): Add automated smoke tests for new game setup, turn progression, firing flow, and win conditions; enforce CI build + smoke pass before release.

---------------






Sound does not work on this site so far, not so if it is my brower, or the setup of the site. FIXED - Added comprehensive volume modal with master/sfx/music sliders, test sound button, mute/unmute buttons, and localStorage persistence.

---------------

Canyon Map - This still does not work, there are no boundries being set inside the map, the tanks and traverse the entire map including the canyon walls. Please fix this so that the tanks cannot go in to the canyon walls:
The canyon map is a little weird, as in, it is not really a canyon. The way I envisioned it was a deep canyon with restricted space, meaning, it forces the players to stay apart since they could not cross the canyon. There should be zones where the players cannot go, like steep cliffs on either side of the canyon.

---------------
