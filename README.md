# LokiBot Android

Android APK wrapper for LokiBot with a dedicated launcher icon and GitHub Actions APK builds.

## Build

Open Actions → Build LokiBot APK → Run workflow, or push a commit. Download `lokibot-debug-apk` from the workflow artifacts.

## Important

This starter Android app opens the currently hosted LokiBot web experience. It removes provider branding from the Android shell, but it is not a fully offline/source-bundled clone: the web experience and its AI backend still require the existing hosted site. To make it fully independent, the original frontend/backend source and a separate backend hosting configuration must be added to this repository. No API keys belong in the Android app.
