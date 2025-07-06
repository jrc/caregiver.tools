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
  * **Safari 9 Compatibility (Clock):** The end-user clock web app **must be Safari 9 compatible** (i.e. iOS 9 (9/2015) / OS X El Capitan (9/2015)).

    * Use var instead of let
    https://caniuse.com/let

    * Use getQueryParam() instead of URLSearchParams
    https://caniuse.com/?search=URLSearchParams

    * Use Moment.js instead of toLocaleTimeString()
    https://caniuse.com/?search=toLocaleTimeString%3Aoptions
    // toLocaleDate/TimeString(locale, ...) is not implemented
    // and polyfill.io returns the time in UTC timezone, so use Moment.js.

    * Use XMLHttpRequest() instead of fetch()
    https://caniuse.com/?search=fetch

    * **Prettier `trailingComma: "none"`:** The `.prettierrc.json` configuration is set to `\"trailingComma\": \"none\"` to avoid trailing commas in JavaScript, as Safari 9's JavaScript engine can interpret them as syntax errors in some contexts, especially for function calls or array/object literals.

/* Safari 9's Date constructor doesn't reliably parse ISO 8601 date strings
   without time/timezone info, often treating them as UTC midnight,
   leading to potential timezone issues. */

  * **Modern Browser Compatibility (Admin):** The admin web app can utilize **modern browser features** like `fetch` and ES6+ JavaScript.
  * **Update Latency:** Message updates do not require real-time delivery; updates **within a few minutes are acceptable**.

-----

## 2. Current Architecture

The current architecture uses Cloudflare Workers KV as a minimal centralized key-value store, accessed via a Cloudflare Worker, with static HTML/CSS/JavaScript for the frontend.

### 2.1. Overall Diagram

```mermaid
graph LR
    subgraph Frontend (Static Pages on dementia.tools)
        A[Admin Browser (Modern JS)] -- 1. POST /message (clock_id, Message) --> B(Cloudflare Worker)
        C[Dementia Clock Browser (Safari 9 JS)] -- 2. GET /message?clock_id= --> B
    end

    subgraph Backend (Cloudflare Edge Network)
        B -- 3. put(clock_id, JSON object) --> D[Cloudflare Workers KV]
        D -- 4. get(clock_id) --> B
    end

    B -- 5. Response --> A
    B -- 6. Response --> C
```

### 2.2. Component Breakdown

#### 2.2.1. The Minimal Backend: Cloudflare Worker + Workers KV

  * **Technology:** Cloudflare Worker (JavaScript runtime at the edge) and Cloudflare Workers KV (globally distributed key-value store).
  * **Purpose:** Provides a simple API for message data, centralized storage, and `clock_id`-based write access control.
  * **Data Structure in KV:** Stores a JSON object like `{ "message": "Your text message here", "imageUrl": null }`, enabling future image support.
  * **API Endpoints:** The Cloudflare Worker's URL serves as the single API endpoint.
      * **Read (GET):** `GET /?clock_id=<CLOCK_ID>` retrieves the message object from KV. No explicit authentication is needed; access relies on `clock_id` obscurity. Response: `{ "message": "...", "imageUrl": null }`.
      * **Write (POST):** `POST /` with a JSON body `{ "clock_id": "...", "message": "...", "imageUrl": "..." }` updates the message object in KV. The `clock_id` itself serves as the write credential. Response: `{ "status": "success", "clock_id": "...", "message": "...", "imageUrl": "..." }` or an error.
  * **Domain Restriction (CORS):** Configured via `Access-Control-Allow-Origin: https://dementia.tools` to restrict browser-based requests to the intended origin.

#### 2.2.2. The Frontend: Static HTML/CSS/JavaScript

  * **Hosting:** Static files deployed on `dementia.tools` (e.g., Cloudflare Pages).

      * **A. Dementia Day Clock (`dementia.tools/dayclock/clock`)**

          * **Compatibility:** Strictly **Safari 9 compatible**, using ES5 JavaScript and `XMLHttpRequest`.
          * **Purpose:** Displays time, date, and the changeable text message.
          * **Loading:** Loaded via `https://dementia.tools/dayclock/clock?clock_id=<CLOCK_ID>`.
          * **Logic:** Parses `clock_id` from the URL, updates time/date, and periodically fetches the message object from the Worker via `GET` `XMLHttpRequest`. It extracts and displays the `message` field. This app **does not use `localStorage` for caching or state persistence** due to Safari 9's unreliability in certain modes.

      * **B. Admin Interface (`dementia.tools/dayclock/admin`)**

          * **Compatibility:** Leverages **modern JavaScript** (`fetch`, ES6+, `async/await`).
          * **Purpose:** Generates new `clock_id`s and manages clock messages.
          * **Loading:** Accessible at `https://dementia.tools/dayclock/admin`, with optional `clock_id` pre-population from URL query parameters.
          * **Logic:** Provides a **`clock_id` generation button** that creates a **typeable phrase** (e.g., 2-3 random dictionary words). For initial setup, it guides the admin to generate and save a new `clock_id`, displaying corresponding Clock and Admin URLs. Admin enters or fetches the message, then saves it via `POST` `fetch` request to the Worker, sending the `clock_id` and message object. Provides clear status feedback.

### 2.3. Key Flows

#### 2.3.1. New Clock Setup

1.  Admin navigates their modern browser to `https://dementia.tools/dayclock/admin`.
2.  Admin clicks "**Generate New Clock ID**". The interface will produce a typeable, random phrase.
3.  The admin interface displays two URLs:
      * **Clock URL:** `https://dementia.tools/dayclock/clock?clock_id=<GENERATED_CLOCK_ID_PHRASE>`
      * **Admin URL:** `https://dementia.tools/dayclock/admin?clock_id=<GENERATED_CLOCK_ID_PHRASE>`
4.  **Critical:** The admin **must securely save** the Admin URL (or just the `clock_id` phrase itself) for future remote administration. This `clock_id` phrase is the "secret" credential for write access.
5.  Admin navigates the patient's Safari 9-compatible clock device to the Clock URL.
6.  The clock begins displaying.

#### 2.3.2. Changing a Message

1.  Admin accesses the specific **Admin URL** for the target clock in their modern browser.
2.  The interface loads, pre-populating the `clock_id` and current message.
3.  Admin enters the new message.
4.  Admin clicks "**Save Message**".
5.  The admin interface sends a `POST` `fetch` request to the Cloudflare Worker with the `clock_id` and new message object.
6.  The Worker updates the message in Workers KV.
7.  Within minutes, the clock display updates with the new message.
