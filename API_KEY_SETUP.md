# LokiBot API key setup

## Important: do not commit your real API key

Do not paste a real API key into a tracked file in this repository. If the repository is public, anyone can read it, copy the key, and use your quota. An Android APK also cannot safely hide a key embedded inside it.

## Where to add the key

1. Open the repository on GitHub: https://github.com/elad113/Lokizbot
2. Go to **Settings → Secrets and variables → Actions**.
3. Choose **New repository secret**.
4. Use the exact secret name expected by the backend. For the current LokiBot hosted chat backend, that is `LOKIZON_AI_API_KEY` if the backend still uses its existing configuration.
5. Paste the key into the **Secret** value field and save it. Never put the key in a commit, issue, README, or screenshot.

## Important limitation in the current APK

The Android app currently opens the existing hosted LokiBot website in a WebView. It does not read files from this GitHub repository at runtime, and adding a GitHub Actions secret by itself does not change the hosted website's backend. The secret must be configured in the server that handles `/api/chat`, or a backend deployment workflow must explicitly deploy that server with the secret available as an environment variable. Do not inject the secret into the APK or frontend JavaScript.

After the backend is configured to read the secret from its server environment, the app can use it through the backend API without exposing the key to users.