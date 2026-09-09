# Guest rewind qualification — September 9

Scope: [issue 27](https://github.com/sarthakagrawal927/open-historia/issues/27). Source-only local browser proof; no deployment, live AI request, account or database operation.

## Reproduced failures

At `a79b6e2598cdf965e3cee0fc7e23ca32cf4f0021`, two synthetic guest turns followed by Rewind → Save → Reload → Advance sent `Memory 2` instead of selected snapshot `Memory 1` in the actual `/api/turn` request. Rewind restored the year/map but retained future prompt history and objectives. New turns parented the last snapshot regardless of the selected rewind target.

The previous relation/timeline/order save loss and broad 390px panel overlap were already fixed in `d7a9ecd`/`a79b6e2`; all 10 existing campaign/panel browser checks passed before this work. Do not treat the earlier issue receipt as a current failure of those fixes.

## Contract and repair

New snapshots retain bounded logs, summary, objectives, pending orders, conversation/advisor context, events, relations and province ownership. Rewind restores this context, persists the selected snapshot ID, and a subsequent turn parents that selected snapshot. Future snapshots remain inspectable alternate history, excluded from active prompt memory. The existing 50-snapshot/200-log/200-event retention limits remain; localStorage capacity still bounds the campaign. Older snapshots continue loading for inspection, with explicit unavailable historical-memory wording and no unsafe rewind/branch control. Missing old memory is not reconstructed. The optional memory payload is validated at decode and again before restoration; malformed arrays/records are inspection-only. Explicit empty summaries are preserved. Rewind waits while a turn, diplomacy or advisor request is in flight, preventing delayed future responses from appending after restoration.

Replay interaction uncovered a 390px single-node obstruction beneath the 44px controls. The node track now sits below those controls. The replay popup uses the existing opacity fade instead of a scale transform that overrode its horizontal position, and renders through a portal to escape the timeline stacking context behind Guided Story. Actual clicks, settled viewport bounds and unobscured replay heading are asserted without forced clicks.

## Checks

- `pnpm typecheck`, `pnpm lint`, `pnpm test`: pass; 87 unit tests.
- Full `pnpm test:e2e`: 22 pass, 2 intentional mobile-only skips in the desktop project. Builds the actual app and runs Chromium/WebKit; guest responses are synthetic and external network is blocked in campaign tests.
- Focused post-popup checks cover rewind/reload and legacy inspection on both engines.
- The guest regression inspects the actual next request: selected summary/objective/event history, no future narrative; the following saved snapshot has the selected parent.
- Explicit-empty-summary rewind/reload and pending-advisor/in-flight-turn cases pass through real browser controls on both engines. Pending diplomacy uses the same guard; a separate live diplomacy/provider test was not performed.
- Existing save-quota failure retains the active campaign. Unit roundtrip includes snapshot memory and selected-parent ID.

Build retains pre-existing chunk-size and ineffective dynamic-import warnings. Additional direct hook lint has four existing-style warnings (two `any` casts and two redundant callback dependencies), zero errors; this change does not broaden that cleanup.

Screenshots: [390px legacy replay](legacy-mobile.png), [desktop legacy replay](legacy-desktop.png). These are synthetic local UI, not provider or historical-quality evidence.

## Still unqualified

Keep this owner-held experiment inactive and nonshareable. Generic factions/coarse geography and coherent historical play remain unresolved. Authenticated cloud-save isolation, real provider response quality and production rewind acceptance are not established by these tests. The new code has not been deployed. The dossier previously referenced a September 8 qualification directory absent from this checkout; this receipt covers only the fresh local checks above.
