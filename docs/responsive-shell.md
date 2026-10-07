# Responsive application shell

PR 4 moves navigation and page framing out of individual dashboards and into one persistent application shell.

## Desktop

At widths above 1180 px, Engine Room uses:

- a persistent left control-room sidebar;
- a sticky top control bar;
- full navigation labels and active-route lamps;
- a central portfolio search surface;
- data-bus, notifications, and account controls;
- page content that can independently grow without changing global navigation.

The shell is deliberately built with HTML/CSS/SVG-like UI primitives rather than a single background image.

## Tablet

From 761–1180 px, the left sidebar becomes a compact instrument rail:

- route icons remain visible;
- labels collapse;
- the active-route lamp remains visible through the selected rail state;
- the top bar compresses account and live-status information;
- content retains the same reading width and page hierarchy.

This avoids a crowded horizontal navigation bar on landscape tablets while preserving one-tap access to every dashboard.

## Smartphone

At 760 px and below:

- the persistent rail disappears;
- a 44px-class menu control opens an off-canvas navigation drawer;
- the current dashboard name stays visible in the top bar;
- search is removed from the fixed header to protect space;
- account access remains available;
- project rows reflow into vertical progress controls instead of overflowing horizontally.

At 430 px and below the least-important fixed header control is hidden before any core navigation or data content is removed.

## Accessibility

The shell includes:

- `aria-current="page"` on active routes;
- explicit labels for navigation, notifications, account, and drawer controls;
- a real `role="search"` container;
- keyboard-operable drawer buttons;
- text labels in addition to illuminated visual states;
- existing reduced-motion support.

## Future work

PR 4 provides the responsive machine frame only. Later milestones will make search, notifications, account management, and live data status fully connected to portfolio data and authentication.
