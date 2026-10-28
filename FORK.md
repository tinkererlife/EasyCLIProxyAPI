# Tinkerer Proxy

Personal macOS distribution maintained at https://github.com/tinkererlife/EasyCLIProxyAPI.
Based on upstream commit `dc21f16f31e83b07af24e9991671a6be1b3562dd`.

## What this build changes

- App name: **Tinkerer Proxy**, bundle ID: `life.tinkerer.cliproxy`.
- Separate runtime data: `~/Library/Application Support/life.tinkerer.cliproxy`, restricted to the current user (0700).
- App update checks return local version information without fetching upstream manifests.
  Installing application updates in the app is disabled. Replace the app after a reviewed rebuild.
- Online core installation is disabled. The app installs its bundled CLIProxyAPI 8.0.44 archive.
  Archive hashes are committed in `fork-core-lock.json` and checked both before bundling and before extraction.
- Model-catalog downloads are disabled; bundled defaults remain available.
- The core starts on `127.0.0.1` with remote management disabled.
  The separate web control panel and its automatic downloads are disabled at core startup.
- Plugins are disabled at startup. This build does not rely on third-party plugins.
- Initial API and management keys are separate, random 256-bit values instead of `123456`.
- Upstream auto-merge and release workflows are replaced with a manual Mac build workflow.

The original upstream README follows the fork notice and describes features this distribution may disable.

## Local build

Requirements: macOS, Xcode Command Line Tools, Bun 1.3.14 and Rust 1.95.0.

```sh
bun install --frozen-lockfile
bun run check
cd src-tauri
cargo test --locked fork_policy
cd ..
bun run build:mac
```

The build downloads the exact core archive in the lock file from the upstream GitHub release,
verifies the committed hash, then embeds it. There are no mirrors or `latest` downloads in this build step.
The result is `src-tauri/target/release/bundle/macos/Tinkerer Proxy.app`.
The Mac's native architecture determines whether the build is Apple Silicon or Intel.

The app is ad-hoc signed for personal local use. It is **not** signed using upstream's identity,
and is **not** Apple-notarized. Do not disable Gatekeeper system-wide. Distribution with a trusted
Developer ID signature and notarization requires your own Apple Developer credentials.

## First use

Copy the app to Applications if desired and launch it. OAuth login is deliberately not part of the build.
The local GUI replaces the disabled web management panel. Client integrations are applied only when
you choose them in the GUI; review their proposed configuration before applying them.
The proxy uses port 8317. Do not run another instance on that port at the same time.

## Updating deliberately

1. Fetch upstream and inspect the commit range; do not blindly reset this fork to upstream.
2. Merge selected changes on a review branch, preserving the policy and separate app identity.
3. For a core update, change `core-version.txt` and verify the new archives before changing
   their hashes in `fork-core-lock.json`. The core is still upstream software, not independently audited.
4. Update the version in Cargo.toml and Cargo.lock together. Run policy tests and build the app.
5. Test OAuth, streaming and normal requests locally, then replace the previous app manually.

## Limits

This is update and distribution control, **not a full security audit or sandbox**.
The GUI and the bundled upstream core remain trusted software with access to your tokens and requests.
It does not add Keychain encryption to the upstream credential storage, block all outbound traffic,
or guarantee compliance with model providers' subscription terms.
Plugins and local configuration can still be changed by software with the same user privileges;
startup defaults are not a boundary against a compromised Mac.
Review and ship security fixes promptly: freezing versions indefinitely is not safer.

Upstream code and its MIT license are retained.
