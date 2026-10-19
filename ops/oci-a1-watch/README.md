# OCI A1 availability reporter (2 OCPUs / 12 GB, Ashburn)

## Current state

Code is prepared for the owner's existing Always Free Ubuntu 24.04 **E2.1.Micro** VM. It has **not** been installed, authenticated, or demonstrated to run; issue [#95](https://github.com/neophilism/Engine-Room/issues/95) remains NOT_CONFIGURED until the real reporter publishes. ChatGPT's hourly Oracle A1 capacity watch reads issue #95 and only notifies on positive, fresh, tenancy-authenticated reports.

The reporter calls only \`IdentityClient.list_availability_domains\` and \`ComputeClient.create_compute_capacity_report\`; the word "create" here creates a **capacity report**, not a VM or a capacity reservation. Nothing launches instances. Report success does not guarantee capacity will remain when you manually click Create.

## Owner-only cloud configuration

1. In OCI, open **Identity & Security > Dynamic Groups** and create \`github-ci-capacity-watch\`, with membership rule **ALL {instance.id = 'YOUR_MICRO_VM_OCID'}**. Use the **instance OCID** from the *running E2.1.Micro*, not the tenancy OCID. Wait for dynamic-group propagation.
2. Create one policy in the root compartment, using the exact dynamic-group name:

   \`\`\`
   Allow dynamic-group github-ci-capacity-watch to manage compute-capacity-reports in tenancy
   Allow dynamic-group github-ci-capacity-watch to inspect compartments in tenancy
   \`\`\`

   Oracle's \`manage compute-capacity-reports\` permission covers only the capacity report API. \`inspect compartments\` is necessary for \`ListAvailabilityDomains\`. Do **not** grant \`manage instance-family\`, API keys, or an administrator policy. If IAM blocks the above, stop and inspect errors rather than broadening permissions.
3. Copy the root **tenancy** OCID (not a secret; it still should not be published unnecessarily). It looks like \`ocid1.tenancy.oc1..\`; enter it only on your VM as an environment value.
4. In GitHub, create a **fine-grained personal access token** scoped only to \`neophilism/Engine-Room\`, with **Issues: Read and write** permission. Set an expiry; paste the token only into a VM terminal, **never into ChatGPT, issues, PRs, or code**. This is needed solely to update the private issue #95; the Oracle reporter does not need access to any source code.
5. Restrict inbound port 22 to your current SSH client address/VPN egress IP. The reporter only uses outbound OCI HTTPS and GitHub HTTPS.

## Install on the existing micro VM

The commands below are a checklist for an SSH session. Download the **reviewed** \`ops/oci-a1-watch/report_capacity.py\` from this repository onto your own computer and copy it to the VM using \`scp\`; don't run unreviewed remote scripts.

\`\`\`bash
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip
sudo useradd --system --no-create-home --shell /usr/sbin/nologin a1watch || true
sudo install -d -o root -g root -m 0755 /opt/oci-a1-watch
sudo python3 -m venv /opt/oci-a1-watch/venv
sudo /opt/oci-a1-watch/venv/bin/pip install --no-cache-dir 'oci>=2.150,<3'
# Transfer report_capacity.py through scp into /tmp, then:
sudo install -o root -g root -m 0644 /tmp/report_capacity.py /opt/oci-a1-watch/report_capacity.py
sudo install -d -o root -g a1watch -m 0750 /etc/oci-a1-watch
sudo install -o root -g a1watch -m 0640 /dev/null /etc/oci-a1-watch/github.token
sudo install -o root -g root -m 0600 /dev/null /etc/oci-a1-watch/agent.env
\`\`\`

Edit \`/etc/oci-a1-watch/agent.env\` **on the VM** with:

\`\`\`ini
OCI_TENANCY_OCID=ocid1.tenancy.oc1..REPLACE_WITH_ACTUAL_ROOT_TENANCY_OCID
GITHUB_TOKEN_FILE=/etc/oci-a1-watch/github.token
\`\`\`

Set the token file content *privately* without including it in shell history, for example \`sudoedit /etc/oci-a1-watch/github.token\`. Ensure the token is readable by group \`a1watch\` and no other users. Never echo the token in logs. \`sudoedit\` preserves the file permissions when correctly used, but verify afterwards with \`sudo stat -c '%a %U %G' /etc/oci-a1-watch/github.token\`; expected \`640 root a1watch\`. Ensure its parent directory is \`750 root a1watch\`.

Copy the \`oci-a1-watch.service\` and \`oci-a1-watch.timer\` unit files into \`/etc/systemd/system/\` (review them first); then:

\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl enable --now oci-a1-watch.timer
sudo systemctl start oci-a1-watch.service
sudo systemctl status oci-a1-watch.service --no-pager
sudo systemctl list-timers --all | grep oci-a1-watch
\`\`\`

The VM checks all availability domains approximately hourly. Check issue #95 for an updated \`checked_at_utc\` and non-\`NOT_CONFIGURED\` report. Only then is the ChatGPT hourly capacity alert truly operational. Failed OCI credentials/permissions or GitHub publishing produce an error and **do not** signal availability.

To test report logic offline, before cloud setup:

\`\`\`bash
python3 -m unittest /opt/oci-a1-watch/test_report_capacity.py
\`\`\`

## Safety properties

- No Oracle password, API private key, PAT, SSH key, or signing credential is committed.
- The OCI SDK uses **instance principals**, not human account credentials.
- The output includes only shape, time, region, AD, status and counts (no tenancy/instance OCIDs).
- Publishing is to the fixed, private Engine Room issue #95; no arbitrary URLs or file destinations.
- Unknown/partial errors do not become AVAILABLE unless **actual OCI capacity** was positively reported.
- The GitHub reader task validates shape, CPU, memory, freshness and positive count before notifying.
- An operator should periodically check account billing, security controls and token expiration. This is a watch, not a reservation or guarantee.

Official references: [OCI capacity reports](https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/compute-capacity-report/create.html), [OCI compute capacity IAM permission](https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/corepolicyreference.htm), and [GitHub fine-grained tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
