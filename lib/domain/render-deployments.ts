export type VerifiedRenderService = { id: string; name: string; repository: string; website: string; healthPath?: "/healthz"; deployStatus: string; deployedCommit: string; lastObservedAt: string };

// Real Render service/deployment records verified October 8, 2026. This is a dated snapshot, not a live health signal.
export const verifiedRenderServices: readonly VerifiedRenderService[] = [
  { id: "srv-db3ii4tg1s2s73ak2eag", name: "Engine Room", repository: "neophilism/Engine-Room", website: "https://engine-room-1ec7.onrender.com", deployStatus: "live", deployedCommit: "8d5db4323b1d24b3498ac78bef52dd1d35bf74b0", lastObservedAt: "2026-10-08T07:04:21Z" },
  { id: "srv-db3f658m7kps73ee6360", name: "Algorithmic Accountability", repository: "neophilism/Algorithmic-Accountability", website: "https://algorithmic-accountability-preview.onrender.com", deployStatus: "live", deployedCommit: "66a627a88165e392271dc9dfd8f7b186ce8f0854", lastObservedAt: "2026-10-08T01:35:56Z" },
  { id: "srv-db3a2smk1f9s738vbbt0", name: "RAM Marketplace Sandbox", repository: "neophilism/RAM-Marketplace", website: "https://ram-marketplace-sandbox.onrender.com", deployStatus: "live", deployedCommit: "4f2bdcc3676acc493eee2066f8e30f759fbc126b", lastObservedAt: "2026-10-07T19:58:47Z" },
  { id: "srv-db39i3ad0e5s73fim6b0", name: "Civic Registry Preview v2", repository: "neophilism/Civic-Registry-Transparency-Engine", website: "https://civic-registry-preview-v2.onrender.com", deployStatus: "live", deployedCommit: "2ce403afa0676e3a61a68d4f29f974b3bfd281ff", lastObservedAt: "2026-10-07T19:12:36Z" },
  { id: "srv-db39hk60tbcc73839npg", name: "Music Video Wizard", repository: "neophilism/Music_Video_Wizard", website: "https://music-video-wizard-preview.onrender.com", deployStatus: "live", deployedCommit: "900b67b6b0007bf205221f379b1e98dc0da49a9f", lastObservedAt: "2026-10-07T19:14:38Z" },
  { id: "srv-db39higm7kps73dh35p0", name: "Fireside Chat", repository: "neophilism/FiresideChat", website: "https://fireside-chat-preview.onrender.com", deployStatus: "live", deployedCommit: "47bf050cb57a8c3d8d780b896a2e5269ebf4dff7", lastObservedAt: "2026-10-08T06:44:35Z" },
  { id: "srv-db39hhm7bikc73c3qcj0", name: "Stems White Label", repository: "neophilism/Stems-White-Label", website: "https://stems-white-label-preview.onrender.com", deployStatus: "live", deployedCommit: "d551ecfe899da39af9f12e4cc186ffc106e14e30", lastObservedAt: "2026-10-08T04:44:08Z" },
  { id: "srv-db39hg67bikc73c3q770", name: "Secure Intake", repository: "neophilism/Secure-Intake-Case-Workflow-Engine", website: "https://secure-intake-preview.onrender.com", deployStatus: "live", deployedCommit: "7b771d3b42647a8188414e13677bc754768c5b69", lastObservedAt: "2026-10-07T19:33:34Z" },
  { id: "srv-db39haid0e5s73fik1kg", name: "Civic Registry Original Preview", repository: "neophilism/Civic-Registry-Transparency-Engine", website: "https://civic-registry-preview.onrender.com", deployStatus: "build_failed", deployedCommit: "2ce403afa0676e3a61a68d4f29f974b3bfd281ff", lastObservedAt: "2026-10-07T19:08:33Z" },
  { id: "srv-db39h9ajnfac7394smbg", name: "Federal Encryption Compliance", repository: "neophilism/Federal-Encryption-Compliance", website: "https://federal-encryption-preview.onrender.com", deployStatus: "live", deployedCommit: "6c6cc8fab6d8f074fcce687e97c0c0ac88f5d859", lastObservedAt: "2026-10-07T22:52:20Z" },
  { id: "srv-db39h83ncjis73etb6i0", name: "Compliance Audit Engine", repository: "neophilism/Compliance-Authorization-Immutable-Audit-Engine", website: "https://compliance-audit-engine-preview.onrender.com", deployStatus: "live", deployedCommit: "813711f056e2cb97102d6fdccad4effc55f74b1b", lastObservedAt: "2026-10-07T19:33:32Z" },
  { id: "srv-db39gtid0e5s73fiirjg", name: "RAM Marketplace Preview", repository: "neophilism/RAM-Marketplace", website: "https://ram-marketplace-preview.onrender.com", deployStatus: "live", deployedCommit: "4f2bdcc3676acc493eee2066f8e30f759fbc126b", lastObservedAt: "2026-10-07T19:58:59Z" },
  { id: "srv-db3pulbtqb8s73evkfh0", name: "E2EESA Standards Website (main)", repository: "neophilism/End-To-End-Everywhere-Security-Architecture-Standard", website: "https://end-to-end-everywhere-standard.onrender.com", deployStatus: "live", deployedCommit: "dea8f54cab9130da86a71f36de553766a978daf2", lastObservedAt: "2026-10-08T13:49:25Z" },
  { id: "srv-db3ptde0tbcc738giui0", name: "E2EESA Standards Website (preview)", repository: "neophilism/End-To-End-Everywhere-Security-Architecture-Standard", website: "https://e2eesa-standards-portal.onrender.com", deployStatus: "live", deployedCommit: "333d0914d40a95be9a49db1d96f29b36e5efb2cb", lastObservedAt: "2026-10-08T13:48:28Z" },
  { id: "srv-db3pk16gekts73fnpctg", name: "Smart Cities Surveillance Registry (build failed)", repository: "neophilism/Smart-Cities-Surveillance-Registry", website: "https://smart-cities-surveillance-registry.onrender.com", deployStatus: "build_failed", deployedCommit: "a5fee8874cdf8edf6bb7872064601ecb5183d87f", lastObservedAt: "2026-10-08T13:26:36Z" },
  { id: "srv-db23s33bc2fs73f4ui10", name: "FOIA Aggregator", repository: "neophilism/FOIA_Aggregator", website: "https://foia-aggregator.onrender.com", healthPath: "/healthz", deployStatus: "live", deployedCommit: "12e802d53348ae01d1bfe3bb400f64b2b4a7a136", lastObservedAt: "2026-10-07T19:52:43Z" }
];

export type PublicSiteObservation = {
  serviceId: string;
  httpStatus: number | null;
  checkedAt: string;
  observation: "http-response" | "no-response";
};

export type RenderReadout = VerifiedRenderService & {
  source: "render-api" | "verified-snapshot";
  checkedAt?: string;
};

export function asLatestRenderDeployment(value: unknown): {
  status: string; commitSha: string; updatedAt: string;
} | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0];
  if (!first || typeof first !== "object" || !("deploy" in first)) return null;
  const item = first.deploy as Record<string, unknown> | null;
  if (!item || typeof item.status !== "string") return null;
  const allowed = ["created", "queued", "build_in_progress", "update_in_progress", "live", "deactivated", "build_failed", "update_failed", "canceled", "pre_deploy_in_progress", "pre_deploy_failed"];
  if (!allowed.includes(item.status)) return null;
  if (typeof item.updatedAt !== "string" || !Number.isFinite(Date.parse(item.updatedAt))) return null;
  const commit = item.commit;
  const commitSha = commit && typeof commit === "object" && "id" in commit && typeof commit.id === "string" && /^[a-f0-9]{40}$/.test(commit.id) ? commit.id : "";
  return { status: item.status, commitSha, updatedAt: item.updatedAt };
}
