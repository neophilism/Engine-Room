> **Current UI direction (October 10, 2026):** The mechanical/steampunk material system below is preserved as a *future optional theme*, not today's default UI. The deployed application uses the compact, understated workspace described in [UI_CURRENT.md](UI_CURRENT.md). Do not reintroduce animation demos or ornamental panels into the production interface.

# Machine design system

PR 5 establishes the visual grammar for Engine Room. The goal is not to place ordinary dashboard widgets inside decorative steampunk frames. Data-bearing interface elements should themselves read as parts of one functioning Victorian machine.

## Design principles

1. **Function first.** A tube, lamp, gauge, pipe, chamber, or valve should communicate real state whenever possible.
2. **Decoration is subordinate.** Ornament may reinforce hierarchy and material character but must not compete with controls or data.
3. **Mechanical consistency.** The same state means the same light/material treatment everywhere.
4. **Responsive materials.** The art direction is built from CSS/SVG primitives and small reusable assets rather than static page screenshots.
5. **Accessible redundancy.** Color and glow never carry meaning alone; text, icons, values, and ARIA semantics remain authoritative.

## Palette

The raw palette lives in `app/design-tokens.css` and is organized around:

- coal / cast iron backgrounds;
- aged brass as structural metal;
- copper as a secondary conductor/accent metal;
- green-blue patina for age and oxidation;
- teal illumination for powered/live machine state;
- ivory typography to avoid sterile pure white;
- amber, red, green, and blue semantic status lights.

Application code should prefer semantic tokens such as `--er-text-primary`, `--er-border-metal`, or `--er-status-warning` over raw palette values.

## Materials

Reusable material tokens include:

- `--er-material-cast-iron`
- `--er-material-brass`
- `--er-material-brass-dark`
- `--er-material-glass`
- `--er-material-smoked-glass`
- `--er-material-patina`
- `--er-machine-backdrop`

These are layered gradients, not screenshot slices, so they scale cleanly from phone to large desktop.

## Typography

Three semantic families are defined:

- **Display:** engraved/editorial serif for major titles and machine nameplates.
- **Body:** modern system sans for dense application reading.
- **Instrument:** monospaced family for counts, timestamps, percentages, versions, and numeric readouts.

No page should rasterize labels into artwork.

## Machine state

The canonical UI states are:

- neutral
- live
- active
- complete
- warning
- blocked
- offline

`lib/design/theme.ts` maps those states to semantic CSS colors/glows. Future lamp, milestone, gauge, alert, and release components should consume that mapping rather than inventing local colors.

## Lighting and depth

Depth is constrained to named levels rather than arbitrary shadows:

- `--er-shadow-low`
- `--er-shadow-medium`
- `--er-shadow-high`

Illumination is similarly tokenized. Powered states may glow; inactive structural decoration should not.

## Geometry

Spacing, radii, pipe thicknesses, lamp sizes, and minimum control targets are tokenized. The default minimum interactive target is `44px`.

## Motion

Motion durations and easing curves are named now but animation behavior remains PR 8. Components should consume these tokens so reduced-motion handling can disable movement globally later.

## Compatibility

Tokens from PRs 1–4 such as `--brass`, `--teal`, and `--muted` remain as semantic aliases during the migration. New code should prefer the `--er-*` namespace.

## Next milestone

PR 6 converts these foundations into reusable machine components: BrassPanel, GlassTube, Lamp, Gauge, Valve, and Pipe.
