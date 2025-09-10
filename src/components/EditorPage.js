// src/components/EditorPage.js
import "./EditorPage.css";
import React, { useState, useEffect, useRef } from "react";
import ColorThief from "color-thief-browser";
import { Box, Button, Layer, Text } from "grommet";
import { jsPDF } from "jspdf";
import { toJpeg } from "html-to-image";
import { Template as TemplateIcon, Brush, Edit, Add } from "grommet-icons"; // NEW: Add
import Cropper from "react-easy-crop";
import TemplateModal from "./TemplateModal";
import ThemeModal from "./ThemeModal";
import SettingsBar from "./SettingsBar";
import { pageTemplates } from "../templates/pageTemplates";
import TitleModal from "./TitleModal";

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

async function getCroppedDataUrl(imageSrc, pixelCrop, rotation = 0, quality = 0.92) {
    const image = await createImageEl(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not available");

    const safe = Math.max(image.width, image.height) * 2;
    canvas.width = safe;
    canvas.height = safe;

    ctx.translate(safe / 2, safe / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safe / 2, -safe / 2);
    ctx.drawImage(image, (safe - image.width) / 2, (safe - image.height) / 2);

    const data = ctx.getImageData(0, 0, safe, safe);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(
        data,
        Math.round(-pixelCrop.x + (image.width - safe) / 2),
        Math.round(-pixelCrop.y + (image.height - safe) / 2)
    );

    return canvas.toDataURL("image/jpeg", quality);
}

// ensure a page's edits array exists and has at least n entries
function ensureEditsArray(ps, n) {
    const arr = ps.edits && Array.isArray(ps.edits) ? [...ps.edits] : [];
    while (arr.length < n) arr.push(null);
    return arr;
}

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

    const [pageSettings, setPageSettings] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateModalPage, setTemplateModalPage] = useState(null);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [themeModalPage, setThemeModalPage] = useState(null);
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [backgroundEnabled, setBackgroundEnabled] = useState(true);
    const [imagesWarm, setImagesWarm] = useState(false);
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
    // reference to hidden file input in SettingsBar so we can trigger it from placeholders
    const fileInputRef = useRef(null);

    // page containers (for PDF)
    const refs = useRef([]);

    // refs for each slot to compute DOM aspect dynamically
    const slotRefs = useRef([]); // slotRefs.current[pageIdx][slotIdx] = element

    const [saving, setSaving] = useState(false);
    const paddingPercent = albumSize ? (albumSize.height / albumSize.width) * 100 : 75;

    // ---------------- Cropper state ----------------
    const [cropOpen, setCropOpen] = useState(false);
    const [cropTarget, setCropTarget] = useState({ pageIdx: null, slotIdx: null, aspect: 1 });
    const [cropState, setCropState] = useState({ crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 });
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const getSlotSrc = (ps, slotIdx) => {
        const edit = ps.edits?.[slotIdx];
        return edit?.previewDataUrl || ps.assignedImages[slotIdx];
    };

    // ----------------- RESTORE / INIT -----------------
    useEffect(() => {
        const stored = localStorage.getItem("pageSettings");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    const normalized = parsed.map((ps) => ({
                        ...ps,
                        edits: Array.isArray(ps.edits) ? ps.edits : [],
                    }));
                    setPageSettings(normalized);
                    setImagesWarm(false);
                }
            } catch (err) {
                console.error(err);
            }
        }
    }, []);

    // initialize per-page assignments whenever `images` changes
    useEffect(() => {
        if (pageSettings.length) return;

        const remaining = images.slice();
        const pages = [];

        const pickTemplateId = (i, candidates) => {
            const byId = (id) => candidates.find((t) => t.id === id)?.id;
            if (i === 0) return byId(3) ?? candidates[0].id; // prefer title/full-bleed
            if (i < 2) return byId(1) ?? candidates[0].id;   // prefer 2-up
            return candidates[Math.floor(Math.random() * candidates.length)].id;
        };

        let i = 0;
        while (remaining.length > 0) {
            const candidates = pageTemplates
                .map((t) => ({ ...t, _slots: Math.max(1, t.slots?.length ?? 1) }))
                .filter((t) => t._slots <= remaining.length);

            if (!candidates.length) break;

            const templateId = pickTemplateId(i, candidates);
            const tmpl = candidates.find((t) => t.id === templateId) || candidates[0];
            const slotsCount = Math.max(1, tmpl.slots?.length ?? 1);
            const assigned = remaining.splice(0, slotsCount);

            pages.push({
                templateId: tmpl.id,
                theme: { mode: "dynamic", color: null },
                assignedImages: assigned,
                edits: new Array(slotsCount).fill(null),
            });
            i += 1;
        }

        setPageSettings(pages);
        setImagesWarm(false);
    }, [images, pageSettings.length]);

    // persist to localStorage & DB
    useEffect(() => {
        localStorage.setItem("pageSettings", JSON.stringify(pageSettings));
        if (user && sessionId) {
            fetch("/.netlify/functions/session", {
                method: "POST",
                body: JSON.stringify({
                    userId: user.id,
                    sessionId,
                    settings: { albumSize, identityId, pageSettings, user, title, subtitle },
                }),
            }).catch(console.error);
        }
    }, [pageSettings, albumSize, identityId, user, sessionId, title, subtitle]);

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
                        next[idx] = { ...next[idx], theme: { mode: "dynamic", color: rgb } };
                        return next;
                    });
                };
            }
        });
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

    const startDrag = (pageIdx, slotIdx, e) => {
        e.stopPropagation();

        // Check if there's actually an image to drag
        const url = pageSettings[pageIdx]?.assignedImages?.[slotIdx];
        if (!url) return;

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

    // ---------------- TEMPLATE & THEME ----------------
    const openTemplateModal = (pi) => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setTemplateModalPage(pi);
        setShowTemplateModal(true);
    };

    // CHANGED: allow larger templates and fill extras with null placeholders
    const pickTemplate = (pi, tid) => {
        setPageSettings((prev) => {
            const next = prev.map((p) => ({ ...p, assignedImages: [...(p.assignedImages || [])] }));
            const page = next[pi];
            const requested = pageTemplates.find((t) => t.id === tid);
            const newSlots = Math.max(1, requested?.slots?.length ?? 1);

            page.templateId = tid;

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

    const pickTheme = (pi, { mode, color }) => {
        setPageSettings((prev) =>
            prev.map((s, i) => {
                if (pi === null || pi === undefined || pi === -1 || i === pi) {
                    return { ...s, theme: { mode, color: mode === "dynamic" ? null : color } };
                }
                return s;
            })
        );
        setShowThemeModal(false);
    };

    // ---------------- PDF SAVE ----------------
    const handleSave = async () => {
        if (!albumSize) return;
        setSaving(true);
        const { width, height } = albumSize;
        const orientation = width >= height ? "landscape" : "portrait";
        const pdf = new jsPDF({ orientation, unit: "cm", format: [width, height] });
        for (let i = 0; i < pageSettings.length; i++) {
            const node = refs.current[i];
            if (!node) continue;
            // eslint-disable-next-line no-await-in-loop
            const dataUrl = await toJpeg(node, { quality: 0.95, cacheBust: true, skipFonts: true });
            if (i > 0) pdf.addPage([width, height], orientation);
            pdf.addImage(dataUrl, "JPEG", 0, 0, width, height);
        }

        const blob = pdf.output("blob");
        const key = `${sessionId}/album.pdf`;
        try {
            await s3.upload({ Key: key, Body: blob, ContentType: "application/pdf" }).promise();
        } finally {
            setSaving(false);
        }
    };

    // ---------------- OPEN/CLOSE CROP MODAL ----------------
    const openCropper = (pi, slotIdx) => {
        const ps = pageSettings[pi];
        if (!ps?.assignedImages?.[slotIdx]) return;

        // Aspect from the REAL DOM slot (works for any slot index)
        let aspect = 1;
        const el = slotRefs.current?.[pi]?.[slotIdx];
        if (el) {
            const r = el.getBoundingClientRect();
            if (r.width && r.height) aspect = r.width / r.height;
        }

        const prev = ps.edits?.[slotIdx]?.params;
        setCropState(
            prev ? { crop: prev.crop, zoom: prev.zoom, rotation: prev.rotation || 0 } : { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 }
        );
        setCroppedAreaPixels(prev?.croppedAreaPixels ?? null);
        setCropTarget({ pageIdx: pi, slotIdx, aspect });
        setCropOpen(true);
    };

    const closeCropper = () => {
        setCropOpen(false);
        setCropTarget({ pageIdx: null, slotIdx: null, aspect: 1 });
        setCroppedAreaPixels(null);
    };

    const onCropComplete = (_, areaPixels) => setCroppedAreaPixels(areaPixels);

    const saveCrop = async () => {
        const { pageIdx, slotIdx } = cropTarget;
        if (pageIdx == null || slotIdx == null) return;
        const ps = pageSettings[pageIdx];
        const originalSrc = ps.assignedImages[slotIdx];
        if (!originalSrc || !croppedAreaPixels) return;

        const dataUrl = await getCroppedDataUrl(originalSrc, croppedAreaPixels, cropState.rotation);

        setPageSettings((prev) => {
            const next = prev.map((p) => ({ ...p }));
            const edits = ensureEditsArray(next[pageIdx], next[pageIdx].assignedImages.length);
            edits[slotIdx] = {
                originalSrc,
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

    // ---------------- RENDER ----------------
    return (
        <>
            {/* SKELETON */}
            {!imagesWarm ? (
                <div className="editor-page">
                    <div className="page-container">
                        <div className="container">
                            {pageSettings.map((ps, pi) => {
                                const tmpl = pageTemplates.find((t) => t.id === ps.templateId);
                                return (
                                    <div key={pi} className="page-wrapper skeleton-page-wrapper">
                                        <Box direction="row" wrap gap="small" pad="small">
                                            {tmpl?.slots?.map((_, slotIdx) => (
                                                <div key={slotIdx} className="skeleton-photo-slot" />
                                            ))}
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
                        <div className="container">
                            {pageSettings.map((ps, pi) => {
                                const tmpl = pageTemplates.find((t) => t.id === ps.templateId);
                                if (!tmpl) return null;
                                const bgColor = ps.theme.color || "transparent";

                                return (
                                    <div key={pi} className="page-wrapper" style={{ backgroundColor: bgColor }}>
                                        <Box className="toolbar" direction="row" gap="small" align="center">
                                            {pi !== 0 && (
                                                <Button
                                                    icon={<TemplateIcon />}
                                                    color="black"
                                                    className="btn-ico"
                                                    onClick={() => openTemplateModal(pi)}
                                                />
                                            )}
                                            <Button icon={<Brush />} color="black" className="btn-ico" onClick={() => openThemeModal(pi)} />
                                        </Box>

                                        <div className={`photo-page ${!backgroundEnabled ? "zoomed" : ""}`}>
                                            {tmpl?.slots?.map((slotPosIndex, slotIdx) => {
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
                                                            borderRadius: "4px",
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
                                                            if (!isEmpty) startDrag(pi, slotIdx, e);
                                                        }}
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

                                                        {/* EDIT BUTTON (hide when empty) */}
                                                        {!isEmpty && (
                                                            <button
                                                                className="slot-edit-btn"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openCropper(pi, slotIdx);
                                                                }}
                                                                title="Edit crop"
                                                            >
                                                                <Edit size="small" />
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

                                            {pi === 0 && (
                                                <div className="title-overlay">
                                                    {title && <h1>{title}</h1>}
                                                    {subtitle && <h2>{subtitle}</h2>}
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
                    const tmpl = pageTemplates.find((t) => t.id === ps.templateId);
                    if (!tmpl) return null;
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
                                    backgroundColor: ps.theme.color || "transparent",
                                    overflow: "hidden",
                                    borderRadius: "12px",
                                }}
                            >
                                {tmpl.slots.map((slotPosIndex, slotIdx) => {
                                    // Export with original geometry (background visuals preserved)
                                    const inlinePos = getSlotRect(slotPosIndex, true); // inline for 0..9, otherwise CSS
                                    return (
                                        <Box
                                            key={`${slotPosIndex}-${slotIdx}`}
                                            className={`photo-slot slot${slotPosIndex + 1}`}
                                            style={{
                                                position: "absolute",
                                                overflow: "hidden",
                                                borderRadius: "4px",
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
                                {pi === 0 && (
                                    <Box className="title-overlay">
                                        {title && <h1>{title}</h1>}
                                        {subtitle && <h2>{subtitle}</h2>}
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
                <ThemeModal pageIdx={themeModalPage} onSelect={pickTheme} onClose={() => setShowThemeModal(false)} />
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

            <SettingsBar
                backgroundEnabled={backgroundEnabled}
                setBackgroundEnabled={setBackgroundEnabled}
                fileInputRef={fileInputRef}
                onAddImages={(incoming) => {
                    // Coerce to a safe array *always*
                    const urls = Array.isArray(incoming)
                        ? incoming.filter(Boolean)
                        : incoming
                        ? [incoming]
                        : [];

                    if (!urls.length) {
                        // Ignore calls without URLs (e.g. placeholder click just opened the dialog)
                        return;
                    }

                    // Inform parent so global image list stays in sync
                    if (typeof onAddImagesProp === "function") {
                        onAddImagesProp(urls);
                    }

                    // If a specific slot triggered the upload, defer pageSettings
                    // mutation to the pendingUploadTarget effect. Otherwise append
                    // new images to the first page (creating it if needed).
                    if (pendingUploadTarget) return;

                    setPageSettings((prev) => {
                        const next = [...prev];
                        // Append to first page or create the first page
                        if (next.length === 0) {
                            next.push({
                                templateId: 3,
                                theme: { mode: "dynamic", color: null },
                                assignedImages: [...urls],
                                edits: new Array(urls.length).fill(null),
                            });
                        } else {
                            const existing = new Set(
                                Array.isArray(next[0].assignedImages)
                                    ? next[0].assignedImages
                                    : []
                            );
                            const unique = urls.filter((u) => !existing.has(u));
                            next[0].assignedImages = [
                                ...(Array.isArray(next[0].assignedImages)
                                    ? next[0].assignedImages
                                    : []),
                                ...unique,
                            ];
                            next[0].edits = ensureEditsArray(
                                next[0],
                                next[0].assignedImages.length
                            );
                        }
                        return next;
                    });
                }}
                onOpenThemeModal={() => openThemeModal(null)}
                onSave={handleSave}
                onEditTitle={() => setShowTitleModal(true)}
            />


            {/* CROPPER MODAL */}
            {cropOpen && (
                <Layer onEsc={closeCropper} onClickOutside={closeCropper} modal responsive={false} position="center">
                    <Box width="large" height="medium" overflow="hidden">
                        <Box pad="small" border={{ side: "bottom" }} direction="row" justify="between" align="center">
                            <Text weight="bold">Adjust photo</Text>
                            <Button label="Close" onClick={closeCropper} />
                        </Box>
                        <Box background="black" style={{ position: "relative", flex: 1, height: "60vh" }}>
                            {(() => {
                                const { pageIdx, slotIdx } = cropTarget;
                                const src = pageIdx != null && slotIdx != null ? pageSettings[pageIdx]?.assignedImages?.[slotIdx] : null;
                                if (!src) return null;
                                return (
                                    <Cropper
                                        image={src}
                                        crop={cropState.crop}
                                        zoom={cropState.zoom}
                                        rotation={cropState.rotation}
                                        aspect={cropTarget.aspect}
                                        onCropChange={(crop) => setCropState((p) => ({ ...p, crop }))}
                                        onZoomChange={(zoom) => setCropState((p) => ({ ...p, zoom }))}
                                        onRotationChange={(rotation) => setCropState((p) => ({ ...p, rotation }))}
                                        onCropComplete={onCropComplete}
                                        restrictPosition
                                        showGrid
                                    />
                                );
                            })()}
                        </Box>
                        <Box pad="small" gap="small" direction="row" align="center" border={{ side: "top" }}>
                            <Box width="medium">
                                <Text size="small">Zoom ({cropState.zoom.toFixed(2)}×)</Text>
                                <input
                                    type="range"
                                    min={1}
                                    max={4}
                                    step={0.01}
                                    value={cropState.zoom}
                                    onChange={(e) => setCropState((p) => ({ ...p, zoom: Number(e.target.value) }))}
                                    style={{ width: "100%" }}
                                />
                            </Box>
                            <Box width="medium">
                                <Text size="small">Rotation ({Math.round(cropState.rotation)}°)</Text>
                                <input
                                    type="range"
                                    min={-180}
                                    max={180}
                                    step={1}
                                    value={cropState.rotation}
                                    onChange={(e) => setCropState((p) => ({ ...p, rotation: Number(e.target.value) }))}
                                    style={{ width: "100%" }}
                                />
                            </Box>
                            <Box direction="row" gap="small" margin={{ left: "auto" }}>
                                <Button
                                    label="Reset"
                                    onClick={() => {
                                        setCropState({ crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 });
                                        setCroppedAreaPixels(null);
                                    }}
                                />
                                <Button primary label="Save crop" onClick={saveCrop} disabled={!croppedAreaPixels} />
                            </Box>
                        </Box>
                    </Box>
                </Layer>
            )}
        </>
    );
}