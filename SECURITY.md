# Security Policy

## Supported versions

Security fixes are applied to the latest release.

## Reporting a vulnerability

Use the repository's **Security** tab and select **Report a vulnerability**. Do not open a public issue for a suspected vulnerability, exposed credential, or private attendee data.

Include the affected version, impact, reproduction steps, and any suggested mitigation. Remove real credentials and personal data from screenshots, logs, and sample files.

## Remote-control boundary

The default six-digit remote channel is designed for ordinary event facilitation. It is not an authentication mechanism for sensitive systems. Deployments with higher security requirements should use authenticated private channels, server-side authorization, rate limits, and event-specific resource isolation.
