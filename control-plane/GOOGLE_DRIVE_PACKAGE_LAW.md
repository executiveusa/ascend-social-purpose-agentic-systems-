# ASC3ND Google Drive Package Law

## Purpose

This law keeps generated delivery packages discoverable by humans, ChatGPT, GLM, Postiz workers, and future agents.

## Core rule

A ZIP filename becomes immutable once it is uploaded to the ASC3ND Google Drive delivery area.

Agents must not:

- rename an uploaded ZIP;
- create a second package with the same purpose and a different informal name;
- search by approximate phrases when an exact package name is registered;
- treat a local download name as authoritative when the Drive copy has a registered canonical name;
- replace an existing package silently.

## Required lookup sequence

Before creating, reading, replacing, or referencing an ASC3ND package:

1. Read `control-plane/google-drive-package-registry.json`.
2. Resolve the package by `package_id` or exact `canonical_filename`.
3. Search Google Drive using the exact filename.
4. Confirm the internal `README`, `ASSET_MANIFEST.csv`, or campaign manifest matches the registry.
5. Confirm version, status, and purpose.
6. If no exact match exists, stop and report `PACKAGE_NOT_FOUND`.
7. If more than one exact match exists, stop and report `PACKAGE_COLLISION`.

## Rename procedure

If a human renames a Drive package:

1. Do not guess the new name.
2. Record the human-supplied filename exactly in the registry.
3. Preserve the previous name under `aliases`.
4. Update `drive_file_id` or `drive_url` when known.
5. Increment `registry_revision`.
6. Do not rename the package again unless the human explicitly approves it.

## New package naming format

For future packages, use:

`ASC3ND_<PLATFORM_OR_AREA>_<PURPOSE>_<PERIOD_OR_ROUND>_vNN.zip`

Examples:

- `ASC3ND_INSTAGRAM_30_DAY_CAMPAIGN_v01.zip`
- `ASC3ND_CLIENT_PROGRESS_FLIPBOOK_ROUND_01_v01.zip`
- `ASC3ND_VIDEO_INTERVIEW_EDIT_PACKAGE_v01.zip`

Rules:

- uppercase ASCII letters;
- underscores only;
- no spaces;
- no parentheses;
- no words such as `final-final`, `new`, `latest`, or `ChatGPT image`;
- use two-digit versions;
- never overwrite a materially different package without incrementing the version.

## Required package internals

Every agent-operable ZIP should contain:

- `README.md` or `README.txt`;
- `ASSET_MANIFEST.csv` when assets are present;
- machine-readable JSON when scheduling, automation, or workflow data is present;
- exact filenames matching the manifest;
- approval and publishing status;
- source-of-truth notes;
- protected-asset rules;
- a verification report when practical.

## Postiz rule

Postiz adapters must resolve media through the registry and package manifest. They must not rely on an informal Google Drive folder label.

All imported records remain drafts until a human approval ID is attached.

## Failure responses

```text
PACKAGE_NOT_FOUND
Package ID: <id>
Expected filename: <canonical filename>
Safe action: request the exact Drive filename or link.
```

```text
PACKAGE_COLLISION
Package ID: <id>
Exact matches: <list>
Safe action: stop and request human resolution.
```

```text
PACKAGE_RENAME_UNREGISTERED
Previous filename: <name>
Observed filename: <name>
Safe action: update the registry before continuing.
```
