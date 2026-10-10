import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "./fixtures";

/**
 * CSS geometry regression for the deployed bar markup. jsdom only checks
 * inline width strings and would not have caught the retired three-column
 * grid placing the chamber in a zero-width column.
 */
const sheets = [
  "app/design-tokens.css",
  "app/globals.css",
  "components/machine/machine.css",
  "components/portfolio/planned-progress.css",
  "app/workspace.css"
];

async function paintFixture(page: import("@playwright/test").Page, merged: number, open: number) {
  await page.setContent(
    '<main class="content"><div class="comparison-progress">' +
    '<div class="planned-progress-tube planned-progress-compact" role="progressbar" ' +
    'aria-label="Example project progress" aria-valuemin="0" aria-valuemax="100" ' +
    'aria-valuenow="' + merged + '">' +
    '<span class="planned-progress-chamber" aria-hidden="true">' +
    '<span class="planned-progress-merged-fill" style="width:' + merged + '%"></span>' +
    '<span class="planned-progress-open-fill" style="left:' + merged + '%;width:' + open + '%"></span>' +
    '</span></div><strong>' + merged + '%</strong></div></main>'
  );
  for (const path of sheets) {
    await page.addStyleTag({ content: readFileSync(resolve(process.cwd(), path), "utf8") });
  }
}

async function geometry(page: import("@playwright/test").Page) {
  return page.getByRole("progressbar", { name: "Example project progress" })
    .evaluate((bar) => {
      const rect = (selector: string) =>
        (bar.querySelector(selector) as HTMLElement).getBoundingClientRect();
      const track = bar.getBoundingClientRect();
      const chamber = rect(".planned-progress-chamber");
      const green = rect(".planned-progress-merged-fill");
      const yellow = rect(".planned-progress-open-fill");
      return {
        track: track.width,
        chamber: chamber.width,
        green: green.width,
        greenStart: green.left - chamber.left,
        yellow: yellow.width,
        yellowStart: yellow.left - chamber.left,
        chamberHeight: chamber.height
      };
    });
}

for (const width of [1440, 390]) {
  test("bar fill geometry accurately renders 100%, 60/10/30 and 0% at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const [merged, open] of [[100, 0], [60, 10], [0, 0]]) {
      await paintFixture(page, merged, open);
      const box = await geometry(page);
      // A 100% bar was previously a small sliver because the old endcaps
      // disappeared, auto-placing the chamber in grid column 1 (0px).
      expect(box.track).toBeGreaterThan(90);
      expect(box.chamber).toBeGreaterThan(box.track * 0.97);
      expect(box.chamberHeight).toBeGreaterThan(6);
      expect(box.green / box.chamber).toBeCloseTo(merged / 100, 2);
      expect(box.yellow / box.chamber).toBeCloseTo(open / 100, 2);
      expect(box.greenStart).toBeCloseTo(0, 1);
      expect(box.yellowStart / box.chamber).toBeCloseTo(merged / 100, 2);
    }
  });
}
