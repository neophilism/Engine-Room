import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseApprovedManifest,parseApprovedPlanTitles,validateMapping,manifestFingerprint
} from "./roadmap-source-utils.mjs";
const yaml=readFileSync(".exechub/project.yml","utf8");
const markdown=readFileSync("docs/development-plan.md","utf8");
const mapping=JSON.parse(readFileSync(".exechub/approved-pr-mapping.json","utf8"));
const manifest=parseApprovedManifest(yaml);
assert.equal(manifest.roadmap.plannedPrs,40);
assert.equal(manifest.milestones.length,8);
assert.equal(parseApprovedPlanTitles(markdown).size,40);
const numbers=validateMapping(mapping,manifest);
assert.equal(numbers[0],1);
assert.equal(numbers[36],37);
assert.equal(numbers[37],39);
assert.equal(numbers[38],43);
assert.equal(numbers[39],45);
assert.equal(manifestFingerprint(manifest).length,64);
assert.throws(()=>validateMapping({...mapping,pullRequestNumbers:[1,1]},manifest));
assert.throws(()=>parseApprovedManifest(yaml.replace("approved: true","approved: false")));
assert.throws(()=>parseApprovedManifest(yaml.replace("planned_prs: 40","planned_prs: 400")));
console.info("Approved source mapping tests passed for 40 explicit GitHub PR references.");
