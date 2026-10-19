#!/usr/bin/env python3
"""Publish OCI's authenticated A1/12-GB capacity reports to one private GitHub issue.

No instance creation, reservations, infrastructure mutations, or paid compute.
Uses OCI instance-principal identity; run on the owner's existing Oracle micro VM.
Run with --dry-run for a local report without updating GitHub.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import stat
import sys
import urllib.error
import urllib.request

REGION = "us-ashburn-1"
SHAPE = "VM.Standard.A1.Flex"
OCPUS = 2
MEMORY_GB = 12
ISSUE_URL = "https://api.github.com/repos/neophilism/Engine-Room/issues/95"
START = "<!-- OCI_A1_CAPACITY_START -->"
END = "<!-- OCI_A1_CAPACITY_END -->"


def normalize_capacity(reports, errors=None, checked_at=None):
    """Convert only matching OCI capacity-report rows to an alert-safe status."""
    errors = errors or []
    rows = []
    for ad_name, records in reports:
        for r in records:
            if r.instance_shape != SHAPE:
                continue
            config = r.instance_shape_config
            if config is None or config.ocpus != OCPUS or config.memory_in_gbs != MEMORY_GB:
                continue
            status = r.availability_status
            count = r.available_count
            # A nonnegative integer count is required for a positive alert.
            if not isinstance(count, int) or isinstance(count, bool) or count < 0:
                count = None
            rows.append({
                "availability_domain": ad_name,
                "fault_domain": r.fault_domain,
                "availability_status": status,
                "available_count": count,
            })
    has_available = any(
        r["availability_status"] == "AVAILABLE"
        and r["available_count"] is not None
        and r["available_count"] >= 1
        for r in rows
    )
    # An incomplete report with no positive capacity cannot establish absence.
    if has_available:
        state = "AVAILABLE"
    elif errors or not rows or any(r["availability_status"] not in
                                ("OUT_OF_HOST_CAPACITY", "HARDWARE_NOT_SUPPORTED", "AVAILABLE")
                                for r in rows):
        state = "ERROR"
    elif any(r["availability_status"] == "AVAILABLE" for r in rows):
        state = "ERROR"
    else:
        state = "OUT_OF_HOST_CAPACITY"
    return {
        "schema_version": 1,
        "source": "oci.compute.create_compute_capacity_report",
        "region": REGION,
        "shape": SHAPE,
        "ocpus": OCPUS,
        "memory_gb": MEMORY_GB,
        "checked_at_utc": checked_at or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "report_state": state,
        "availability": rows,
        "report_errors": len(errors),
    }


def render_issue_body(body, report):
    if body.count(START) != 1 or body.count(END) != 1:
        raise ValueError("Missing or duplicated capacity-report markers in issue")
    a, rest = body.split(START, 1)
    _, b = rest.split(END, 1)
    return a + START + "\n" + json.dumps(report, separators=(",", ":"), sort_keys=True) + "\n" + END + b


def github_request(method, token, payload=None):
    if not token or "\n" in token:
        raise ValueError("Invalid GitHub token file")
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "oci-a1-capacity-watcher",
    }
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(ISSUE_URL, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)


def update_issue(report):
    token_path = Path(os.environ["GITHUB_TOKEN_FILE"])
    st = token_path.stat()
    if not stat.S_ISREG(st.st_mode) or st.st_mode & 0o007:
        raise ValueError("Token file must be a regular file inaccessible to other users")
    token = token_path.read_text(encoding="utf-8").strip()
    existing = github_request("GET", token)
    updated = render_issue_body(existing["body"], report)
    if updated != existing["body"]:
        github_request("PATCH", token, {"body": updated})


def collect_reports():
    import oci  # Delayed so offline unit tests never need OCI SDK installed.
    signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
    root_ocid = os.environ["OCI_TENANCY_OCID"]
    if not root_ocid.startswith("ocid1.tenancy."):
        raise ValueError("OCI_TENANCY_OCID must be the root tenancy OCID")
    cfg = {"region": REGION}
    identity = oci.identity.IdentityClient(cfg, signer=signer)
    compute = oci.core.ComputeClient(cfg, signer=signer)
    ads = identity.list_availability_domains(root_ocid).data
    reports, errors = [], []
    for ad in ads:
        try:
            details = oci.core.models.CreateComputeCapacityReportDetails(
                compartment_id=root_ocid,
                availability_domain=ad.name,
                shape_availabilities=[
                    oci.core.models.CreateCapacityReportShapeAvailabilityDetails(
                        instance_shape=SHAPE,
                        instance_shape_config=oci.core.models.CapacityReportInstanceShapeConfig(
                            ocpus=float(OCPUS), memory_in_gbs=float(MEMORY_GB)
                        ),
                    )
                ],
            )
            response = compute.create_compute_capacity_report(details).data
            reports.append((ad.name, response.shape_availabilities))
        except Exception:
            # Do not leak cloud exception details, OCIDs, auth headers or tokens into the issue.
            errors.append(ad.name)
    return normalize_capacity(reports, errors)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print report without publishing")
    args = parser.parse_args()
    try:
        report = collect_reports()
    except Exception:
        # Fail closed: no optimistic/stale status on credential or SDK failures.
        print("OCI capacity check failed; authenticated access or instance-principal policy may be missing", file=sys.stderr)
        sys.exit(1)
    if args.dry_run:
        print(json.dumps(report, indent=2))
        return
    try:
        update_issue(report)
    except (OSError, ValueError, KeyError, urllib.error.HTTPError, urllib.error.URLError):
        print("Could not publish OCI capacity report to GitHub issue #95", file=sys.stderr)
        sys.exit(1)
    print("Capacity report published: " + report["report_state"])


if __name__ == "__main__":
    main()
