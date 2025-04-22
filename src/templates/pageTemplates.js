// src/templates/pageTemplates.js

// Each template has an id, a human‑friendly name, and
// a `slots` array of zero‑based indices into the 10 CSS slot positions.
export const pageTemplates = [
    {
        id: 0,
        name: '3‑Up (Row of 3)',
        slots: [0, 1, 2],      // CSS: .slot1, .slot2, .slot3
    },
    {
        id: 1,
        name: '2‑Up (Side‑by‑Side)',
        slots: [3, 4],         // CSS: .slot4, .slot5
    },
    {
        id: 2,
        name: '4‑Up (Grid 2×2)',
        slots: [5, 6, 7, 8],   // CSS: .slot6, .slot7, .slot8, .slot9
    },
    {
        id: 3,
        name: '1‑Up (Full‑Bleed)',
        slots: [9],            // CSS: .slot10
    },
    // …you can add more templates here as you please
];
