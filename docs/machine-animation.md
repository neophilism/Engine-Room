# Machine animation and state transitions

PR 8 layers motion onto PR 7's responsive machine composition. The flow/manifold/grid breakpoints, pipe paths, connector count, and semantic relationships stay owned by the layout system. No viewport JavaScript, animation library, animation timers, or animation-completion callbacks are required.

## Shared state

`Machine` is a controlled, named group. Its `state` is inherited by gauges, tubes, lamps, pipes, and flow stations, including flow and manifold connectors. An explicit component state overrides inheritance; a nested `Machine` creates an independent scope. Standalone components retain their earlier defaults.

```tsx
const { state, send } = useMachineController("live");

<Machine label="Release machine" state={state}>
  <Gauge value={readiness} max={100} label="Readiness" unit="%" />
  <GlassTube value={merged} max={planned} label="Merged work" />
  <IndicatorLamp label="Source health" state="warning" />
  <Valve label="Work gate" open={state === "active"}
    onChange={(open) => send({ type: open ? "start" : "connect" })} />
</Machine>
```

`useMachineController` is optional; integrations can pass authoritative state directly. The pure `machineStateReducer` accepts these status events:

| Event | Result |
| --- | --- |
| `connect` | live |
| `start` | active |
| `complete` | complete |
| `warn` | warning |
| `block` | blocked |
| `disconnect` | offline |
| `reset` | neutral |
| `state` with a canonical `state` | supplied state |

These events describe observed UI status, not permission gates or project lifecycle rules. Reconciliation can report any canonical status, including recovery from blocked/offline states. Event ordering and GitHub synchronization belong to later integration milestones.

Every update changes state, visible readouts, ARIA values, and the polite/atomic status message immediately. CSS interpolates only the visual surfaces; state never waits for an animation and instruments are not remounted. Neutral/offline appearances explicitly clear inherited glow.

## Motion policy

The root layout mounts `MachineMotionProvider` around the application. The top bar's keyboard-operable **Pause machine motion** toggle pauses all descendant animations and transitions; its pressed state means paused. This session preference survives client navigation. Data updates and controls continue working. Reloading restores the system default.

Motion is enabled only under `prefers-reduced-motion: no-preference` and an unpaused provider. The operating system's reduced-motion setting always wins, including before hydration, without JavaScript, and when it changes during a session. Reduced motion removes animations and transitions entirely rather than shortening their duration. Pausing/resuming never forces motion against the system preference. Standalone machine parts outside a provider remain still.

- Tube fills interpolate width using the existing clamped progress value.
- Gauge needles interpolate rotation; numeric readouts update immediately.
- Valves rotate only in response to controlled `open` changes.
- Live/active pipes animate a decorative dash along the existing path.
- Live/active lamp glints breathe subtly; the semantic bulb color stays readable.
- Complete, warning, blocked, neutral, and offline states have no continuous effects. Fault indicators do not flash.

Motion uses named tokens in `app/design-tokens.css`. Structural connectors remain hidden from accessibility APIs. A visible state readout provides meaning without color or movement.

## Preview and verification

The homepage's **Machine animation preview** uses clearly labeled sample values to exercise all seven states and the controlled valve. It is not operational telemetry.

Unit tests cover reducer events, recovery, state inheritance and explicit overrides, nested scopes, immediate semantic updates, retained DOM/routing, and pause controls. Browser tests use the production build to check computed animation/transition styles, system preference changes, JavaScript-disabled reduced motion, keyboard pause, navigation persistence, and desktop/tablet/phone routing in both motion modes.

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:browser
```

CI installs Chromium with its system dependencies and runs these browser checks after the four existing quality gates. PR 9 starts GitHub integration and repository discovery.
