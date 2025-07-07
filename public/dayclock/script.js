/*
  The JS in this file MUST be compatible with Safari 9.
  This means, at least:
    - Use `var` instead of `let` and `const`.
      <https://caniuse.com/let>
    - Don't use async/await or arrow functions.
    - Don't use trailing commas, as they can be interpreted as syntax errors.
      In `.prettierrc.json`, set `trailingComma: "none"`.
    - Use `XMLHttpRequest()` instead of `fetch()`.
      <https://caniuse.com/?search=fetch>
    - Use `getQueryParam()` instead of `URLSearchParams`.
      <https://caniuse.com/?search=URLSearchParams>
    - Use Moment.js instead of `toLocaleTimeString()`.
      <https://caniuse.com/?search=toLocaleTimeString%3Aoptions>
      `toLocaleDate/TimeString(locale, ...)` is not implemented and polyfill.io
      returns the time in UTC timezone.
    - Use Moment.js to parse ISO 8601 date strings. Safari 9's Date constructor may
      treat them as UTC midnight without time/timezone info.
*/

(function () {
  "use strict";

  // --- Configuration ---
  var API_ENDPOINT = "https://caregiver-tools-dayclock.jrcplus.workers.dev";

  /**
   * Generates a random, typeable clock ID.
   */
  function generateClockId() {
    // Assuming EFF_SHORT_WORDLIST is available globally from eff_short_wordlist_1.js
    var randomIndex1 = Math.floor(Math.random() * EFF_SHORT_WORDLIST.length);
    var randomIndex2 = Math.floor(Math.random() * EFF_SHORT_WORDLIST.length);
    var randomIndex3 = Math.floor(Math.random() * EFF_SHORT_WORDLIST.length);
    return [
      EFF_SHORT_WORDLIST[randomIndex1],
      EFF_SHORT_WORDLIST[randomIndex2],
      EFF_SHORT_WORDLIST[randomIndex3]
    ].join("-");
  }

  /**
   * Fetches the current message for a given clock ID using XMLHttpRequest for Safari 9 compatibility.
   * @param {string} clockId - The ID of the clock.
   * @returns {Promise<Object|null>} A promise that resolves with the message data or null if not found.
   */
  function fetchCurrentMessage(clockId) {
    return new Promise(function (resolve) {
      if (!clockId) {
        resolve(null);
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.open("GET", API_ENDPOINT + "?clock_id=" + clockId, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 404) {
            resolve(null); // No message set yet
          } else if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (error) {
              console.error("Error parsing response:", error);
              resolve(null);
            }
          } else {
            console.error("Server responded with status: " + xhr.status);
            resolve(null);
          }
        }
      };

      xhr.onerror = function () {
        console.error("Error fetching current message");
        resolve(null);
      };

      xhr.send();
    });
  }

  /**
   * Generates a unique clock ID by checking for collisions with existing IDs.
   * Retries until a free ID is found.
   * @returns {Promise<string>} A promise that resolves with a unique clock ID.
   */
  function generateUniqueClockId() {
    return new Promise(function (resolve) {
      function attemptGeneration() {
        var clockId = generateClockId();
        fetchCurrentMessage(clockId).then(function (response) {
          // An ID is considered unique/available if there's no data or no message associated with it.
          if (!response || !response.message) {
            resolve(clockId);
          } else {
            console.warn(
              "Generated ID '" +
                clockId +
                "' is already in use. Trying a new one."
            );
            attemptGeneration();
          }
        });
      }
      attemptGeneration();
    });
  }

  // Export functions to global scope
  window.CaregiverTools = window.CaregiverTools || {};
  window.CaregiverTools.generateClockId = generateClockId;
  window.CaregiverTools.fetchCurrentMessage = fetchCurrentMessage;
  window.CaregiverTools.generateUniqueClockId = generateUniqueClockId;
  window.CaregiverTools.API_ENDPOINT = API_ENDPOINT;
})();
