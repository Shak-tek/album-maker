// src/components/EditorPage.js
import "./EditorPage.css";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ColorThief from "color-thief-browser";
import { Box, Button, Layer, Text, Spinner, Meter, Heading, RadioButtonGroup } from "grommet";
import { Template as TemplateIcon, Brush, Add, Directions } from "grommet-icons"; // NEW: Add
import Cropper from "react-easy-crop";
import TemplateModal from "./TemplateModal";
import ThemeModal from "./ThemeModal";
import SettingsBar from "./SettingsBar";
import { pageTemplates } from "../templates/pageTemplates";
import TitleModal from "./TitleModal";
import TextEditor, { TextEditorModal } from "./TextEditor";

// base ImageKit URL for rendering uploaded images
const IK_URL_ENDPOINT = process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "";

// helper to build a resized ImageKit URL with cache-busting
const getResizedUrl = (key, width = 1200) =>
    `${IK_URL_ENDPOINT}/${encodeURI(key)}?tr=w-${width},fo-face&v=${Date.now()}`;

const stripImageKitFaceFocus = (src) => {
    if (!src || typeof src !== "string" || !src.includes("tr=")) return src;
    try {
        const [base, query = ""] = src.split("?");
        const params = new URLSearchParams(query);
        const tr = params.get("tr");
        if (!tr) return src;
        const filtered = tr
            .split(",")
            .map((token) => token.trim())
            .filter((token) => token && !token.startsWith("fo-"));
        if (filtered.length) {
            params.set("tr", filtered.join(","));
        } else {
            params.delete("tr");
        }
        const rebuilt = params.toString();
        return rebuilt ? `${base}?${rebuilt}` : base;
    } catch {
        const withoutFace = src.replace(/([?&]tr=)[^&#]*/i, (match, prefix) => {
            const value = match.slice(prefix.length);
            const filtered = value
                .split(",")
                .filter((token) => token && !token.startsWith("fo-"));
            if (!filtered.length) return "";
            return `${prefix}${filtered.join(",")}`;
        });
        return withoutFace
            .replace(/\?&/g, "?")
            .replace(/&&/g, "&")
            .replace(/\?$/, "")
            .replace(/&$/, "");
    }
};

const getCropBaseSrc = (src) => {
    if (!src || typeof src !== "string") return src;
    if (src.startsWith("data:")) return src;
    return stripImageKitFaceFocus(src);
};

const parseFontSize = (size) => {
    if (typeof size === "number" && !Number.isNaN(size)) {
        return { value: size, unit: "px" };
    }
    if (typeof size !== "string") return { value: 0, unit: "px" };
    const match = size.trim().match(/^([0-9.]+)\s*(px|rem|em)?$/i);
    if (!match) return { value: 0, unit: "px" };
    return { value: parseFloat(match[1]) || 0, unit: match[2] || "px" };
};

const scaleFontSize = (size, factor, min = 10) => {
    const { value, unit } = parseFontSize(size);
    if (!value) return `${min}${unit}`;
    const scaled = Math.max(min, Math.round(value * factor));
    return `${scaled}${unit}`;
};

const computeLineHeight = (size) => {
    const { value } = parseFontSize(size);
    if (!value) return "1.32";
    if (value >= 50) return "1.1";
    if (value >= 36) return "1.18";
    if (value >= 28) return "1.24";
    return "1.32";
};

const DEFAULT_TEXT_SETTINGS = {
    fontFamily: 'Inter, system-ui, Helvetica, Arial, sans-serif',
    fontSize: '32px',
    color: '#1F2933',
};

const DEFAULT_TITLE_ORIENTATION = "top";
const COVER_IMAGE_RECT = { top: 20, left: 12, width: 76, height: 60 };

const INTRO_PAGES = 2;

const COVER_TEMPLATE = { id: "__cover__", slots: [9], textSlots: [] };
const BLANK_TEMPLATE = { id: "__blank__", slots: [], textSlots: [] };

const findTemplateById = (id) => pageTemplates.find((t) => t.id === id) || null;

const isCoverPageIndex = (idx) => idx === 0;
const isBlankIntroPageIndex = (idx) => idx === 1;

const getTemplateForPageIndex = (page, pageIdx) => {
    if (isCoverPageIndex(pageIdx)) return COVER_TEMPLATE;
    if (isBlankIntroPageIndex(pageIdx)) return BLANK_TEMPLATE;
    return findTemplateById(page?.templateId) || null;
};

const getSlotsForPageIndex = (page, pageIdx) => {
    const template = getTemplateForPageIndex(page, pageIdx);
    return Array.isArray(template?.slots) ? template.slots : [];
};

const getTextSlotsForPageIndex = (page, pageIdx) => {
    const template = getTemplateForPageIndex(page, pageIdx);
    return Array.isArray(template?.textSlots) ? template.textSlots : [];
};

const getSlotCountForPageIndex = (page, pageIdx) => {
    const slots = getSlotsForPageIndex(page, pageIdx);
    if (slots.length) return slots.length;
    const assignedLength = Array.isArray(page?.assignedImages) ? page.assignedImages.length : 0;
    if (assignedLength) return assignedLength;
    return 0;
};

const rectToPercentStyle = (rect) => ({
    top: `${rect.top}%`,
    left: `${rect.left}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
});


// ---------------------- SLOT GEOMETRY (kept only for 0..9) ----------------------
const slotMargin = 5;
const gap = 5;
const halfWidth = (100 - 2 * slotMargin - gap) / 2;
const halfHeight = halfWidth;

// 0..9 canonical slots (backgroundEnabled = true)
const SLOT_MAP_BG = [
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${100 - 2 * slotMargin}%` }, // 0
    { top: `${slotMargin}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` }, // 1
    { top: `${slotMargin + halfHeight + gap}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` }, // 2
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${100 - 2 * slotMargin}%` }, // 3
    { top: `${slotMargin}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${100 - 2 * slotMargin}%` }, // 4
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${halfHeight}%` }, // 5
    { top: `${slotMargin}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` }, // 6
    { top: `${slotMargin + halfHeight + gap}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${halfHeight}%` }, // 7
    { top: `${slotMargin + halfHeight + gap}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` }, // 8
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${100 - 2 * slotMargin}%`, height: `${100 - 2 * slotMargin}%` }, // 9
];

// use canonical only when background is ON
function getSlotRect(slotIndex, backgroundEnabled) {
    if (!backgroundEnabled) return null;
    return SLOT_MAP_BG[slotIndex] ?? null;
}

// ---------------------- Normalization helpers (for "remove background") ----------------------
/**
 * Measure each slot element in pixels relative to the page, then
 * normalize to percentages that fill the union bounding box.
 * Returns percent strings to drop straight into style.
 */
function computeNormalizedRects(slotEls) {
    const firstEl = slotEls.find(Boolean);
    if (!firstEl) return null;

    const page = firstEl.closest(".photo-page");
    if (!page) return null;

    const pr = page.getBoundingClientRect();
    const pw = Math.max(1e-6, pr.width);
    const ph = Math.max(1e-6, pr.height);

    const rects = slotEls.map((el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const left = ((r.left - pr.left) / pw) * 100;
        const top = ((r.top - pr.top) / ph) * 100;
        const width = (r.width / pw) * 100;
        const height = (r.height / ph) * 100;
        return { top, left, width, height, right: left + width, bottom: top + height };
    });

    if (!rects.length || rects.some((r) => r == null)) return null;

    const minTop = Math.min(...rects.map((r) => r.top));
    const minLeft = Math.min(...rects.map((r) => r.left));
    const maxBottom = Math.max(...rects.map((r) => r.bottom));
    const maxRight = Math.max(...rects.map((r) => r.right));

    const spanX = Math.max(1e-6, maxRight - minLeft);
    const spanY = Math.max(1e-6, maxBottom - minTop);

    return rects.map((r) => ({
        top: `${((r.top - minTop) / spanY) * 100}%`,
        left: `${((r.left - minLeft) / spanX) * 100}%`,
        width: `${(r.width / spanX) * 100}%`,
        height: `${(r.height / spanY) * 100}%`,
    }));
}

// ---------------------- Crop helpers ----------------------
const createImageEl = (url) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });

const degToRad = (deg) => (deg * Math.PI) / 180;

function getRotatedSize(width, height, rotation) {
    const rotRad = Math.abs(degToRad(rotation));
    const sin = Math.sin(rotRad);
    const cos = Math.cos(rotRad);
    return {
        width: Math.abs(width * cos) + Math.abs(height * sin),
        height: Math.abs(width * sin) + Math.abs(height * cos),
    };
}

async function getCroppedDataUrl(imageSrc, pixelCrop, rotation = 0, quality = 0.92) {
    const image = await createImageEl(imageSrc);
    const rotRad = degToRad(rotation);

    const { width: bBoxWidth, height: bBoxHeight } = getRotatedSize(image.width, image.height, rotation);

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) throw new Error("Canvas 2D not available");

    tempCanvas.width = bBoxWidth;
    tempCanvas.height = bBoxHeight;

    tempCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
    tempCtx.rotate(rotRad);
    tempCtx.translate(-image.width / 2, -image.height / 2);
    tempCtx.drawImage(image, 0, 0);

    const outputCanvas = document.createElement("canvas");
    const outputCtx = outputCanvas.getContext("2d");
    if (!outputCtx) throw new Error("Canvas 2D not available");

    const targetWidth = Math.max(1, Math.round(pixelCrop.width));
    const targetHeight = Math.max(1, Math.round(pixelCrop.height));

    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;

    const maxSx = Math.max(0, tempCanvas.width - pixelCrop.width);
    const maxSy = Math.max(0, tempCanvas.height - pixelCrop.height);
    const sx = Math.min(maxSx, Math.max(0, pixelCrop.x));
    const sy = Math.min(maxSy, Math.max(0, pixelCrop.y));

    outputCtx.drawImage(
        tempCanvas,
        sx,
        sy,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        targetWidth,
        targetHeight
    );

    return outputCanvas.toDataURL("image/jpeg", quality);
}

// ensure a page's edits array exists and has at least n entries
function ensureEditsArray(ps, n) {
    const arr = ps.edits && Array.isArray(ps.edits) ? [...ps.edits] : [];
    while (arr.length < n) arr.push(null);
    return arr;
}

const shallowEqualArray = (a = [], b = []) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

const normalizeIntroPagesSettings = (pages) => {
    if (!Array.isArray(pages)) {
        return { changed: false, pages };
    }

    const normalizeTheme = (theme) => {
        if (!theme || typeof theme !== "object") {
            return { mode: "dynamic", color: null, image: null };
        }
        const normalized = {
            mode: typeof theme.mode === "string" ? theme.mode : "dynamic",
            color: typeof theme.color === "string" ? theme.color : null,
            image: typeof theme.image === "string" ? theme.image : null,
        };
        if (
            normalized.mode === theme.mode &&
            normalized.color === theme.color &&
            normalized.image === theme.image
        ) {
            return theme;
        }
        return normalized;
    };

    const next = pages.map((p) => ({
        ...p,
        theme: normalizeTheme(p?.theme),
        assignedImages: Array.isArray(p?.assignedImages) ? [...p.assignedImages] : [],
        edits: Array.isArray(p?.edits) ? [...p.edits] : [],
        texts: Array.isArray(p?.texts) ? [...p.texts] : [],
    }));

    let changed = false;

    const ensureIntroPage = (idx) => {
        if (!next[idx]) {
            next[idx] = {
                templateId: null,
                theme: { mode: "dynamic", color: null, image: null },
                assignedImages: [],
                edits: [],
                texts: [],
            };
            changed = true;
        }
        const page = next[idx];

        if (page.templateId !== null) {
            page.templateId = null;
            changed = true;
        }

        const normalizedTheme = normalizeTheme(page.theme);
        if (normalizedTheme !== page.theme) {
            page.theme = normalizedTheme;
            changed = true;
        }

        const slotCount = getSlotCountForPageIndex(page, idx);

        const desiredAssigned = Array.isArray(page.assignedImages)
            ? page.assignedImages.slice(0, slotCount)
            : [];
        while (desiredAssigned.length < slotCount) desiredAssigned.push(null);
        if (!shallowEqualArray(page.assignedImages, desiredAssigned)) {
            page.assignedImages = desiredAssigned;
            changed = true;
        }

        const desiredEdits = ensureEditsArray(
            { edits: Array.isArray(page.edits) ? page.edits.slice(0, slotCount) : [] },
            slotCount
        ).slice(0, slotCount);
        if (!shallowEqualArray(page.edits, desiredEdits)) {
            page.edits = desiredEdits;
            changed = true;
        }

        if (page.texts.length) {
            page.texts = [];
            changed = true;
        }
    };

    ensureIntroPage(0);
    ensureIntroPage(1);

    while (next.length < INTRO_PAGES) {
        next.push({
            templateId: null,
            theme: { mode: "dynamic", color: null, image: null },
            assignedImages: [],
            edits: [],
            texts: [],
        });
        changed = true;
    }

    return { changed, pages: next };
};

// NEW: track a slot awaiting an upload and a snapshot of prior images
const usePrevious = (val) => {
    const ref = useRef(val);
    useEffect(() => { ref.current = val; }, [val]);
    return ref.current;
};

export default function EditorPage(props) {
    const {
        images = [],
        onAddImages: onAddImagesProp,
        albumSize,
        s3,
        sessionId,
        user,
        identityId,
        title,
        subtitle,
        setTitle,
        setSubtitle,
    } = props;

    // --- Synchronous restore from localStorage to prevent a "random" first render ---
    const _initialFromStorage = (() => {
        try {
            const raw = localStorage.getItem("pageSettings");
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return null;
            // normalize edits array shape
            return parsed.map((ps) => ({
                ...ps,
                edits: Array.isArray(ps.edits) ? ps.edits : [],
                texts: Array.isArray(ps.texts) ? ps.texts : [],
            }));
        } catch {
            return null;
        }
    })();
    const _storedTextSettings = (() => {
        try {
            const raw = localStorage.getItem("textSettings");
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            const { fontFamily, fontSize, color } = parsed;
            return {
                fontFamily: typeof fontFamily === "string" ? fontFamily : DEFAULT_TEXT_SETTINGS.fontFamily,
                fontSize: typeof fontSize === "string" ? fontSize : DEFAULT_TEXT_SETTINGS.fontSize,
                color: typeof color === "string" ? color : DEFAULT_TEXT_SETTINGS.color,
            };
        } catch {
            return null;
        }
    })();
    const _storedTitleOrientation = (() => {
        try {
            const raw = localStorage.getItem("titleOrientation");
            if (raw === "top" || raw === "bottom") return raw;
            return DEFAULT_TITLE_ORIENTATION;
        } catch {
            return DEFAULT_TITLE_ORIENTATION;
        }
    })();
    const [pageSettings, setPageSettings] = useState(_initialFromStorage || []);
    // Remember whether we actually restored something so we don't auto-generate
    const [restoredFromStorage] = useState(Boolean(_initialFromStorage));
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateModalPage, setTemplateModalPage] = useState(null);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [themeModalPage, setThemeModalPage] = useState(null);
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [showOrientationModal, setShowOrientationModal] = useState(false);
    
    const [backgroundEnabled, setBackgroundEnabled] = useState(true);
    const [imagesWarm, setImagesWarm] = useState(false);
    const [dynamicPalette, setDynamicPalette] = useState([]);
    const [dynamicPaletteLoading, setDynamicPaletteLoading] = useState(false);
    // upload progress state for Add Photos
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    // NEW: pending target for an upload into a specific slot
    const [pendingUploadTarget, setPendingUploadTarget] = useState(null); // { pageIdx, slotIdx } | null
    const prevImages = usePrevious(images);

    // dynamic normalized rects when background is disabled
    // shape: { [pageIdx]: Array<{top,left,width,height} | null> }
    const [noBgRects, setNoBgRects] = useState({});

    const previewRef = useRef(null);
    const previewImgRef = useRef(null);
    const dragActiveRef = useRef(false);
    const dragSrcRef = useRef({ page: null, slot: null });
    const touchTimerRef = useRef(null);
    const mouseHoldTimerRef = useRef(null);
    const skipClickRef = useRef(false);
    // reference to hidden file input in SettingsBar so we can trigger it from placeholders
    const fileInputRef = useRef(null);

    // page containers (for PDF)
    const refs = useRef([]);

    // refs for each slot to compute DOM aspect dynamically
    const slotRefs = useRef([]); // slotRefs.current[pageIdx][slotIdx] = element

    const [saving, setSaving] = useState(false);
    const paddingPercent = albumSize ? (albumSize.height / albumSize.width) * 100 : 75;
    const hasDynamicPaletteSources = pageSettings.some(
        (ps) => Array.isArray(ps.assignedImages) && ps.assignedImages.some(Boolean)
    );

    const MIN_CROPPER_ZOOM = 0.3;
    const MAX_CROPPER_ZOOM = 5;
    const CROPPER_ZOOM_STEP = 0.01;

    // ---------------- Cropper state ----------------
    const [cropOpen, setCropOpen] = useState(false);
    const [cropTarget, setCropTarget] = useState({ pageIdx: null, slotIdx: null, aspect: 1 });
    const [cropState, setCropState] = useState({ crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 });
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [cropSource, setCropSource] = useState(null);
    const [cropImageMeta, setCropImageMeta] = useState({ width: null, height: null });
    const cropSourceRef = useRef(null);
    const cropperContainerRef = useRef(null);

    const getSlotSrc = (ps, slotIdx) => {
        const edit = ps.edits?.[slotIdx];
        return edit?.previewDataUrl || ps.assignedImages[slotIdx];
    };

    // force LTR + text style
    const [textSettings, setTextSettings] = useState(_storedTextSettings || { ...DEFAULT_TEXT_SETTINGS });
    const [titleOrientation, setTitleOrientation] = useState(
        _storedTitleOrientation || DEFAULT_TITLE_ORIENTATION
    );
    const [activeTextSlot, setActiveTextSlot] = useState(null); // { pageIdx, textIdx, placeholder }
    const defaultTitleFontSize = textSettings?.fontSize || DEFAULT_TEXT_SETTINGS.fontSize;
    const defaultTextBoxFontSize = scaleFontSize(defaultTitleFontSize, 0.65, 14);
    const defaultTextBaseStyle = {
        fontFamily: textSettings?.fontFamily || DEFAULT_TEXT_SETTINGS.fontFamily,
        fontSize: defaultTextBoxFontSize,
        color: textSettings?.color || DEFAULT_TEXT_SETTINGS.color,
        lineHeight: computeLineHeight(defaultTextBoxFontSize),
    };
    const coverImageStyle = rectToPercentStyle(COVER_IMAGE_RECT);
    const activeTextValue = activeTextSlot
        ? pageSettings[activeTextSlot.pageIdx]?.texts?.[activeTextSlot.textIdx] || ""
        : "";


    // ----------------- OPTIONAL: try restoring from server (Netlify) if nothing in localStorage -----------------
    useEffect(() => {
        if (restoredFromStorage || pageSettings.length) return;
        if (!user || !sessionId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/.netlify/functions/session?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(user.id)}`);
                if (!res.ok) return;
                const data = await res.json();
                const remote = data?.settings?.pageSettings;
                const remoteTextSettings = data?.settings?.textSettings;
                if (Array.isArray(remote) && !cancelled) {
                    setPageSettings(
                        remote.map((ps) => ({
                            ...ps,
                            edits: Array.isArray(ps.edits) ? ps.edits : [],
                            texts: Array.isArray(ps.texts) ? ps.texts : [],
                        }))
                    );
                    setImagesWarm(false);
                    if (remoteTextSettings) {
                        setTextSettings({
                            fontFamily: typeof remoteTextSettings.fontFamily === "string" ? remoteTextSettings.fontFamily : DEFAULT_TEXT_SETTINGS.fontFamily,
                            fontSize: typeof remoteTextSettings.fontSize === "string" ? remoteTextSettings.fontSize : DEFAULT_TEXT_SETTINGS.fontSize,
                            color: typeof remoteTextSettings.color === "string" ? remoteTextSettings.color : DEFAULT_TEXT_SETTINGS.color,
                        });
                    }
                    const remoteOrientation = data?.settings?.titleOrientation;
                    if (remoteOrientation === "top" || remoteOrientation === "bottom") {
                        setTitleOrientation(remoteOrientation);
                    }
                }
            } catch {
                // ignore; fall back to local init below
            }
        })();
        return () => { cancelled = true; };
    }, [restoredFromStorage, pageSettings.length, user, sessionId]);
    // initialize per-page assignments whenever `images` changes
    useEffect(() => {
        // Only auto-generate if we truly have nothing restored (no local, no remote)
        if (pageSettings.length) return;
        if (restoredFromStorage) return;

        const remaining = images.slice();
        const createIntroPage = () => ({
            templateId: null,
            theme: { mode: "dynamic", color: null, image: null },
            assignedImages: [],
            edits: [],
            texts: [],
        });
        const pages = [createIntroPage(), createIntroPage()];

        if (remaining.length) {
            pages[0].assignedImages = [remaining.shift()];
            pages[0].edits = [null];
        }

        let contentPageIndex = 0;
        while (remaining.length > 0) {
            const candidates = pageTemplates
                .map((t) => ({ ...t, _slots: Math.max(1, t.slots?.length ?? 1) }))
                .filter((t) => t._slots <= remaining.length);

            if (!candidates.length) break;

            let templateId;
            const preferTwoUp = candidates.find((t) => t.id === 1);
            if (contentPageIndex < 2 && preferTwoUp) {
                templateId = preferTwoUp.id;
            } else {
                const preferFull = candidates.find((t) => t.id === 3);
                if (contentPageIndex === 0 && preferFull) {
                    templateId = preferFull.id;
                } else {
                    templateId = candidates[contentPageIndex % candidates.length].id;
                }
            }
            const tmpl = candidates.find((t) => t.id === templateId) || candidates[0];
            const slotsCount = Math.max(1, tmpl.slots?.length ?? 1);
            const assigned = remaining.splice(0, slotsCount);

            pages.push({
                templateId: tmpl.id,
                theme: { mode: "dynamic", color: null, image: null },
                assignedImages: assigned,
                edits: new Array(slotsCount).fill(null),
                texts: tmpl.textSlots ? new Array(tmpl.textSlots.length).fill("") : [],
            });
            contentPageIndex += 1;
        }

        setPageSettings(pages);
        setImagesWarm(false);
    }, [images, pageSettings.length, restoredFromStorage]);

    useEffect(() => {
        if (!pageSettings.length) return;
        const { changed, pages } = normalizeIntroPagesSettings(pageSettings);
        if (changed) {
            setPageSettings(pages);
        }
    }, [pageSettings]);

    // persist to localStorage & DB
    useEffect(() => {
        localStorage.setItem("pageSettings", JSON.stringify(pageSettings));
        localStorage.setItem("textSettings", JSON.stringify(textSettings));
        localStorage.setItem("titleOrientation", titleOrientation);
        if (user && sessionId) {
            fetch("/.netlify/functions/session", {
                method: "POST",
                body: JSON.stringify({
                    userId: user.id,
                    sessionId,
                    settings: { albumSize, identityId, pageSettings, user, title, subtitle, textSettings, titleOrientation },
                }),
            }).catch(console.error);
        }
    }, [pageSettings, textSettings, titleOrientation, albumSize, identityId, user, sessionId, title, subtitle]);

    useEffect(() => {
        if (!activeTextSlot) return;
        const { pageIdx, textIdx } = activeTextSlot;
        const page = pageSettings[pageIdx];
        if (!page || !Array.isArray(page.texts) || textIdx >= page.texts.length) {
            setActiveTextSlot(null);
        }
    }, [activeTextSlot, pageSettings]);

    // dynamic theme colors via ColorThief
    useEffect(() => {
        if (!imagesWarm) return;
        const thief = new ColorThief();
        pageSettings.forEach((ps, idx) => {
            if (ps.theme.mode === "dynamic" && ps.assignedImages[0] && !ps.theme.color) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = ps.assignedImages[0];
                img.onload = () => {
                    const [r, g, b] = thief.getColor(img);
                    const rgb = `rgb(${r}, ${g}, ${b})`;
                    setPageSettings((prev) => {
                        if (prev[idx].theme.color === rgb) return prev;
                        const next = [...prev];
                        next[idx] = { ...next[idx], theme: { mode: "dynamic", color: rgb, image: null } };
                        return next;
                    });
                };
            }
        });
    }, [imagesWarm, pageSettings]);

    // build a global palette derived from uploaded/assigned images
    useEffect(() => {
        if (!imagesWarm) {
            setDynamicPaletteLoading(false);
            return;
        }

        const assigned = pageSettings.flatMap((ps) => ps.assignedImages).filter(Boolean);
        if (!assigned.length) {
            setDynamicPalette((prev) => (prev.length ? [] : prev));
            setDynamicPaletteLoading(false);
            return;
        }

        let cancelled = false;
        setDynamicPaletteLoading(true);

        const thief = new ColorThief();
        const MAX_SOURCE_IMAGES = 8;
        const COLORS_PER_IMAGE = 25;
        const MAX_COLORS = 51;
        const uniqueSources = Array.from(new Set(assigned)).slice(0, MAX_SOURCE_IMAGES);
        const paletteSet = new Set();

        const loaders = uniqueSources.map(
            (url) =>
                new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = url;
                    img.onload = () => {
                        if (cancelled) return resolve();
                        try {
                            const palette = thief.getPalette(img, COLORS_PER_IMAGE);
                            palette?.forEach(([r, g, b]) => {
                                if (paletteSet.size < MAX_COLORS) {
                                    paletteSet.add(`rgb(${r}, ${g}, ${b})`);
                                }
                            });
                        } catch (err) {
                            console.error("color thief palette error", err);
                        }
                        resolve();
                    };
                    img.onerror = () => resolve();
                })
        );

        Promise.all(loaders)
            .then(() => {
                if (cancelled) return;
                const nextColors = Array.from(paletteSet);
                setDynamicPalette((prev) => {
                    if (prev.length === nextColors.length && prev.every((c, idx) => c === nextColors[idx])) {
                        return prev;
                    }
                    return nextColors;
                });
                setDynamicPaletteLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setDynamicPaletteLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [imagesWarm, pageSettings]);

    // preload assigned images (skip nulls)
    useEffect(() => {
        if (!pageSettings.length) return;
        const allUrls = pageSettings.flatMap((ps) => ps.assignedImages).filter(Boolean);
        if (!allUrls.length) {
            setImagesWarm(true);
            return;
        }
        let loaded = 0;
        allUrls.forEach((url) => {
            const img = new Image();
            img.src = url;
            img.onload = img.onerror = () => {
                loaded += 1;
                if (loaded === allUrls.length) setImagesWarm(true);
            };
        });
    }, [pageSettings]);


    // -------------- DRAG & DROP (image swap, preserved edits) --------------
    const getTouchCoords = (e) => {
        if (e.touches?.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches?.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        if (typeof e.clientX === "number" && typeof e.clientY === "number") return { x: e.clientX, y: e.clientY };
        return lastTouchRef.current || { x: 0, y: 0 };
    };

    const longPressDuration = 300;
    const lastTouchRef = useRef({ x: 0, y: 0 });

    const cancelMouseDrag = () => {
        if (mouseHoldTimerRef.current) {
            clearTimeout(mouseHoldTimerRef.current);
            mouseHoldTimerRef.current = null;
        }
    };

    const scheduleMouseDrag = (pi, si, e) => {
        cancelMouseDrag();
        if (e?.persist) e.persist();
        const nativeEvent = e?.nativeEvent || e;
        if (nativeEvent) {
            const { clientX, clientY } = nativeEvent;
            lastTouchRef.current = {
                x: typeof clientX === "number" ? clientX : 0,
                y: typeof clientY === "number" ? clientY : 0,
            };
        }
        mouseHoldTimerRef.current = setTimeout(() => {
            if (!mouseHoldTimerRef.current) return;
            mouseHoldTimerRef.current = null;
            if (!nativeEvent) return;
            const { x, y } = lastTouchRef.current;
            const fakeEvent = {
                clientX: typeof x === "number" ? x : nativeEvent.clientX,
                clientY: typeof y === "number" ? y : nativeEvent.clientY,
                target: nativeEvent.target || nativeEvent.currentTarget || null,
                currentTarget: nativeEvent.currentTarget || null,
                cancelable: true,
                preventDefault: () => nativeEvent.preventDefault?.(),
                stopPropagation: () => nativeEvent.stopPropagation?.(),
            };
            startDrag(pi, si, fakeEvent);
        }, longPressDuration);
    };

    const handleSlotClick = (pageIdx, slotIdx, isEmpty, e) => {
        if (isEmpty) return;
        cancelMouseDrag();
        cancelTouchDrag();
        if (dragActiveRef.current) return;
        if (skipClickRef.current) {
            e?.stopPropagation?.();
            return;
        }
        e?.stopPropagation?.();
        openCropper(pageIdx, slotIdx);
    };

    const scheduleTouchDrag = (pi, si, e) => {
        cancelTouchDrag();
        const touch = e.touches?.[0];
        if (touch) {
            lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

            touchTimerRef.current = setTimeout(() => {
                if (touchTimerRef.current) { // Check if still valid
                    const fakeEvent = {
                        clientX: lastTouchRef.current.x,
                        clientY: lastTouchRef.current.y,
                        touches: [{ clientX: lastTouchRef.current.x, clientY: lastTouchRef.current.y }],
                        stopPropagation: () => { },
                        cancelable: true,
                        preventDefault: () => { },
                    };
                    startDrag(pi, si, fakeEvent);
                }
            }, longPressDuration);
        }
    };

    const cancelTouchDrag = () => {
        if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (mouseHoldTimerRef.current) {
                clearTimeout(mouseHoldTimerRef.current);
                mouseHoldTimerRef.current = null;
            }
            if (touchTimerRef.current) {
                clearTimeout(touchTimerRef.current);
                touchTimerRef.current = null;
            }
            skipClickRef.current = false;
        };
    }, []);

    const startDrag = (pageIdx, slotIdx, e) => {
        cancelMouseDrag();
        cancelTouchDrag();
        e.stopPropagation();

        // Check if there's actually an image to drag
        const url = pageSettings[pageIdx]?.assignedImages?.[slotIdx];
        if (!url) return;

        skipClickRef.current = true;
        dragActiveRef.current = true;
        dragSrcRef.current = { page: pageIdx, slot: slotIdx };

        // Set preview image
        const previewSrc = getSlotSrc(pageSettings[pageIdx], slotIdx);
        if (previewImgRef.current && previewSrc) {
            previewImgRef.current.src = previewSrc;
        }

        const { x, y } = getTouchCoords(e);
        lastTouchRef.current = { x, y };

        // Show and position preview
        if (previewRef.current) {
            previewRef.current.style.display = "block";
            previewRef.current.style.left = `${x - 25}px`; // Center the preview
            previewRef.current.style.top = `${y - 25}px`;
        }

        // Add event listeners
        document.addEventListener("mousemove", movePreview, { passive: false });
        document.addEventListener("mouseup", handleDrop, { passive: false });
        document.addEventListener("touchmove", movePreview, { passive: false });
        document.addEventListener("touchend", handleDrop, { passive: false });
    };

    const movePreview = (e) => {
        if (!dragActiveRef.current || !previewRef.current) return;

        e.preventDefault(); // Prevent scrolling on touch devices

        const { x, y } = getTouchCoords(e);
        lastTouchRef.current = { x, y };

        // Update preview position
        previewRef.current.style.left = `${x - 25}px`;
        previewRef.current.style.top = `${y - 25}px`;

        // Clear previous highlights
        document.querySelectorAll(".photo-slot.highlight").forEach((el) => {
            el.classList.remove("highlight");
        });

        // Find element under cursor/touch
        const elementBelow = document.elementFromPoint(x, y);
        const targetSlot = elementBelow?.closest(".photo-slot");

        if (targetSlot && targetSlot !== e.target?.closest?.(".photo-slot")) {
            targetSlot.classList.add("highlight");
        }
    };

    const handleDrop = (e) => {
        if (!dragActiveRef.current) return;

        const { x, y } = getTouchCoords(e);
        lastTouchRef.current = { x, y };

        // Find the drop target
        const elementBelow = document.elementFromPoint(x, y);
        const targetSlot = elementBelow?.closest(".photo-slot");

        if (targetSlot) {
            const tgtPage = parseInt(targetSlot.dataset.pageIndex, 10);
            const tgtSlot = parseInt(targetSlot.dataset.slotIndex, 10);
            const { page: srcPage, slot: srcSlot } = dragSrcRef.current;

            // Only swap if it's a different slot and both indices are valid
            if (
                srcPage !== null &&
                srcSlot !== null &&
                !isNaN(tgtPage) &&
                !isNaN(tgtSlot) &&
                (srcPage !== tgtPage || srcSlot !== tgtSlot)
            ) {
                setPageSettings((prev) => {
                    const next = prev.map((ps) => ({
                        ...ps,
                        assignedImages: [...(ps.assignedImages || [])],
                        edits: ensureEditsArray(ps, Math.max(ps.assignedImages?.length || 0, ps.edits?.length || 0)),
                    }));

                    // Ensure arrays are long enough
                    const srcPage_data = next[srcPage];
                    const tgtPage_data = next[tgtPage];

                    if (!srcPage_data || !tgtPage_data) return prev;

                    // Swap images
                    const tempImage = srcPage_data.assignedImages[srcSlot];
                    srcPage_data.assignedImages[srcSlot] = tgtPage_data.assignedImages[tgtSlot];
                    tgtPage_data.assignedImages[tgtSlot] = tempImage;

                    // Swap edits (crops should follow their images)
                    const tempEdit = srcPage_data.edits?.[srcSlot] || null;
                    if (!srcPage_data.edits) srcPage_data.edits = [];
                    if (!tgtPage_data.edits) tgtPage_data.edits = [];

                    srcPage_data.edits[srcSlot] = tgtPage_data.edits?.[tgtSlot] || null;
                    tgtPage_data.edits[tgtSlot] = tempEdit;

                    return next;
                });
            }
        }

        endDrag();
    };

    const endDrag = () => {
        if (!dragActiveRef.current) return;

        dragActiveRef.current = false;
        dragSrcRef.current = { page: null, slot: null };

        // Hide preview
        if (previewRef.current) {
            previewRef.current.style.display = "none";
        }

        // Clear highlights
        document.querySelectorAll(".photo-slot.highlight").forEach((el) => {
            el.classList.remove("highlight");
        });

        // Remove event listeners
        document.removeEventListener("mousemove", movePreview);
        document.removeEventListener("mouseup", handleDrop);
        document.removeEventListener("touchmove", movePreview);
        document.removeEventListener("touchend", handleDrop);

        // Cancel any pending touch drag
        cancelTouchDrag();

        setTimeout(() => {
            skipClickRef.current = false;
        }, 0);
    };

    // NEW: helper – find newest image URL that is not used anywhere yet
    const findNewestUnusedImage = (allImages, pages) => {
        const used = new Set();
        pages.forEach((p) => (p.assignedImages || []).forEach((u) => u && used.add(u)));
        for (let i = allImages.length - 1; i >= 0; i -= 1) {
            const url = allImages[i];
            if (url && !used.has(url)) return url;
        }
        return null;
    };

    // NEW: when images prop grows and we have a pending target, drop newest unused into that slot
    useEffect(() => {
        if (!pendingUploadTarget) return;
        const grew = (prevImages?.length || 0) < (images?.length || 0);
        if (!grew) return;

        const newest = findNewestUnusedImage(images || [], pageSettings);
        if (!newest) return;

        const { pageIdx, slotIdx } = pendingUploadTarget;
        setPageSettings((prev) => {
            const next = prev.map((p) => ({ ...p, assignedImages: [...(p.assignedImages || [])] }));
            if (!next[pageIdx]) return prev;
            next[pageIdx].assignedImages[slotIdx] = newest;
            // ensure edits length
            next[pageIdx].edits = ensureEditsArray(next[pageIdx], next[pageIdx].assignedImages.length);
            return next;
        });
        setPendingUploadTarget(null);
    }, [images, pendingUploadTarget, pageSettings, prevImages]);

    // NEW: click handler for "+" placeholder
    const handleUploadToSlot = (pageIdx, slotIdx) => {
        setPendingUploadTarget({ pageIdx, slotIdx });
        // trigger the hidden file input from SettingsBar
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleOpenTextEditor = useCallback((pageIdx, textIdx, placeholder) => {
        setActiveTextSlot({ pageIdx, textIdx, placeholder });
    }, []);

    const handleCloseTextEditor = useCallback(() => setActiveTextSlot(null), []);

    // ---------------- TEMPLATE & THEME ----------------
    const openTemplateModal = (pi) => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setTemplateModalPage(pi);
        setShowTemplateModal(true);
    };

    // CHANGED: allow larger templates and fill extras with null placeholders
    const pickTemplate = (pi, tid) => {
        if (pi <= 1) {
            setShowTemplateModal(false);
            return;
        }
        setPageSettings((prev) => {
            const next = prev.map((p) => ({ ...p, assignedImages: [...(p.assignedImages || [])] }));
            const page = next[pi];
            const requested = pageTemplates.find((t) => t.id === tid);
            const newSlots = Math.max(1, requested?.slots?.length ?? 1);

            page.templateId = tid;

            const newTextSlots = requested?.textSlots?.length ?? 0;
            page.texts = (page.texts || []).slice(0, newTextSlots);
            while (page.texts.length < newTextSlots) page.texts.push("");

            // resize edits to at least newSlots
            page.edits = ensureEditsArray(page, newSlots).slice(0, newSlots);

            const curr = page.assignedImages.length;

            if (curr > newSlots) {
                // shrink
                page.assignedImages = page.assignedImages.slice(0, newSlots);
            } else if (curr < newSlots) {
                // grow: pad remaining slots with null placeholders
                const padded = [...page.assignedImages];
                while (padded.length < newSlots) padded.push(null);
                page.assignedImages = padded.slice(0, newSlots);
            }

            return next;
        });

        // After changing templates, recompute no-bg rects (next paint)
        requestAnimationFrame(() => requestAnimationFrame(() => recomputeNoBgRects()));
        setShowTemplateModal(false);
    };

    const openThemeModal = (pi) => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setThemeModalPage(pi);
        setShowThemeModal(true);
    };

    const pickTheme = (pi, { mode, color, image }) => {
        setPageSettings((prev) =>
            prev.map((s, i) => {
                if (pi === null || pi === undefined || pi === -1 || i === pi) {
                    return {
                        ...s,
                        theme: {
                            mode,
                            color: mode === "dynamic" ? (color ?? null) : color,
                            image: mode === "image" ? image : null,
                        },
                    };
                }
                return s;
            })
        );
        setShowThemeModal(false);
    };

    // ---------------- PDF SAVE ----------------
    const handleSave = async () => {
        if (!albumSize || !sessionId || !user?.id) return;
        setSaving(true);

        const round = (value) => Math.round(value * 1000) / 1000;
        const toPercent = (value, total) => {
            if (!total || Number.isNaN(total)) return 0;
            return (value / total) * 100;
        };

        const collectPageGeometry = (pageEl) => {
            if (!pageEl) {
                return { slots: [], textSlots: [], titleOverlay: null };
            }

            const pageRect = pageEl.getBoundingClientRect();

            const slots = Array.from(pageEl.querySelectorAll("[data-slot-index]"))
                .map((el) => {
                    const rect = el.getBoundingClientRect();
                    const slotIndex = Number(el.dataset.slotIndex ?? 0);
                    return {
                        slotIndex,
                        bounds: {
                            top: round(toPercent(rect.top - pageRect.top, pageRect.height)),
                            left: round(toPercent(rect.left - pageRect.left, pageRect.width)),
                            width: round(toPercent(rect.width, pageRect.width)),
                            height: round(toPercent(rect.height, pageRect.height)),
                        },
                    };
                })
                .sort((a, b) => a.slotIndex - b.slotIndex);

            const textSlots = Array.from(pageEl.querySelectorAll("[data-text-index]"))
                .map((el) => {
                    const rect = el.getBoundingClientRect();
                    const textIndex = Number(el.dataset.textIndex ?? 0);
                    const computed = window.getComputedStyle(el);
                    return {
                        textIndex,
                        bounds: {
                            top: round(toPercent(rect.top - pageRect.top, pageRect.height)),
                            left: round(toPercent(rect.left - pageRect.left, pageRect.width)),
                            width: round(toPercent(rect.width, pageRect.width)),
                            height: round(toPercent(rect.height, pageRect.height)),
                        },
                        style: {
                            fontFamily: computed.fontFamily,
                            fontSize: computed.fontSize,
                            color: computed.color,
                            lineHeight: computed.lineHeight,
                            fontWeight: computed.fontWeight,
                            fontStyle: computed.fontStyle,
                            textAlign: computed.textAlign,
                        },
                    };
                })
                .sort((a, b) => a.textIndex - b.textIndex);

            const overlayEl = pageEl.querySelector(".title-overlay");
            let titleOverlay = null;
            if (overlayEl) {
                const rect = overlayEl.getBoundingClientRect();
                const computed = window.getComputedStyle(overlayEl);
                const headingEl = overlayEl.querySelector("h1");
                const subheadingEl = overlayEl.querySelector("h2");
                const headingStyle = headingEl ? window.getComputedStyle(headingEl) : null;
                const subheadingStyle = subheadingEl ? window.getComputedStyle(subheadingEl) : null;
                titleOverlay = {
                    bounds: {
                        top: round(toPercent(rect.top - pageRect.top, pageRect.height)),
                        left: round(toPercent(rect.left - pageRect.left, pageRect.width)),
                        width: round(toPercent(rect.width, pageRect.width)),
                        height: round(toPercent(rect.height, pageRect.height)),
                    },
                    style: {
                        fontFamily: computed.fontFamily,
                        color: computed.color,
                        textAlign: computed.textAlign,
                    },
                    headingStyle: headingStyle
                        ? {
                              fontSize: headingStyle.fontSize,
                              fontWeight: headingStyle.fontWeight,
                              lineHeight: headingStyle.lineHeight,
                          }
                        : null,
                    subheadingStyle: subheadingStyle
                        ? {
                              fontSize: subheadingStyle.fontSize,
                              fontWeight: subheadingStyle.fontWeight,
                              lineHeight: subheadingStyle.lineHeight,
                          }
                        : null,
                };
            }

            return { slots, textSlots, titleOverlay };
        };

        const pages = pageSettings.map((ps, index) => {
            const layout = collectPageGeometry(refs.current[index]);
            return {
                index,
                templateId: ps?.templateId ?? null,
                theme: ps?.theme || null,
                assignedImages: Array.isArray(ps?.assignedImages) ? [...ps.assignedImages] : [],
                edits: Array.isArray(ps?.edits)
                    ? ps.edits.map((edit) =>
                          edit
                              ? {
                                    originalSrc: edit.originalSrc || null,
                                    previewDataUrl: edit.previewDataUrl || null,
                                    params: edit.params || null,
                                }
                              : null,
                      )
                    : [],
                texts: Array.isArray(ps?.texts) ? [...ps.texts] : [],
                layout,
            };
        });

        const payload = {
            jobType: "album-pdf",
            sessionId,
            userId: user.id,
            customerName: user.name || user.email || "Customer",
            albumSize,
            backgroundEnabled,
            title,
            subtitle,
            textSettings: textSettings ? { ...textSettings } : null,
            titleOrientation,
            pages,
        };

        try {
            const res = await fetch("/.netlify/functions/queue-album-job", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const message = await res.text();
                throw new Error(message || "Failed to queue album job");
            }
        } catch (error) {
            console.error("Failed to queue album job", error);
        } finally {
            setSaving(false);
        }
    };

    // ---------------- OPEN/CLOSE CROP MODAL ----------------
    const openCropper = (pi, slotIdx) => {
        const ps = pageSettings[pi];
        if (!ps) return;
        const edit = ps.edits?.[slotIdx] || null;
        const rawSrc = edit?.originalSrc || ps.assignedImages?.[slotIdx];
        if (!rawSrc) return;
        const normalizedSource = getCropBaseSrc(rawSrc);
        if (!normalizedSource) return;

        // Aspect from the REAL DOM slot (works for any slot index)
        let aspect = 1;
        const el = slotRefs.current?.[pi]?.[slotIdx];
        if (el) {
            const r = el.getBoundingClientRect();
            if (r.width && r.height) aspect = r.width / r.height;
        }

        const prev = edit?.params;
        const initialZoom = Math.min(
            MAX_CROPPER_ZOOM,
            Math.max(MIN_CROPPER_ZOOM, prev?.zoom || 1)
        );
        setCropState(
            prev
                ? {
                      crop: { ...(prev.crop || { x: 0, y: 0 }) },
                      zoom: initialZoom,
                      rotation: prev.rotation || 0,
                  }
                : { crop: { x: 0, y: 0 }, zoom: initialZoom, rotation: 0 }
        );
        setCroppedAreaPixels(prev?.croppedAreaPixels ?? null);
        setCropSource(normalizedSource);
        setCropTarget({ pageIdx: pi, slotIdx, aspect });
        setCropOpen(true);
    };

    const closeCropper = () => {
        setCropOpen(false);
        setCropTarget({ pageIdx: null, slotIdx: null, aspect: 1 });
        setCroppedAreaPixels(null);
        setCropSource(null);
        setCropImageMeta({ width: null, height: null });
        cropSourceRef.current = null;
    };

    const onCropComplete = (_, areaPixels) => setCroppedAreaPixels(areaPixels);

    const saveCrop = async () => {
        const { pageIdx, slotIdx } = cropTarget;
        if (pageIdx == null || slotIdx == null) return;
        const ps = pageSettings[pageIdx];
        const rawSrc = cropSource || ps.assignedImages[slotIdx];
        if (!rawSrc || !croppedAreaPixels) return;
        const normalizedSrc = getCropBaseSrc(rawSrc);
        if (!normalizedSrc) return;
        const dataUrl = await getCroppedDataUrl(normalizedSrc, croppedAreaPixels, cropState.rotation);

        setPageSettings((prev) => {
            const next = prev.map((p) => ({ ...p }));
            const edits = ensureEditsArray(next[pageIdx], next[pageIdx].assignedImages.length);
            edits[slotIdx] = {
                originalSrc: normalizedSrc,
                previewDataUrl: dataUrl,
                params: { ...cropState, aspect: cropTarget.aspect, croppedAreaPixels },
            };
            next[pageIdx].edits = edits;
            return next;
        });
        closeCropper();
    };

    const resetCropForSlot = (pi, slotIdx) => {
        setPageSettings((prev) => {
            const next = prev.map((p) => ({ ...p }));
            if (!next[pi].edits) return next;
            next[pi].edits[slotIdx] = null;
            return next;
        });
    };

    useEffect(() => {
        if (!cropOpen || !cropSource) {
            setCropImageMeta({ width: null, height: null });
            return;
        }
        let cancelled = false;
        createImageEl(cropSource)
            .then((img) => {
                if (cancelled) return;
                const width = img.naturalWidth || img.width || null;
                const height = img.naturalHeight || img.height || null;
                setCropImageMeta({ width, height });
            })
            .catch(() => {
                if (!cancelled) {
                    setCropImageMeta({ width: null, height: null });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [cropSource, cropOpen]);

    useEffect(() => {
        if (!cropOpen) return;
        if (!cropSource) {
            cropSourceRef.current = null;
            return;
        }
        if (cropSourceRef.current && cropSourceRef.current !== cropSource) {
            setCropState({
                crop: { x: 0, y: 0 },
                zoom: Math.min(MAX_CROPPER_ZOOM, Math.max(MIN_CROPPER_ZOOM, 1)),
                rotation: 0,
            });
            setCroppedAreaPixels(null);
        }
        cropSourceRef.current = cropSource;
    }, [cropSource, cropOpen]);

    const handleZoomSliderChange = (event) => {
        const nextZoom = Number(event.target.value);
        if (Number.isNaN(nextZoom)) return;
        const clampedZoom = Math.min(Math.max(nextZoom, MIN_CROPPER_ZOOM), MAX_CROPPER_ZOOM);
        setCropState((prev) => ({ ...prev, zoom: clampedZoom }));
        setCroppedAreaPixels(null);
    };

    const handleRotateClick = () => {
        setCropState((prev) => ({
            ...prev,
            rotation: ((prev.rotation || 0) + 90) % 360,
        }));
        setCroppedAreaPixels(null);
    };

    const handleFillClick = () => {
        const container = cropperContainerRef.current;
        const { width, height } = cropImageMeta;
        if (container && width && height) {
            const nextZoom = Math.max(
                MIN_CROPPER_ZOOM,
                Math.max(container.offsetWidth / width, container.offsetHeight / height)
            );
            const clampedZoom = Math.min(nextZoom, MAX_CROPPER_ZOOM);
            setCropState((prev) => ({
                ...prev,
                crop: { x: 0, y: 0 },
                zoom: clampedZoom,
            }));
        } else {
            setCropState((prev) => ({
                ...prev,
                crop: { x: 0, y: 0 },
                zoom: Math.max(prev.zoom, MIN_CROPPER_ZOOM),
            }));
        }
        setCroppedAreaPixels(null);
    };

    const handleReplaceImage = () => {
        const { pageIdx, slotIdx } = cropTarget;
        if (pageIdx == null || slotIdx == null) return;
        handleUploadToSlot(pageIdx, slotIdx);
        closeCropper();
    };

    const handleRemoveImage = () => {
        const { pageIdx, slotIdx } = cropTarget;
        if (pageIdx == null || slotIdx == null) return;
        setPageSettings((prev) =>
            prev.map((page, index) => {
                if (index !== pageIdx) return page;
                const assignedImages = Array.isArray(page.assignedImages) ? [...page.assignedImages] : [];
                if (slotIdx >= assignedImages.length) return page;
                if (assignedImages[slotIdx] == null) return page;
                assignedImages[slotIdx] = null;
                const edits = ensureEditsArray(page, Math.max(assignedImages.length, slotIdx + 1));
                edits[slotIdx] = null;
                return {
                    ...page,
                    assignedImages,
                    edits,
                };
            })
        );
        setImagesWarm(false);
        closeCropper();
    };

    // ---------------- NORMALIZATION (remove background) ----------------
    const recomputeNoBgRects = () => {
        const next = {};
        pageSettings.forEach((ps, pi) => {
            const els = (slotRefs.current?.[pi] || []).filter(Boolean);
            if (!els.length) return;
            const rects = computeNormalizedRects(els);
            if (rects) next[pi] = rects;
        });
        setNoBgRects(next);
    };

    // Recompute whenever bg turns OFF or layout/images are ready
    useEffect(() => {
        if (!imagesWarm || !pageSettings.length) return;
        if (!backgroundEnabled) {
            // Wait two frames for layout to settle, then measure
            requestAnimationFrame(() => {
                requestAnimationFrame(() => recomputeNoBgRects());
            });
        } else {
            setNoBgRects({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imagesWarm, pageSettings, backgroundEnabled]);

    // Recompute after template changes that alter slot geometry
    useEffect(() => {
        if (!backgroundEnabled) {
            requestAnimationFrame(() => requestAnimationFrame(() => recomputeNoBgRects()));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageSettings.map(p => p.templateId).join(",")]);

    // Keep in sync on resize while bg is OFF
    useEffect(() => {
        if (backgroundEnabled) return;
        const onResize = () => recomputeNoBgRects();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backgroundEnabled, pageSettings]);

    const normalizedZoom = Math.min(Math.max(cropState.zoom, MIN_CROPPER_ZOOM), MAX_CROPPER_ZOOM);
    const zoomPercent = Math.round(normalizedZoom * 100);
    const printQualityScore = (() => {
        const width = croppedAreaPixels?.width || cropImageMeta.width;
        const height = croppedAreaPixels?.height || cropImageMeta.height;
        if (!width || !height) return null;
        const minSide = Math.min(width, height);
        return Math.min(10, Math.max(1, Math.round(minSide / 200)));
    })();
    const printQualityLabel = printQualityScore ? `${printQualityScore}/10` : "N/A";
    const isCropActionsDisabled = !cropSource;
    const zoomSliderId = "cropper-zoom-slider";
    const cropperStyle = useMemo(() => {
        const aspect =
            cropTarget?.aspect && Number.isFinite(cropTarget.aspect) && cropTarget.aspect > 0
                ? cropTarget.aspect
                : 1;
        const isLandscape = aspect >= 1;
        return {
            width: "100%",
            maxWidth: `${isLandscape ? 520 : 420}px`,
            aspectRatio: `${aspect}`,
            maxHeight: `${isLandscape ? 520 : 640}px`,
            minHeight: "280px",
            margin: "0 auto",
        };
    }, [cropTarget?.aspect]);

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    const trimmedSubtitle = typeof subtitle === "string" ? subtitle.trim() : "";
    const headerNode = (
        <div className="editor-header">
            <h1 className="editor-header__title">{trimmedTitle || "Untitled Album"}</h1>
            {trimmedSubtitle ? (
                <p className="editor-header__subtitle">{trimmedSubtitle}</p>
            ) : null}
        </div>
    );

    // ---------------- RENDER ----------------
    return (
        <>
            {/* SKELETON */}
            {!imagesWarm ? (
                <div className="editor-page">
                    <div className="page-container">
                        {headerNode}
                        <div className="container">
                            {pageSettings.map((ps, pi) => {
                                const slots = getSlotsForPageIndex(ps, pi);
                                const textSlots = getTextSlotsForPageIndex(ps, pi);
                                const isIntroPage = pi < INTRO_PAGES;
                                return (
                                    <div
                                        key={pi}
                                        className={`page-wrapper skeleton-page-wrapper${isIntroPage ? " intro-page" : ""}`}
                                    >
                                        <Box direction="row" wrap gap="small" pad="small">
                                            {slots.map((_, slotIdx) => (
                                                <div key={`slot-${slotIdx}`} className="skeleton-photo-slot" />
                                            ))}
                                            {textSlots.map((_, slotIdx) => (
                                                <div key={`text-${slotIdx}`} className="skeleton-photo-slot" />
                                            ))}
                                            {slots.length === 0 && textSlots.length === 0 && (
                                                <div className="skeleton-photo-slot skeleton-photo-slot--blank" />
                                            )}
                                        </Box>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                // REAL EDITOR
                <div className="editor-page">
                    <div className="page-container">
                        {headerNode}
                        <div className="container">
                            {pageSettings.map((ps, pi) => {
                                const isCoverPage = isCoverPageIndex(pi);
                                const isIntroPage = pi < INTRO_PAGES;
                                const slots = getSlotsForPageIndex(ps, pi);
                                const textSlots = getTextSlotsForPageIndex(ps, pi);
                                const bgColor = ps.theme.color || "transparent";
                                const wrapperStyle = ps.theme.image
                                    ? {
                                        backgroundImage: `url(${ps.theme.image})`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                    }
                                    : { backgroundColor: bgColor };
                                const wrapperClassName = `page-wrapper${isIntroPage ? " intro-page" : ""}`;
                                const canChangeTemplate = pi >= INTRO_PAGES;
                                const canChangeTheme = pi !== 1;
                                const showToolbar = canChangeTemplate || canChangeTheme || isIntroPage;

                                const titleFontSize = textSettings?.fontSize || '32px';
                                const titleLineHeight = computeLineHeight(titleFontSize);
                                const subtitleFontSize = scaleFontSize(titleFontSize, 0.6, 14);
                                const subtitleLineHeight = computeLineHeight(subtitleFontSize);
                                const textBoxFontSize = scaleFontSize(titleFontSize, 0.65, 14);
                                const textBoxBaseStyle = {
                                    fontFamily: textSettings.fontFamily,
                                    fontSize: textBoxFontSize,
                                    color: textSettings.color,
                                    lineHeight: computeLineHeight(textBoxFontSize),
                                };

                                return (
                                    <div key={pi} className={wrapperClassName} style={wrapperStyle}>
                                        {showToolbar && (
                                            <Box className="toolbar" direction="row" gap="small" align="center">
                                                {canChangeTemplate && (
                                                    <Button
                                                        icon={<TemplateIcon />}
                                                        color="black"
                                                        className="btn-ico"
                                                        onClick={() => openTemplateModal(pi)}
                                                    />
                                            )}
                                            {canChangeTheme && (
                                                <Button icon={<Brush />} color="black" className="btn-ico" onClick={() => openThemeModal(pi)} />
                                            )}
                                            {isIntroPage && (
                                                <Button
                                                    icon={<Directions />}
                                                    color="black"
                                                    className="btn-ico"
                                                    onClick={() => setShowOrientationModal(true)}
                                                    title="Adjust title position"
                                                    aria-label="Adjust title position"
                                                />
                                            )}
                                            </Box>
                                        )}

                                        <div className={`photo-page ${!backgroundEnabled ? "zoomed" : ""} ${isCoverPage ? "cover-page-layout" : ""}`}>
                                            {slots.map((slotPosIndex, slotIdx) => {
                                                const inlinePos = backgroundEnabled
                                                    ? (getSlotRect(slotPosIndex, true) || null)
                                                    : (noBgRects?.[pi]?.[slotIdx] || null);

                                                const imgSrc = getSlotSrc(ps, slotIdx);
                                                const transitionDelay = !backgroundEnabled ? `${slotIdx * 40}ms` : "0ms";

                                                const isEmpty = !imgSrc;

                                                return (
                                                    <div
                                                        key={`${slotPosIndex}-${slotIdx}`}
                                                        className={`photo-slot slot${slotPosIndex + 1} ${isEmpty ? "empty-slot" : ""}`}
                                                        data-page-index={pi}
                                                        data-slot-index={slotIdx}
                                                        ref={(el) => {
                                                            if (!slotRefs.current[pi]) slotRefs.current[pi] = [];
                                                            slotRefs.current[pi][slotIdx] = el || null;
                                                        }}
                                                        style={{
                                                            ...(inlinePos || {}),
                                                            position: "absolute",
                                                            overflow: "hidden",
                                                            borderRadius: isCoverPage ? "24px" : "4px",
                                                            visibility: (!backgroundEnabled && !inlinePos) ? "hidden" : "visible",
                                                            transition:
                                                                "top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease, opacity 200ms ease, transform 200ms ease",
                                                            transitionDelay,
                                                            willChange: "top, left, width, height, opacity, transform",
                                                            // NEW: give empty slots a black background
                                                            background: isEmpty ? "#000" : undefined,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                        }}
                                                        onMouseDown={(e) => {
                                                            if (!isEmpty) scheduleMouseDrag(pi, slotIdx, e);
                                                        }}
                                                        onMouseMove={(e) => {
                                                            if (mouseHoldTimerRef.current) {
                                                                lastTouchRef.current = { x: e.clientX, y: e.clientY };
                                                            }
                                                        }}
                                                        onMouseUp={cancelMouseDrag}
                                                        onMouseLeave={cancelMouseDrag}
                                                        onClick={(e) => handleSlotClick(pi, slotIdx, isEmpty, e)}
                                                        onTouchStart={(e) => {
                                                            if (!isEmpty) scheduleTouchDrag(pi, slotIdx, e);
                                                        }}
                                                        onTouchMove={(e) => {
                                                            if (!dragActiveRef.current) cancelTouchDrag();
                                                        }}
                                                        onTouchEnd={cancelTouchDrag}
                                                    >
                                                        {!!imgSrc && (
                                                            <img
                                                                src={imgSrc}
                                                                alt=""
                                                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                            />
                                                        )}

                                                        {/* NEW: Placeholder "+" button for empty slots */}
                                                        {isEmpty && (
                                                            <button
                                                                className="slot-add-btn"
                                                                title="Add photo"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUploadToSlot(pi, slotIdx);
                                                                }}
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    width: 48,
                                                                    height: 48,
                                                                    borderRadius: "50%",
                                                                    border: "none",
                                                                    background: "rgba(255,255,255,0.9)",
                                                                    cursor: "pointer",
                                                                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                                                                }}
                                                            >
                                                                <Add />
                                                            </button>
                                                        )}

                                                        {/* RESET BUTTON appears if cropped (hide when empty) */}
                                                        {!isEmpty && ps.edits?.[slotIdx]?.previewDataUrl && (
                                                            <button
                                                                className="slot-reset-btn"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    resetCropForSlot(pi, slotIdx);
                                                                }}
                                                                title="Revert to original"
                                                            >
                                                                Reset
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {textSlots.map((slotPosIndex, textIdx) => {
                                                const inlinePos = backgroundEnabled
                                                    ? (getSlotRect(slotPosIndex, true) || null)
                                                    : (noBgRects?.[pi]?.[slots.length + textIdx] || null);
                                                const content = ps.texts?.[textIdx] || "";
                                                const placeholder = textIdx === 0 ? "Add your story" : "Keep writing";
                                                const activateEditor = () => handleOpenTextEditor(pi, textIdx, placeholder);
                                                return (
                                                    <div
                                                        key={`text-${slotPosIndex}-${textIdx}`}
                                                        className={`text-slot slot${slotPosIndex + 1}`} data-text-index={textIdx}
                                                        ref={(el) => {
                                                            if (!slotRefs.current[pi]) slotRefs.current[pi] = [];
                                                            slotRefs.current[pi][slots.length + textIdx] = el || null;
                                                        }}
                                                        dir="ltr"
                                                        style={{
                                                            ...(inlinePos || {}),
                                                            position: "absolute",
                                                        }}
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-label={`Edit text ${textIdx + 1} on page ${pi + 1}`}
                                                        onClick={activateEditor}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault();
                                                                activateEditor();
                                                            }
                                                        }}
                                                    >
                                                        <TextEditor
                                                            readOnly
                                                            value={content}
                                                            baseStyle={textBoxBaseStyle}
                                                            placeholder={placeholder}
                                                        />
                                                    </div>
                                                );
                                            })}

                                            {isCoverPage && (
                                                <div
                                                    className="title-overlay"
                                                    dir="ltr"
                                                    style={{
                                                        fontFamily: textSettings.fontFamily,
                                                        color: textSettings.color,
                                                        textAlign: "center",
                                                        left: "12%",
                                                        width: "76%",
                                                        padding: 0,
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        pointerEvents: "none",
                                                        gap: "6px",
                                                        ...(titleOrientation === "bottom"
                                                            ? { bottom: "9%" }
                                                            : { top: "9%" }),
                                                    }}
                                                >
                                                    {title && (
                                                        <h1
                                                            style={{
                                                                margin: 0,
                                                                fontSize: titleFontSize,
                                                                lineHeight: titleLineHeight,
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            {title}
                                                        </h1>
                                                    )}
                                                    {subtitle && (
                                                        <h2
                                                            style={{
                                                                margin: 0,
                                                                opacity: 0.85,
                                                                fontSize: subtitleFontSize,
                                                                lineHeight: subtitleLineHeight,
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {subtitle}
                                                        </h2>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* hidden pages for PDF generation */}
            <Box style={{ position: "absolute", left: "-9999px", top: 0 }}>
                {pageSettings.map((ps, pi) => {
                    const isCoverPage = isCoverPageIndex(pi);
                    const slots = getSlotsForPageIndex(ps, pi);
                    const textSlots = getTextSlotsForPageIndex(ps, pi);
                    const exportTitleFontSize = textSettings?.fontSize || DEFAULT_TEXT_SETTINGS.fontSize;
                    const exportTitleLineHeight = computeLineHeight(exportTitleFontSize);
                    const exportSubtitleFontSize = scaleFontSize(exportTitleFontSize, 0.6, 14);
                    const exportSubtitleLineHeight = computeLineHeight(exportSubtitleFontSize);
                    const exportTextBoxFontSize = scaleFontSize(exportTitleFontSize, 0.65, 14);
                    return (
                        <Box key={pi}>
                            <Box
                                ref={(el) => (refs.current[pi] = el)}
                                className="photo-page"
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    maxWidth: "400px",
                                    paddingTop: `${paddingPercent}%`,
                                    ...(ps.theme.image
                                        ? {
                                            backgroundImage: `url(${ps.theme.image})`,
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                        }
                                        : { backgroundColor: ps.theme.color || "transparent" }),
                                    overflow: "hidden",
                                    borderRadius: "12px",
                                }}
                        >
                                {slots.map((slotPosIndex, slotIdx) => {
                                    // Export with original geometry (background visuals preserved)
                                    const inlinePos = isCoverPage
                                        ? coverImageStyle
                                        : getSlotRect(slotPosIndex, true); // inline for 0..9, otherwise CSS
                                    return (
                                        <Box
                                            key={`${slotPosIndex}-${slotIdx}`}
                                            className={`photo-slot slot${slotPosIndex + 1}`} data-slot-index={slotIdx}
                                            style={{
                                                position: "absolute",
                                                overflow: "hidden",
                                                borderRadius: isCoverPage ? "24px" : "4px",
                                                ...(inlinePos || {}),
                                            }}
                                        >
                                            <img
                                                src={getSlotSrc(ps, slotIdx)}
                                                alt=""
                                                crossOrigin="anonymous"
                                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                            />
                                        </Box>
                                    );
                                })}
                                {textSlots.map((slotPosIndex, textIdx) => {
                                    const inlinePos = getSlotRect(slotPosIndex, true);
                                    return (
                                        <div
                                            key={`text-${slotPosIndex}-${textIdx}`}
                                            className={`text-slot slot${slotPosIndex + 1}`} data-text-index={textIdx}
                                            style={{
                                                position: "absolute",
                                                fontFamily: textSettings.fontFamily,
                                                color: textSettings.color,
                                                fontSize: exportTextBoxFontSize,
                                                lineHeight: computeLineHeight(exportTextBoxFontSize),
                                                ...(inlinePos || {}),
                                            }}
                                            dangerouslySetInnerHTML={{ __html: ps.texts?.[textIdx] || "" }}
                                        />
                                    );
                                })}
                                {isCoverPage && (
                                    <Box
                                        className="title-overlay"
                                        style={{
                                            fontFamily: textSettings.fontFamily,
                                            color: textSettings.color,
                                            textAlign: "center",
                                            left: "12%",
                                            width: "76%",
                                            padding: 0,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            pointerEvents: "none",
                                            gap: "6px",
                                            ...(titleOrientation === "bottom"
                                                ? { bottom: "9%" }
                                                : { top: "9%" }),
                                        }}
                                    >
                                        {title && (
                                            <h1
                                                style={{
                                                    margin: 0,
                                                    fontSize: exportTitleFontSize,
                                                    lineHeight: exportTitleLineHeight,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {title}
                                            </h1>
                                        )}
                                        {subtitle && (
                                            <h2
                                                style={{
                                                    margin: 0,
                                                    opacity: 0.85,
                                                    fontSize: exportSubtitleFontSize,
                                                    lineHeight: exportSubtitleLineHeight,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {subtitle}
                                            </h2>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {saving && (
                <Layer position="center" responsive={false} modal>
                    <Box pad="medium">
                        <Text>Saving album...</Text>
                    </Box>
                </Layer>
            )}

            {/* drag preview overlay */}
            <div id="drag-preview" ref={previewRef}>
                <img ref={previewImgRef} alt="" />
            </div>

            {/* Modals */}
            {showTemplateModal && (
                <TemplateModal
                    // CHANGED: show ALL templates; we’ll create placeholders if needed
                    templates={pageTemplates}
                    onSelect={(id) => pickTemplate(templateModalPage, id)}
                    onClose={() => setShowTemplateModal(false)}
                />
            )}
            {showThemeModal && (
                <ThemeModal
                    pageIdx={themeModalPage}
                    onSelect={pickTheme}
                    onClose={() => setShowThemeModal(false)}
                    s3={s3}
                    sessionId={sessionId}
                    dynamicColors={dynamicPalette}
                    paletteLoading={dynamicPaletteLoading}
                    hasPaletteSources={hasDynamicPaletteSources}
                />
            )}
            {showTitleModal && (
                <TitleModal
                    title={title}
                    subtitle={subtitle}
                    onSave={({ title: t, subtitle: st }) => {
                        setTitle(t);
                        setSubtitle(st);
                        setShowTitleModal(false);
                    }}
                    onClose={() => setShowTitleModal(false)}
                />
            )}
            {showOrientationModal && (
                <Layer
                    position="center"
                    responsive={false}
                    onEsc={() => setShowOrientationModal(false)}
                    onClickOutside={() => setShowOrientationModal(false)}
                >
                    <Box pad="medium" gap="medium" width="medium">
                        <Heading level={3} margin="none">
                            Title Position
                        </Heading>
                        <RadioButtonGroup
                            name="title-orientation"
                            options={[
                                { label: "Top Center", value: "top" },
                                { label: "Bottom Center", value: "bottom" },
                            ]}
                            value={titleOrientation}
                            onChange={(event) => {
                                const next = event?.target?.value;
                                if (next === "top" || next === "bottom") {
                                    setTitleOrientation(next);
                                    setShowOrientationModal(false);
                                }
                            }}
                        />
                        <Box direction="row" justify="end" gap="small">
                            <Button label="Close" onClick={() => setShowOrientationModal(false)} />
                        </Box>
                    </Box>
                </Layer>
            )}

            <TextEditorModal
                open={Boolean(activeTextSlot)}
                value={activeTextValue}
                onChange={(html) => {
                    if (!activeTextSlot) return;
                    const slot = activeTextSlot;
                    setPageSettings((prev) => {
                        if (!slot) return prev;
                        const { pageIdx, textIdx } = slot;
                        const page = prev[pageIdx];
                        if (!page) return prev;
                        const next = [...prev];
                        const textsSource = Array.isArray(page.texts) ? page.texts : [];
                        const texts = [...textsSource];
                        while (texts.length <= textIdx) texts.push("");
                        texts[textIdx] = html;
                        next[pageIdx] = { ...page, texts };
                        return next;
                    });
                }}
                onClose={handleCloseTextEditor}
                textSettings={textSettings}
                onChangeTextSettings={setTextSettings}
                placeholder={activeTextSlot?.placeholder || "Write something..."}
                baseStyle={defaultTextBaseStyle}
            />

            <SettingsBar
                backgroundEnabled={backgroundEnabled}
                setBackgroundEnabled={setBackgroundEnabled}
                fileInputRef={fileInputRef}            // you already have this in your version
                onOpenThemeModal={() => openThemeModal(null)}
                onSave={handleSave}
                onEditTitle={() => setShowTitleModal(true)}
                onOpenTitleLayout={() => setShowOrientationModal(true)}
                onAddImages={async (incoming) => {
                    const files = Array.isArray(incoming)
                        ? incoming.filter(Boolean)
                        : incoming
                            ? [incoming]
                            : [];
                    if (!files.length) return;

                    const uploaded = [];
                    setUploading(true);
                    try {
                        for (const file of files) {
                            const key = `${sessionId}/${Date.now()}_${file.name}`;
                            setUploadProgress(0);
                            const managed = s3.upload({
                                Key: key,
                                Body: file,
                                ContentType: file.type,
                            });
                            managed.on("httpUploadProgress", (evt) => {
                                if (evt.total) {
                                    setUploadProgress(
                                        Math.round((evt.loaded / evt.total) * 100)
                                    );
                                }
                            });
                            try {
                                await managed.promise();
                                uploaded.push(getResizedUrl(key, 1200));
                            } catch (err) {
                                console.error("S3 upload error", err);
                            }
                        }
                    } finally {
                        setUploading(false);
                        setUploadProgress(0);
                    }

                    if (!uploaded.length) return;

                    // Inform parent so global image list stays in sync
                    if (typeof onAddImagesProp === "function") {
                        onAddImagesProp(uploaded);
                    }

                    // Helper to resolve templates
                    const getTemplate = (id) => findTemplateById(id);
                    const defaultTemplate =
                        findTemplateById(1) ||
                        findTemplateById(3) ||
                        pageTemplates.find(
                            (t) => t.id !== COVER_TEMPLATE.id && (t.slots?.length ?? 0) > 0
                        ) ||
                        null;

                    const target = pendingUploadTarget;
                    let didUpdate = false;

                    setPageSettings((prev) => {
                        let remaining = uploaded.filter(Boolean);
                        if (!remaining.length) return prev;

                        const clonePage = (page) => ({
                            ...page,
                            assignedImages: Array.isArray(page.assignedImages)
                                ? [...page.assignedImages]
                                : [],
                            edits: Array.isArray(page.edits) ? [...page.edits] : [],
                            texts: Array.isArray(page.texts) ? [...page.texts] : [],
                        });

                        const next = prev.map(clonePage);

                        // Avoid inserting duplicates that already exist
                        const existingUrls = new Set(
                            next.flatMap((p) =>
                                Array.isArray(p.assignedImages) ? p.assignedImages : []
                            ).filter(Boolean)
                        );
                        remaining = remaining.filter((url) => !existingUrls.has(url));
                        if (!remaining.length) return prev;

                        const ensureSlotCapacity = (page, slotCount) => {
                            if (slotCount <= 0) return;
                            if (page.assignedImages.length < slotCount) {
                                while (page.assignedImages.length < slotCount) {
                                    page.assignedImages.push(null);
                                }
                            }
                        };

                        // If a specific slot triggered the upload, fill it first
                        if (target) {
                            const { pageIdx, slotIdx } = target;
                            const page = next[pageIdx];
                            if (page) {
                                const slotCount = getSlotCountForPageIndex(page, pageIdx);
                                if (slotCount > 0 && slotIdx < slotCount) {
                                    ensureSlotCapacity(page, slotCount);
                                    if (remaining.length) {
                                        page.assignedImages[slotIdx] = remaining.shift();
                                        page.edits = ensureEditsArray(
                                            page,
                                            Math.max(page.assignedImages.length, slotCount)
                                        );
                                        didUpdate = true;
                                    }
                                }
                            }
                        }

                        const fillPage = (page, idx) => {
                            const slotCount = getSlotCountForPageIndex(page, idx);
                            if (slotCount <= 0) return;
                            ensureSlotCapacity(page, slotCount);
                            let changed = false;
                            for (let i = 0; i < slotCount && remaining.length; i += 1) {
                                if (!page.assignedImages[i]) {
                                    page.assignedImages[i] = remaining.shift();
                                    changed = true;
                                }
                            }
                            if (changed) {
                                page.edits = ensureEditsArray(
                                    page,
                                    Math.max(page.assignedImages.length, slotCount)
                                );
                                didUpdate = true;
                            }
                        };

                        next.forEach(fillPage);

                        const pickTemplateForAppend = () => {
                            for (let i = next.length - 1; i >= 0; i -= 1) {
                                if (i === 0) continue; // cover stays unique
                                const tmpl = getTemplate(next[i].templateId);
                                if (
                                    tmpl &&
                                    tmpl.id !== COVER_TEMPLATE.id &&
                                    (tmpl.slots?.length ?? 0) > 0
                                ) {
                                    return tmpl;
                                }
                            }
                            if (defaultTemplate && defaultTemplate.id !== COVER_TEMPLATE.id) {
                                return defaultTemplate;
                            }
                            return pageTemplates.find(
                                (t) => t.id !== COVER_TEMPLATE.id && (t.slots?.length ?? 0) > 0
                            ) || null;
                        };

                        while (remaining.length) {
                            const tmpl = pickTemplateForAppend();
                            if (!tmpl || tmpl.id === COVER_TEMPLATE.id) break;
                            const slotCount = Math.max(1, tmpl.slots?.length ?? 1);
                            const assigned = [];
                            while (assigned.length < slotCount && remaining.length) {
                                assigned.push(remaining.shift());
                            }
                            if (!assigned.length) break;
                            while (assigned.length < slotCount) assigned.push(null);
                            next.push({
                                templateId: tmpl.id,
                                theme: { mode: "dynamic", color: null, image: null },
                                assignedImages: assigned,
                                edits: new Array(slotCount).fill(null),
                                texts: tmpl.textSlots ? new Array(tmpl.textSlots.length).fill("") : [],
                            });
                            didUpdate = true;
                        }

                        if (!didUpdate) return prev;
                        return next;
                    });

                    if (target) {
                        setPendingUploadTarget(null);
                    }
                    if (didUpdate) {
                        setImagesWarm(false);
                    }
                }}
            />


            {/* CROPPER MODAL */}
            {cropOpen && (
                <Layer
                    onEsc={closeCropper}
                    onClickOutside={closeCropper}
                    modal
                    responsive={false}
                    position="center"
                    className="editModal image-editor-layer"
                >
                    <div className="image-editor-card">
                        <div className="image-editor-header">
                            <h2>Edit Photo</h2>
                            <button
                                type="button"
                                className="image-editor-icon-button"
                                onClick={closeCropper}
                                aria-label="Close editor"
                            >
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="image-editor-body">
                            <div className="image-editor-preview">
                                {cropSource ? (
                                    <div
                                        className="image-editor-cropper"
                                        ref={cropperContainerRef}
                                        style={cropperStyle}
                                    >
                                        <Cropper
                                            image={cropSource}
                                            crop={cropState.crop}
                                            zoom={normalizedZoom}
                                            rotation={cropState.rotation}
                                            aspect={cropTarget.aspect}
                                            onCropChange={(crop) => setCropState((p) => ({ ...p, crop }))}
                                            onZoomChange={(zoom) => {
                                                const clampedZoom = Math.min(
                                                    Math.max(zoom, MIN_CROPPER_ZOOM),
                                                    MAX_CROPPER_ZOOM
                                                );
                                                setCropState((p) => ({ ...p, zoom: clampedZoom }));
                                                setCroppedAreaPixels(null);
                                            }}
                                            onRotationChange={(rotation) => {
                                                setCropState((p) => ({ ...p, rotation }));
                                                setCroppedAreaPixels(null);
                                            }}
                                            onCropComplete={onCropComplete}
                                            restrictPosition
                                            showGrid
                                        />
                                    </div>
                                ) : (
                                    <div className="image-editor-empty">
                                        <p>No image selected.</p>
                                        <button
                                            type="button"
                                            className="image-editor-link"
                                            onClick={handleReplaceImage}
                                        >
                                            Select an image
                                        </button>
                                    </div>
                                )}
                            </div>
                            <aside className="image-editor-sidebar">
                                <div className="image-editor-quality">
                                    <div className="image-editor-quality-icon" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                            <path
                                                d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2m0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8"
                                                fill="#047857"
                                            />
                                            <path
                                                d="m16.707 9.293-4.95 4.95-2.464-2.465a1 1 0 0 0-1.414 1.414l3.172 3.172a1 1 0 0 0 1.414 0l5.657-5.657a1 1 0 1 0-1.414-1.414"
                                                fill="#047857"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="image-editor-quality-title">Print Quality</p>
                                        <p className="image-editor-quality-score">{printQualityLabel}</p>
                                    </div>
                                </div>
                                <div className="image-editor-tips">
                                    <div className="image-editor-tips-icon" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                                            <path
                                                d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2m.75 15a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 1.5 0Zm2.4-6.6-.72.744a1.5 1.5 0 0 0-.43 1.044V12a.75.75 0 0 1-1.5 0v-.312a2.99 2.99 0 0 1 .86-2.088l.84-.864a1.5 1.5 0 0 0-1.07-2.556h-.48a1.5 1.5 0 0 0-1.5 1.5.75.75 0 0 1-1.5 0 3 3 0 0 1 3-3h.48a3 3 0 0 1 2.1 5.124Z"
                                                fill="#1d4ed8"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="image-editor-tips-title">Quick Tips</p>
                                        <ul className="image-editor-tips-list">
                                            <li>Drag the image to reposition.</li>
                                            <li>Use the slider to zoom in or out.</li>
                                            <li>Use the buttons for other actions.</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="image-editor-slider">
                                    <div className="image-editor-slider-label">
                                        <label htmlFor={zoomSliderId}>Zoom</label>
                                        <span>{`${zoomPercent}%`}</span>
                                    </div>
                                    <input
                                        id={zoomSliderId}
                                        type="range"
                                        min={MIN_CROPPER_ZOOM}
                                        max={MAX_CROPPER_ZOOM}
                                        step={CROPPER_ZOOM_STEP}
                                        value={normalizedZoom}
                                        onChange={handleZoomSliderChange}
                                        disabled={isCropActionsDisabled}
                                    />
                                </div>
                                <div className="image-editor-actions">
                                    <button
                                        type="button"
                                        className="image-editor-action"
                                        onClick={handleFillClick}
                                        disabled={isCropActionsDisabled}
                                    >
                                        <span className="image-editor-action-icon" aria-hidden="true">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                                <path
                                                    fill="#374151"
                                                    fillRule="evenodd"
                                                    d="M22 3.6A1.6 1.6 0 0 0 20.4 2h-3.8a.6.6 0 0 0-.6.6v.8a.6.6 0 0 0 .6.6h1.971l-4.647 4.647a.6.6 0 0 0 0 .848l.566.566a.6.6 0 0 0 .848 0L20 5.4v2a.6.6 0 0 0 .6.6h.8a.6.6 0 0 0 .6-.6zM4 5.414V7.4a.6.6 0 0 1-.6.6h-.8a.6.6 0 0 1-.6-.6V3.6A1.6 1.6 0 0 1 3.6 2h3.8a.6.6 0 0 1 .6.6v.8a.6.6 0 0 1-.6.6H5.414l4.647 4.647a.6.6 0 0 1 0 .848l-.566.566a.6.6 0 0 1-.848 0zM20.4 22a1.6 1.6 0 0 0 1.6-1.6v-3.8a.6.6 0 0 0-.6-.6h-.8a.6.6 0 0 0-.6.6v1.986l-4.661-4.662a.6.6 0 0 0-.85 0l-.565.566a.6.6 0 0 0 0 .848L18.586 20H16.6a.6.6 0 0 0-.6.6v.8a.6.6 0 0 0 .6.6zM8.647 13.924a.6.6 0 0 1 .848 0l.566.566a.6.6 0 0 1 0 .848L5.399 20H7.4a.6.6 0 0 1 .6.6v.8a.6.6 0 0 0-.6.6H3.6A1.6 1.6 0 0 1 2 20.4v-3.8a.6.6 0 0 1 .6-.6h.8a.6.6 0 0 1 .6.6v1.971z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                        <span className="image-editor-action-label">Fill</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="image-editor-action"
                                        onClick={handleRotateClick}
                                        disabled={isCropActionsDisabled}
                                    >
                                        <span className="image-editor-action-icon" aria-hidden="true">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                                <path
                                                    fill="#374151"
                                                    fillRule="evenodd"
                                                    d="M8.4 14a1.6 1.6 0 0 1 1.6 1.6v3.8a.6.6 0 0 1-.6.6h-.8a.6.6 0 0 1-.6-.6v-2L3.588 21.81a.6.6 0 0 1-.848 0l-.566-.566a.6.6 0 0 1 0-.848L6.571 16H4.6a.6.6 0 0 1-.6-.6v-.8a.6.6 0 0 1 .6-.6zm11 0a.6.6 0 0 1 .6.6v.8a.6.6 0 0 1-.6.6h-1.983l4.397 4.397a.6.6 0 0 1 0 .848l-.566.566a.6.6 0 0 1-.848 0l-4.4-4.4V19.4a.6.6 0 0 1-.6.6h-.8a.6.6 0 0 1-.6-.6v-3.8a1.6 1.6 0 0 1 1.6-1.6zM3.588 2.174 8 6.586V4.6a.6.6 0 0 1 .6-.6h.8a.6.6 0 0 1 .6.6v3.8A1.6 1.6 0 0 1 8.4 10H4.6a.6.6 0 0 1-.6-.6v-.8a.6.6 0 0 1 .6-.6h1.986L2.174 3.588a.6.6 0 0 1 0-.848l.566-.566a.6.6 0 0 1 .848 0m17.66 0 .566.566a.6.6 0 0 1 0 .848L17.4 8H19.4a.6.6 0 0 1 .6.6v.8a.6.6 0 0 1-.6.6h-3.8A1.6 1.6 0 0 1 14 8.4V4.6a.6.6 0 0 1 .6-.6h.8a.6.6 0 0 1 .6.6v1.974l4.4-4.4a.6.6 0 0 1 .848 0"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                        <span className="image-editor-action-label">Rotate</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="image-editor-action"
                                        onClick={handleReplaceImage}
                                    >
                                        <span className="image-editor-action-icon" aria-hidden="true">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                                <path
                                                    fill="#374151"
                                                    fillRule="evenodd"
                                                    d="M1.6 5.003C1 6.18 1 7.72 1 10.8v2.4c0 3.08 0 4.62.6 5.797A5.5 5.5 0 0 0 4.002 21.4C5.18 22 6.72 22 9.8 22h4.4c3.08 0 4.62 0 5.797-.6a5.5 5.5 0 0 0 2.404-2.403C23 17.82 23 16.28 23 13.2v-2.4c0-3.08 0-4.62-.6-5.797a5.5 5.5 0 0 0-2.403-2.404C18.82 2 17.28 2 14.2 2H9.8c-3.08 0-4.62 0-5.797.6a5.5 5.5 0 0 0-2.404 2.403m1.781.908C3 6.66 3 7.64 3 9.6v4.8c0 1.882 0 2.86.337 3.598l5.538-5.537a1.6 1.6 0 0 1 2.262 0l.727.758c.023.024-.534 1.263-.534 1.263l.922-.906 3.379-3.378a1.6 1.6 0 0 1 2.262 0L21 13.305V9.6c0-1.96 0-2.94-.381-3.689a3.5 3.5 0 0 0-1.53-1.53C18.34 4 17.36 4 15.4 4H8.6c-1.96 0-2.94 0-3.689.381a3.5 3.5 0 0 0-1.53 1.53m1.53 13.708a4 4 0 0 1-.235-.132l5.33-5.33 1.292 1.293.22.22-1 2.483 1.734-1.749 4.51-4.51 4.222 4.223c-.03.895-.116 1.483-.366 1.972a3.5 3.5 0 0 1-1.529 1.53C18.34 20 17.36 20 15.4 20H8.6c-1.96 0-2.94 0-3.689-.381M9 8.5C9 7.673 8.327 7 7.5 7S6 7.673 6 8.5 6.673 10 7.5 10 9 9.327 9 8.5"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                        <span className="image-editor-action-label">Replace</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="image-editor-action"
                                        onClick={handleRemoveImage}
                                        disabled={isCropActionsDisabled}
                                    >
                                        <span className="image-editor-action-icon" aria-hidden="true">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                                <path
                                                    fill="#374151"
                                                    fillRule="evenodd"
                                                    d="M9.4 2a.4.4 0 0 0-.4.4v.5a.1.1 0 0 1-.1.1H5.3A1.3 1.3 0 0 0 4 4.3v.3c0 .22.18.4.4.4h.599v12.5a3.5 3.5 0 0 0 3.5 3.5h7a3.5 3.5 0 0 0 3.5-3.5V5h.601a.4.4 0 0 0 .4-.4v-.3A1.3 1.3 0 0 0 18.7 3h-3.6a.1.1 0 0 1-.1-.1v-.5a.4.4 0 0 0-.4-.4zM6.999 17.5V5H17v12.5a1.5 1.5 0 0 1-1.5 1.5H8.499a1.5 1.5 0 0 1-1.5-1.5M9 7.64c0-.224 0-.336.044-.422a.4.4 0 0 1 .174-.174C9.304 7 9.416 7 9.64 7h.72c.224 0 .336 0 .422.044a.4.4 0 0 1 .174.174c.044.086.044.198.044.422v8.72c0 .224 0 .336-.044.422a.4.4 0 0 1-.174.174c-.086.044-.198.044-.422.044h-.72c-.224 0-.336 0-.422-.044a.4.4 0 0 1-.174-.174C9 16.696 9 16.584 9 16.36zm4.044-.422C13 7.304 13 7.416 13 7.64v8.72c0 .224 0 .336.044.422a.4.4 0 0 0 .174.174c.086.044.198.044.422.044h.72c.224 0 .336 0 .422-.044a.4.4 0 0 0 .174-.174c.044-.086.044-.198.044-.422V7.64c0-.224 0-.336-.044-.422a.4.4 0 0 0-.174-.174"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                        <span className="image-editor-action-label">Remove</span>
                                    </button>
                                </div>
                            </aside>
                        </div>
                        <div className="image-editor-footer">
                            <button
                                type="button"
                                className="image-editor-button image-editor-button--secondary"
                                onClick={closeCropper}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="image-editor-button image-editor-button--primary"
                                onClick={saveCrop}
                                disabled={!croppedAreaPixels}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </Layer>
            )}
            {uploading && (
                <Layer plain>
                    <Box
                        fill
                        align="center"
                        justify="center"
                        background={{ color: "white", opacity: "strong" }}
                    >
                        <Spinner />
                        <Box width="medium" pad={{ horizontal: "medium", top: "small" }}>
                            <Meter
                                values={[{ value: uploadProgress, color: "accent" }]}
                                max={100}
                                thickness="small"
                            />
                        </Box>
                        <Text margin={{ top: "small" }}>{uploadProgress}%</Text>
                    </Box>
                </Layer>
            )}
        </>
    );
}

















