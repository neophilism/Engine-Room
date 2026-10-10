# Independent public availability monitoring

The GitHub Actions workflow `.github/workflows/production-availability.yml` runs at 7, 22, 37, and 52 minutes past each hour (scheduled runs are best effort and may be delayed). It uses standard GitHub Actions for the **public** repository, creates no new Render service, and needs no provider secret.

The Node 22 probe calls only `https://engine-room-1ec7.onrender.com` by default and verifies: `/api/health` identifies Engine Room with database configuration, `/api/ready` reports database readiness, `/login` loads, and unauthenticated `/` redirects to `/login`. Network errors are retried up to three times to tolerate a sleeping Render instance. Unexpected HTTP or application responses fail the check.

The health endpoint includes `release.commit` only if Render provides a valid SHA in its documented `RENDER_GIT_COMMIT` environment variable. For a specific release, choose **Actions → Production public availability → Run workflow**, and enter its exact 40-hex-character commit SHA. That run fails if the observed SHA differs. Automatic scheduled checks record but do not enforce SHA equality, so expected delays in deployment do not create recurring false alarms.

This measures externally visible availability and only basic authentication routing. It does not test signed webhook ingestion, live data freshness, private-account security, restore exercises, penetration testing, security controls, or every operational dashboard. Those require separate, dated production acceptance evidence. Never interpret a GitHub green workflow alone as a completed production release.
