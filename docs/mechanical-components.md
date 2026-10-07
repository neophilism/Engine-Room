# Mechanical component library

PR 6 turns Engine Room's design tokens into reusable data-bearing machine parts.

- **BrassPanel** — semantic structural housing with engraved heading and status slot.
- **GlassTube** — accessible progress indicator whose visual fluid fill is clamped to its physical chamber.
- **IndicatorLamp** — semantic machine-state bulb using the canonical state vocabulary.
- **Gauge** — accessible dial meter with mechanical needle and numeric instrument readout.
- **Valve** — controlled, keyboard-operable button rendered as a valve wheel.
- **Pipe** — responsive SVG straight/elbow flow connector, decorative by default or accessible when labeled.

The portfolio overview now uses BrassPanel, GlassTube, and IndicatorLamp directly. Text and state remain live DOM content; the machine effect is built from CSS/SVG rather than static screenshots.

PR 7 adds responsive pipe routing and machine-layout composition so these primitives can become larger connected mechanisms.
