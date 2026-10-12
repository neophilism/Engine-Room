# Cloud CI on $0 budget (Oracle Always Free pilot)

## Status / limits

This is a **prepared bootstrap**, not a deployed runner. No Oracle account, VM, GitHub runner registration or passing CI has been verified. No paid resource may be provisioned. The owner must create/access an Always Free VM and enter the short-lived registration token **on the VM**, never in GitHub or chat.

Render Free is not an always-on runner solution: it sleeps on inbound inactivity, limits RAM and consumes shared free instance hours. Use an Always Free compute VM instead.

Oracle Always Free ARM Ampere A1 allowance (October 2026): **2 OCPUs / 12 GB RAM equivalent**. Choose an Always Free eligible Ubuntu ARM64 VM within limits in your **home region**, with its free-tier-eligible boot volume, and check the console estimate is **$0** before creating it. Availability is not guaranteed. Do not upgrade to pay-as-you-go or accept paid addons. Account identity/payment-method verification may be required by the cloud provider.

## Bootstrap one repository (first pilot: HEARD)

1. In the Oracle Cloud console, create the VM with an SSH key, Ubuntu 24.04 ARM64, no public inbound ports except controlled SSH. Keep the VM on an Always Free account and within the free compute/storage/network quotas.
2. SSH to the VM and obtain this repository's **reviewed** script at `ops/cloud-ci/bootstrap-runner.sh`. Run `sudo bash bootstrap-runner.sh neophilism/HEARD`. Do not run a raw remote script without reviewing it.
3. On GitHub, open `https://github.com/neophilism/HEARD/settings/actions/runners/new`. Copy the short-lived **registration token** from the interactive setup instructions; paste it only into the VM terminal when prompted. Never send a PAT, GitHub credential, registration token, SSH key or Oracle secret to ChatGPT.
4. Verify that the runner appears **Online** in that repository's GitHub Settings > Actions > Runners. The runner has the labels `self-hosted`, `Linux`, `ARM64` and `oci-free` (or `X64` instead of ARM64 on x86 VMs).
5. Only after verified online, open the HEARD pilot PR, run its manual smoke test, verify logs/exit code, and then progressively change eligible private workflow jobs' `runs-on` to `[self-hosted, Linux, ARM64, oci-free]`.

**Important:** Under a personal `neophilism` account a repository-level runner is scoped to **one repository**. A single VM can host separate runners for multiple repositories, but each needs its own registration. Do not migrate all 21 private repositories or run several heavy jobs concurrently on a 2-core VM until resource limits and isolation are tested. Public repositories should retain their free GitHub-hosted runners.

## Security and compatibility gates

- Keep the runner **non-root**, update its OS regularly, and restrict firewall ingress. GitHub runner communication is outbound HTTPS. Bootstrap deliberately does **not** grant Docker-group membership: Docker socket access is effectively root access and must be assessed per repo.
- Persistent self-hosted runners can be compromised by malicious workflow content, including code in pull requests. Permit only trusted branches/contributors. Do not run untrusted or forked PR jobs on this persistent VM. For contributors or sensitive secrets, plan ephemeral, isolated runners.
- Never store GitHub tokens, runner registration tokens, Oracle credentials, SSH keys, or secret values in the repository, PR descriptions, issue comments, or chat.
- ARM64 is **not x64**: verify Docker images, system dependencies, native modules and Playwright support before migrating a workload. Postgres service containers need a carefully isolated Docker setup; Ubuntu `sudo apt-get` steps often require redesign because the runner is non-root.
- macOS signing/notarization and macOS-specific CI cannot run on a Linux VM. Keep these as explicit exceptions until a supported macOS runner is available, and never pretend they passed.
- Do not remove required CI checks or convert a required failed check to a fake pass. Keep new runner jobs manual until an actual cloud runner is online.
- The cloud VM is a **capacity-constrained shared compute resource**; future scaling needs a bounded queue, concurrency controls, disk cleanup, resource quotas and failure alerts before enabling all projects.
- Verify your cloud billing/quotas and stop before paid resources or unexpected account charges.

GitHub's December 2025 proposal to bill self-hosted Actions minutes was postponed, and current billing documentation continues to state that self-hosted runners are free. Recheck billing policy before future expansion.

Official documentation:
- https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://render.com/docs/free
