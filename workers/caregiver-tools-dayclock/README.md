# Dementia Day Clock

This project delivers a static-page-based **Dementia Day Clock** featuring a customizable text message.

-----

## 1. Hard Requirements

### High-Level Requirements:

  * **User Roles:** The Dementia Day Clock serves two primary user roles: the **person with dementia** (end-user), who views the clock's display and a customizable text message, and their **caregiver** (admin), who remotely manages this message.
  * **Clock Implementation:** The end-user clock is implemented as static web pages designed for **compatibility with older hardware** (e.g., old phones and tablets).
  * **Caregiver UI:** Caregivers must be able to **update the customizable text message remotely**. The admin interface can target modern web browsers.
  * **Localization:** The clock should use the **current system locale for time and date formatting**.
  * **Future Image Display (v2):** Ideally, the clock should be capable of displaying a customizable image in a future version.

### Technical Requirements:

  * **No Accounts:** The system requires **no user accounts, logins, or traditional authentication**.
  * **Passphrase-based Pairing:** Each clock pairs with its admin via a unique **`clock_id`**. This `clock_id` serves as the write credential and must be **typeable** (e.g., 2-3 random dictionary words). The `clock_id` does not need to be secret from the end-user, only from the general public.
  * **Static Pages / Minimal Backend:** Frontend applications (clock and admin) are **static HTML/CSS/JavaScript**, with no server-side rendering or complex custom backend logic. A lightweight centralized **key-value store** provides persistent storage for changeable text messages.
  * **Safari 9 Compatibility (Clock):** The end-user clock web app **must be Safari 9 compatible** (i.e. iOS 9 (9/2015) / OS X El Capitan (9/2015)). See notes at the top of `clock.html`.
  * **Modern Browser Compatibility (Admin):** The admin web app can utilize **modern browser features** like `fetch` and ES6+ JavaScript.
  * **Update Latency:** Message updates do not require real-time delivery; updates **within a few minutes are acceptable**.

-----

## 2. Current Architecture

The Dementia Day Clock uses a serverless setup based on Cloudflare.
- The frontend is static HTML/CSS/JavaScript, handwritten, using no frameworks, hosted on Cloudflare Pages. There are two parts:
  - `clock.html` which is the viewer app, specifically designed to work on old browsers
  - `admin.html` which is the admin app, for caregivers to manage the clock's custom message
- A Cloudflare Workers KV Store is used to store customizable messages.
- A Cloudflare Worker implements a tiny REST API backend. This worker handles `GET` requests for retrieving messages by a `clock_id` and `POST` requests for updating messages, using the `clock_id` as a write credential and restricting access via CORS.

---

## 3. Cloudflare Setup

This section outlines the steps to deploy the Dementia Day Clock application on Cloudflare.

#### 3.1. Cloudflare Workers KV (Key-Value Store)
1.  Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Navigate to **Workers & Pages** > **KV**.
3.  Click **Create a namespace** and give it a descriptive name, for example, `DAYCLOCK_MESSAGES_KV`. This namespace will store your clock messages.

#### 3.2. Cloudflare Worker (API Backend)
1.  Navigate to **Workers & Pages** > **Overview**.
2.  Click **Create application** > **Create Worker**.
3.  Give your Worker a name, for example, `caregiver-tools-dayclock`.
4.  **Configure KV Binding:**
    *   Once your Worker is created, go to its settings.
    *   Navigate to **Settings** > **Variables** > **KV Namespace Bindings**.
    *   Click **Add binding**.
    *   For **Variable name**, enter `MESSAGES_KV`. (This name must match how your Worker code accesses the KV store.)
    *   For **KV namespace**, select the `DAYCLOCK_MESSAGES_KV` namespace you created in the previous step.
5.  **Deploy Worker Code:**
    *   You will need to deploy your Cloudflare Worker code (which handles the API endpoints for reading and writing messages) to this Worker. Typically, this is done using the `wrangler` CLI tool or by pasting the code directly into the Cloudflare dashboard editor.
    *   Ensure your Worker code implements the `GET /?clock_id=<CLOCK_ID>` and `POST /` (for message updates) endpoints as described in the "API Endpoints" section of this README.
    *   Verify that CORS is configured to allow requests from your frontend domain (e.g., `https://dementia.tools`).

#### 3.3. Cloudflare Pages (Frontend Hosting)
1.  Navigate to **Workers & Pages** > **Pages**.
2.  Click **Create application** > **Direct Upload** (or connect to your Git repository if you prefer automated deployments).
3.  **For Direct Upload:**
    *   Drag and drop the contents of your `public/dayclock` directory (which contains `clock.html`, `admin.html`, and associated assets) into the upload area.
    *   Ensure the `clock.html` is accessible at a path like `https://dementia.tools/dayclock/clock` (this may require configuring a custom domain for your Pages project and setting up appropriate redirects or subdirectories).
4.  **Build Settings (if using Git):**
    *   **Build command:** `(empty)` or `npm run build` if you have a build step.
    *   **Build output directory:** Set this to `public`.
5.  Configure any custom domains or subdomains as needed (e.g., `dementia.tools`).

---

## Debugging

    python3 -m http.server 8080
