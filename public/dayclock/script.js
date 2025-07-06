(function () {
    "use strict";

    // --- Configuration ---
    const API_ENDPOINT = "https://caregiver-tools-dayclock.jrcplus.workers.dev";

    /**
     * Generates a random, typeable clock ID.
     */
    function generateClockId() {
        // Assuming EFF_SHORT_WORDLIST is available globally from eff_short_wordlist_1.js
        var randomIndex1 = Math.floor(
            Math.random() * EFF_SHORT_WORDLIST.length,
        );
        var randomIndex2 = Math.floor(
            Math.random() * EFF_SHORT_WORDLIST.length,
        );
        var randomIndex3 = Math.floor(
            Math.random() * EFF_SHORT_WORDLIST.length,
        );
        return [
            EFF_SHORT_WORDLIST[randomIndex1],
            EFF_SHORT_WORDLIST[randomIndex2],
            EFF_SHORT_WORDLIST[randomIndex3],
        ].join("-");
    }

    /**
     * Fetches the current message for a given clock ID.
     * @param {string} clockId - The ID of the clock.
     * @returns {Promise<Object|null>} A promise that resolves with the message data or null if not found.
     */
    async function fetchCurrentMessage(clockId) {
        if (!clockId) return null;
        try {
            const response = await fetch(
                `${API_ENDPOINT}?clock_id=${clockId}`,
            );
            if (response.status === 404) {
                return null; // No message set yet
            }
            if (!response.ok) {
                throw new Error(
                    `Server responded with status: ${response.status}`,
                );
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching current message:", error);
            return null;
        }
    }

    /**
     * Generates a unique clock ID by checking for collisions with existing IDs.
     * Retries until a free ID is found.
     * @returns {Promise<string>} A promise that resolves with a unique clock ID.
     */
    async function generateUniqueClockId() {
        let isUnique = false;
        let clockId;

        do {
            clockId = generateClockId();
            const response = await fetchCurrentMessage(clockId);
            // An ID is considered unique/available if there's no data or no message associated with it.
            if (!response || !response.message) {
                isUnique = true;
            } else {
                console.warn(
                    "Generated ID '" +
                        clockId +
                        "' is already in use. Trying a new one.",
                );
            }
        } while (!isUnique);

        return clockId;
    }

    // Export functions to global scope
    window.CaregiverTools = window.CaregiverTools || {};
    window.CaregiverTools.generateClockId = generateClockId;
    window.CaregiverTools.fetchCurrentMessage = fetchCurrentMessage;
    window.CaregiverTools.generateUniqueClockId = generateUniqueClockId;
    window.CaregiverTools.API_ENDPOINT = API_ENDPOINT;
})();
