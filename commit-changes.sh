#!/bin/bash

cd /home/edohwares/Desktop/Room/drips/stellar-txwatch-web

# Configure git if needed
git config user.name "EDOHWARES"
git config user.email "edohwares@example.com"

# Create a new branch
git checkout -b feature/webhook-hmac-signature-verification 2>/dev/null || git checkout feature/webhook-hmac-signature-verification

# Add all changes
git add .

# Commit the changes
git commit -m "feature: Add webhook HMAC signature verification configuration (#255)

- Add webhook_secret?: string field to WatchedContract type
- Add secret input in new-contract form with password reveal toggle
- Add secret input in edit-metadata modal with password reveal toggle
- Display masked secret in contract detail page with copy button
- Secret is used to sign payloads with HMAC-SHA256
- Receivers can verify X-TxWatch-Signature header"

# Show status
echo "Branch: $(git branch --show-current)"
echo "Commits:"
git log --oneline -5
