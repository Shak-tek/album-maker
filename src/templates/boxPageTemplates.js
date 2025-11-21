// src/templates/boxPageTemplates.js

// Square box templates - each template has an id, a human-friendly name,
// and a `slots` array of zero-based indices into CSS slot positions.
// All templates are designed for square (1:1) aspect ratio pages.

export const boxPageTemplates = [
    {
        id: 0,
        name: '1-Up (Full Square)',
        slots: [9],
        thumbnailUrl: '/box-layout-0.png',
    },
    {
        id: 1,
        name: '2-Up (Side-by-Side)',
        slots: [3, 4],
        thumbnailUrl: '/box-layout-1.png',
    },
    {
        id: 2,
        name: '4-Up (Grid 2×2)',
        slots: [5, 6, 7, 8],
        thumbnailUrl: '/box-layout-2.png',
    },
    {
        id: 3,
        name: '3-Up (Horizontal)',
        slots: [0, 1, 2],
        thumbnailUrl: '/box-layout-3.png',
    },
    {
        id: 4,
        name: '3-Up (Vertical)',
        slots: [10, 11, 12],
        thumbnailUrl: '/box-layout-4.png',
    },
    {
        id: 5,
        name: '9-Up (Grid 3×3)',
        slots: [13, 14, 15, 16, 17, 18, 19, 20, 21],
        thumbnailUrl: '/box-layout-5.png',
    },
    {
        id: 6,
        name: '6-Up (Grid 2×3)',
        slots: [22, 23, 24, 25, 26, 27],
        thumbnailUrl: '/box-layout-6.png',
    },
    {
        id: 7,
        name: '2-Up (Horizontal)',
        slots: [28, 29],
        thumbnailUrl: '/box-layout-7.png',
    },
    {
        id: 8,
        name: '5-Up (Center + Corners)',
        slots: [30, 31, 32, 33, 34],
        thumbnailUrl: '/box-layout-8.png',
    },
];
