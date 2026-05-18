# FraudShield CI/CD — GitHub Secrets Setup Guide

Go to your GitHub repo → Settings → Secrets and Variables → Actions
Then add each secret below.

## Required Secrets

### Server Access (Staging)
| Secret Name       | Value                              |
|-------------------|------------------------------------|
| STAGING_HOST      | IP or hostname of staging server   |
| STAGING_USER      | SSH username (e.g. ubuntu)         |
| STAGING_SSH_KEY   | Private SSH key (RSA/ED25519)      |

### Server Access (Production)
| Secret Name    | Value                                |
|----------------|--------------------------------------|
| PROD_HOST      | IP or hostname of production server  |
| PROD_USER      | SSH username (e.g. ubuntu)           |
| PROD_SSH_KEY   | Private SSH key (RSA/ED25519)        |

### Notifications (Optional)
| Secret Name       | Value                              |
|-------------------|------------------------------------|
| SLACK_WEBHOOK_URL | Slack incoming webhook URL         |

### Auto-provided by GitHub (no action needed)
| Secret Name    | Provided by              |
|----------------|--------------------------|
| GITHUB_TOKEN   | Automatically by Actions |

---

## How to Generate an SSH Key Pair

Run this on your LOCAL machine:

```bash
ssh-keygen -t ed25519 -C "fraudshield-cicd" -f fraudshield_deploy_key
```

This creates:
- `fraudshield_deploy_key`       ← Add this as PROD_SSH_KEY / STAGING_SSH_KEY
- `fraudshield_deploy_key.pub`   ← Add this to your server's ~/.ssh/authorized_keys

On your server:
```bash
cat fraudshield_deploy_key.pub >> ~/.ssh/authorized_keys
```

---

## Environment Variables for docker-compose.prod.yml

Create `/opt/fraudshield/.env` on your production server:

```env
DB_NAME=fraudshield
DB_USER=postgres
DB_PASSWORD=your_very_strong_password
JWT_SECRET=your_very_long_jwt_secret_256_bits
FRONTEND_URL=https://fraudshield.io
GITHUB_REPOSITORY=your-github-username/fraud-shield
```

---

## GitHub Environments Setup

1. Go to Settings → Environments
2. Create environment: **staging**
   - No required reviewers
   - Add environment URL: https://staging.fraudshield.io
3. Create environment: **production**
   - ✅ Required reviewers: add yourself
   - Add environment URL: https://fraudshield.io

This means production deployments need manual approval before they run.
