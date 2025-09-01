// src/components/EditorPage.js (with non‑destructive per‑slot Image Cropper)
import "./EditorPage.css";
import React, { useState, useEffect, useRef } from "react";
import ColorThief from "color-thief-browser";
import { Box, Button, Layer, Text } from "grommet";
import { jsPDF } from "jspdf";
import { toJpeg } from "html-to-image";
import { Template as TemplateIcon, Brush, Edit } from "grommet-icons";
import Cropper from "react-easy-crop";
import TemplateModal from "./TemplateModal";
import ThemeModal from "./ThemeModal";
import SettingsBar from "./SettingsBar";
import { pageTemplates } from "../templates/pageTemplates";
import TitleModal from "./TitleModal";

// --------- EXISTING LAYOUT CONSTANTS (unchanged) ---------
const slotMargin = 5;
const gap = 5;
const halfWidth = (100 - 2 * slotMargin - gap) / 2;
const halfHeight = halfWidth;
const slotPositions = [
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${100 - 2 * slotMargin}%` },
    { top: `${slotMargin}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin + halfHeight + gap}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${100 - 2 * slotMargin}%` },
    { top: `${slotMargin}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${100 - 2 * slotMargin}%` },
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin + halfHeight + gap}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin + halfHeight + gap}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${100 - 2 * slotMargin}%`, height: `${100 - 2 * slotMargin}%` },
];

const slotPositionsNoBg = [
    { top: '0%', left: '0%', width: '50%', height: '100%' },
    { top: '0%', left: '50%', width: '50%', height: '50%' },
    { top: '50%', left: '50%', width: '50%', height: '50%' },
    { top: '0%', left: '0%', width: '50%', height: '100%' },
    { top: '0%', left: '50%', width: '50%', height: '100%' },
    { top: '0%', left: '0%', width: '50%', height: '50%' },
    { top: '0%', left: '50%', width: '50%', height: '50%' },
    { top: '50%', left: '0%', width: '50%', height: '50%' },
    { top: '50%', left: '50%', width: '50%', height: '50%' },
    { top: '0%', left: '0%', width: '100%', height: '100%' },
];

// ---------------------- NEW: Crop helpers ----------------------
const createImageEl = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
});

async function getCroppedDataUrl(imageSrc, pixelCrop, rotation = 0, quality = 0.92) {
    const image = await createImageEl(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not available');

    // big safe area to rotate without clipping
    const safe = Math.max(image.width, image.height) * 2;
    canvas.width = safe;
    canvas.height = safe;

    ctx.translate(safe / 2, safe / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safe / 2, -safe / 2);
    ctx.drawImage(image, (safe - image.width) / 2, (safe - image.height) / 2);

    const data = ctx.getImageData(0, 0, safe, safe);

    // now set to crop size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(
        data,
        Math.round(-pixelCrop.x + (image.width - safe) / 2),
        Math.round(-pixelCrop.y + (image.height - safe) / 2)
    );

    return canvas.toDataURL('image/jpeg', quality);
}

// ensure a page's edits array exists and has at least n entries
function ensureEditsArray(ps, n) {
    const arr = (ps.edits && Array.isArray(ps.edits)) ? [...ps.edits] : [];
    while (arr.length < n) arr.push(null);
    return arr;
}

// ---------------------- MAIN COMPONENT ----------------------
export default function EditorPage({
    images,
    onAddImages,
    albumSize,
    s3,
    sessionId,
    user,
    identityId,
    title,
    subtitle,
    setTitle,
    setSubtitle,
}) {
    const [pageSettings, setPageSettings] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateModalPage, setTemplateModalPage] = useState(null);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [themeModalPage, setThemeModalPage] = useState(null);
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [backgroundEnabled, setBackgroundEnabled] = useState(true);

    // track when all assigned images have been fully preloaded
    const [imagesWarm, setImagesWarm] = useState(false);

    // refs for drag‐preview
    const previewRef = useRef(null);
    const previewImgRef = useRef(null);
    const dragActiveRef = useRef(false);
    const dragSrcRef = useRef({ page: null, slot: null });
    const touchTimerRef = useRef(null);
    const refs = useRef([]);
    const [saving, setSaving] = useState(false);
    const paddingPercent = albumSize ? (albumSize.height / albumSize.width) * 100 : 75;

    // ---------------- NEW: cropper modal state ----------------
    const [cropOpen, setCropOpen] = useState(false);
    const [cropTarget, setCropTarget] = useState({ pageIdx: null, slotIdx: null, aspect: 1 });
    const [cropState, setCropState] = useState({ crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 });
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const getSlotSrc = (ps, slotIdx) => {
        const edit = ps.edits?.[slotIdx];
        return edit?.previewDataUrl || ps.assignedImages[slotIdx];
    };

    // ----------------- RESTORE / INIT (unchanged + edits-safe) -----------------
    useEffect(() => {
        const stored = localStorage.getItem("pageSettings");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    // backward compatible: make sure each page has edits array
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
        const initial = remaining.map((_, i) => ({
            templateId: i === 0 ? 3 : i < 2 ? 1 : pageTemplates[Math.floor(Math.random() * pageTemplates.length)].id,
            theme: { mode: "dynamic", color: null },
        }));

        const withAssignments = initial.map((ps) => {
            const tmpl = pageTemplates.find((t) => t.id === ps.templateId);
            const assigned = remaining.splice(0, tmpl.slots.length);
            return { ...ps, assignedImages: assigned, edits: new Array(tmpl.slots.length).fill(null) };
        });

        setPageSettings(withAssignments);
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

    // dynamic theme colors via ColorThief (unchanged)
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

    // preload assigned images
    useEffect(() => {
        if (!pageSettings.length) return;
        const allUrls = pageSettings.flatMap((ps) => ps.assignedImages);
        if (!allUrls.length) { setImagesWarm(true); return; }
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

    // -------------- DRAG & DROP (original logic + swap edits) --------------
    const getTouchCoords = (e) => {
        if (e.touches?.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches?.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        if (typeof e.clientX === "number" && typeof e.clientY === "number") return { x: e.clientX, y: e.clientY };
        return lastTouchRef.current;
    };

    const longPressDuration = 300;
    const lastTouchRef = useRef({ x: 0, y: 0 });

    const scheduleTouchDrag = (pi, si, e) => {
        cancelTouchDrag();
        const touch = e.touches?.[0];
        if (touch) lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        touchTimerRef.current = setTimeout(() => {
            const fakeEvent = {
                clientX: lastTouchRef.current.x,
                clientY: lastTouchRef.current.y,
                touches: [{ clientX: lastTouchRef.current.x, clientY: lastTouchRef.current.y }],
                stopPropagation: () => { },
                cancelable: true,
                preventDefault: () => { },
            };
            startDrag(pi, si, fakeEvent);
        }, longPressDuration);
    };

    const cancelTouchDrag = () => {
        if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
        }
    };

    const startDrag = (pageIdx, slotIdx, e) => {
        e.stopPropagation();
        const url = pageSettings[pageIdx].assignedImages[slotIdx];
        if (!url) return;
        dragActiveRef.current = true;
        dragSrcRef.current = { page: pageIdx, slot: slotIdx };
        previewImgRef.current.src = getSlotSrc(pageSettings[pageIdx], slotIdx);
        const { x, y } = getTouchCoords(e);
        lastTouchRef.current = { x, y };
        previewRef.current.style.display = "block";
        movePreview(e);
        document.addEventListener("mousemove", movePreview);
        document.addEventListener("mouseup", handleDrop);
        document.addEventListener("touchmove", movePreview, { passive: false });
        document.addEventListener("touchend", handleDrop);
    };

    const movePreview = (e) => {
        if (!dragActiveRef.current) return;
        const { x, y } = getTouchCoords(e);
        lastTouchRef.current = { x, y };
        previewRef.current.style.left = `${x}px`;
        previewRef.current.style.top = `${y}px`;
        document.querySelectorAll(".photo-slot.highlight").forEach((el) => el.classList.remove("highlight"));
        const over = document.elementFromPoint(x, y)?.closest(".photo-slot");
        if (over) over.classList.add("highlight");
        if (e.cancelable) e.preventDefault();
    };

    const handleDrop = (e) => {
        if (!dragActiveRef.current) return;
        const { x, y } = getTouchCoords(e);
        lastTouchRef.current = { x, y };
        const over = document.elementFromPoint(x, y)?.closest(".photo-slot");
        if (over) {
            const tgtPage = Number(over.dataset.pageIndex);
            const tgtSlot = Number(over.dataset.slotIndex);
            const { page: srcPage, slot: srcSlot } = dragSrcRef.current;
            if (srcPage !== null && (srcPage !== tgtPage || srcSlot !== tgtSlot)) {
                setPageSettings((prev) => {
                    const next = prev.map((ps) => ({ ...ps, assignedImages: [...ps.assignedImages], edits: ensureEditsArray(ps, Math.max(ps.assignedImages.length, (ps.edits?.length || 0))) }));
                    // swap images
                    const tmp = next[srcPage].assignedImages[srcSlot];
                    next[srcPage].assignedImages[srcSlot] = next[tgtPage].assignedImages[tgtSlot];
                    next[tgtPage].assignedImages[tgtSlot] = tmp;
                    // swap edits (preserve per-slot crops with the image)
                    const eTmp = next[srcPage].edits?.[srcSlot] ?? null;
                    if (!next[srcPage].edits) next[srcPage].edits = [];
                    if (!next[tgtPage].edits) next[tgtPage].edits = [];
                    next[srcPage].edits[srcSlot] = next[tgtPage].edits?.[tgtSlot] ?? null;
                    next[tgtPage].edits[tgtSlot] = eTmp;
                    return next;
                });
            }
        }
        endDrag();
    };

    const endDrag = () => {
        dragActiveRef.current = false;
        previewRef.current.style.display = "none";
        document.querySelectorAll(".photo-slot.highlight").forEach((el) => el.classList.remove("highlight"));
        document.removeEventListener("mousemove", movePreview);
        document.removeEventListener("mouseup", handleDrop);
        document.removeEventListener("touchmove", movePreview);
        document.removeEventListener("touchend", handleDrop);
    };

    // ---------------- TEMPLATE & THEME (unchanged) ----------------
    const openTemplateModal = (pi) => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setTemplateModalPage(pi);
        setShowTemplateModal(true);
    };
    const pickTemplate = (pi, tid) => {
        setPageSettings((prev) => {
            const next = [...prev];
            next[pi].templateId = tid;
            // ensure edits array at least matches new slot count
            const tmpl = pageTemplates.find((t) => t.id === tid);
            next[pi].edits = ensureEditsArray(next[pi], tmpl.slots.length).slice(0, tmpl.slots.length);
            next[pi].assignedImages = [...next[pi].assignedImages].slice(0, tmpl.slots.length);
            return next;
        });
        setShowTemplateModal(false);
    };

    const openThemeModal = (pi) => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setThemeModalPage(pi);
        setShowThemeModal(true);
    };
    const pickTheme = (pi, { mode, color }) => {
        setPageSettings((prev) => prev.map((s, i) => {
            if (pi === null || pi === undefined || pi === -1 || i === pi) {
                return { ...s, theme: { mode, color: mode === "dynamic" ? null : color } };
            }
            return s;
        }));
        setShowThemeModal(false);
    };

    // ---------------- PDF SAVE (unchanged) ----------------
    const handleSave = async () => {
        if (!albumSize) return;
        setSaving(true);
        const { width, height } = albumSize;
        const orientation = width >= height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({ orientation, unit: 'cm', format: [width, height] });
        for (let i = 0; i < pageSettings.length; i++) {
            const node = refs.current[i];
            if (!node) continue;
            // eslint-disable-next-line no-await-in-loop
            const dataUrl = await toJpeg(node, { quality: 0.95, cacheBust: true, skipFonts: true });
            if (i > 0) pdf.addPage([width, height], orientation);
            pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
        }

        const blob = pdf.output('blob');
        const key = `${sessionId}/album.pdf`;
        try {
            await s3.upload({ Key: key, Body: blob, ContentType: 'application/pdf' }).promise();
        } finally {
            setSaving(false);
        }
    };

    // ---------------- OPEN/CLOSE CROP MODAL ----------------
    const openCropper = (pi, slotIdx, slotPosIndex) => {
        const ps = pageSettings[pi];
        if (!ps?.assignedImages?.[slotIdx]) return;
        const pos = backgroundEnabled ? slotPositions[slotPosIndex] : slotPositionsNoBg[slotPosIndex];
        const w = parseFloat(String(pos.width).replace('%', ''));
        const h = parseFloat(String(pos.height).replace('%', ''));
        const aspect = w / h || 1;

        // load previous params if any
        const prev = ps.edits?.[slotIdx]?.params;
        setCropState(prev ? { crop: prev.crop, zoom: prev.zoom, rotation: prev.rotation || 0 } : { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 });
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
                previewDataUrl: dataUrl, // persisted friendly
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
                                            {tmpl.slots.map((_, slotIdx) => (
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
                                if (!ps.assignedImages?.length) return null;
                                const tmpl = pageTemplates.find((t) => t.id === ps.templateId);
                                return (
                                    <div key={pi} className="page-wrapper" style={{ backgroundColor: backgroundEnabled ? ps.theme.color || 'transparent' : 'transparent' }}>
                                        <Box className="toolbar" direction="row" gap="small" align="center">
                                            {pi !== 0 && (
                                                <Button icon={<TemplateIcon />} color="black" className="btn-ico" onClick={() => openTemplateModal(pi)} />
                                            )}
                                            <Button icon={<Brush />} color="black" className="btn-ico" onClick={() => openThemeModal(pi)} />
                                        </Box>

                                        <div className={`photo-page ${!backgroundEnabled ? 'zoomed' : ''}`}>
                                            {tmpl.slots.map((slotPosIndex, slotIdx) => {
                                                const pos = backgroundEnabled ? slotPositions[slotPosIndex] : slotPositionsNoBg[slotPosIndex];
                                                const imgSrc = getSlotSrc(ps, slotIdx);
                                                return (
                                                    <div
                                                        key={slotPosIndex}
                                                        className={`photo-slot slot${slotPosIndex + 1}`}
                                                        data-page-index={pi}
                                                        data-slot-index={slotIdx}
                                                        style={{ ...pos, position: 'absolute', overflow: 'hidden', borderRadius: '4px' }}
                                                        onMouseDown={(e) => startDrag(pi, slotIdx, e)}
                                                        onTouchStart={(e) => scheduleTouchDrag(pi, slotIdx, e)}
                                                        onTouchMove={(e) => { if (!dragActiveRef.current) { cancelTouchDrag(); } }}
                                                        onTouchEnd={cancelTouchDrag}
                                                    >
                                                        {!!imgSrc && (
                                                            <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        )}
                                                        {/* EDIT BUTTON overlay (doesn't trigger drag) */}
                                                        <button
                                                            className="slot-edit-btn"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => { e.stopPropagation(); openCropper(pi, slotIdx, slotPosIndex); }}
                                                            title="Edit crop"
                                                        >
                                                            <Edit size="small" />
                                                        </button>
                                                        {/* RESET BUTTON appears if cropped */}
                                                        {ps.edits?.[slotIdx]?.previewDataUrl && (
                                                            <button
                                                                className="slot-reset-btn"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => { e.stopPropagation(); resetCropForSlot(pi, slotIdx); }}
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
            <Box style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {pageSettings.map((ps, pi) => {
                    const tmpl = pageTemplates.find((t) => t.id === ps.templateId);
                    if (!tmpl) return null;
                    return (
                        <Box key={pi}>
                            <Box
                                ref={(el) => (refs.current[pi] = el)}
                                className="photo-page"
                                style={{ position: 'relative', width: '100%', maxWidth: '500px', paddingTop: `${paddingPercent}%`, backgroundColor: backgroundEnabled ? ps.theme.color || 'transparent' : 'transparent' }}
                            >
                                {tmpl.slots.map((slotPosIndex, slotIdx) => (
                                    <Box key={slotPosIndex} className={`photo-slot slot${slotPosIndex + 1}`} style={{ position: 'absolute', overflow: 'hidden', borderRadius: '4px', ...slotPositions[slotPosIndex] }}>
                                        <img src={getSlotSrc(ps, slotIdx)} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </Box>
                                ))}
                                {pi === 0 && (
                                    <Box className="title-overlay">{title && <h1>{title}</h1>}{subtitle && <h2>{subtitle}</h2>}</Box>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {saving && (
                <Layer position="center" responsive={false} modal>
                    <Box pad="medium"><Text>Saving album...</Text></Box>
                </Layer>
            )}

            {/* drag preview overlay */}
            <div id="drag-preview" ref={previewRef}><img ref={previewImgRef} alt="" /></div>

            {/* Modals */}
            {showTemplateModal && (
                <TemplateModal templates={pageTemplates} onSelect={(id) => pickTemplate(templateModalPage, id)} onClose={() => setShowTemplateModal(false)} />
            )}
            {showThemeModal && (
                <ThemeModal pageIdx={themeModalPage} onSelect={pickTheme} onClose={() => setShowThemeModal(false)} />
            )}
            {showTitleModal && (
                <TitleModal title={title} subtitle={subtitle} onSave={({ title: t, subtitle: st }) => { setTitle(t); setSubtitle(st); setShowTitleModal(false); }} onClose={() => setShowTitleModal(false)} />
            )}

            <SettingsBar backgroundEnabled={backgroundEnabled} setBackgroundEnabled={setBackgroundEnabled} onAddImages={onAddImages} onOpenThemeModal={() => openThemeModal(null)} onEditTitle={() => setShowTitleModal(true)} onSave={handleSave} />

            {/* CROPPER MODAL */}
            {cropOpen && (
                <Layer onEsc={closeCropper} onClickOutside={closeCropper} modal responsive={false} position="center">
                    <Box width="large" height="medium" overflow="hidden">
                        <Box pad="small" border={{ side: 'bottom' }} direction="row" justify="between" align="center">
                            <Text weight="bold">Adjust photo</Text>
                            <Button label="Close" onClick={closeCropper} />
                        </Box>
                        <Box background="black" style={{ position: 'relative', flex: 1, height: '60vh' }}>
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
                        <Box pad="small" gap="small" direction="row" align="center" border={{ side: 'top' }}>
                            <Box width="medium">
                                <Text size="small">Zoom ({cropState.zoom.toFixed(2)}×)</Text>
                                <input type="range" min={1} max={4} step={0.01} value={cropState.zoom} onChange={(e) => setCropState((p) => ({ ...p, zoom: Number(e.target.value) }))} style={{ width: '100%' }} />
                            </Box>
                            <Box width="medium">
                                <Text size="small">Rotation ({Math.round(cropState.rotation)}°)</Text>
                                <input type="range" min={-180} max={180} step={1} value={cropState.rotation} onChange={(e) => setCropState((p) => ({ ...p, rotation: Number(e.target.value) }))} style={{ width: '100%' }} />
                            </Box>
                            <Box direction="row" gap="small" margin={{ left: 'auto' }}>
                                <Button label="Reset" onClick={() => { setCropState({ crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 }); setCroppedAreaPixels(null); }} />
                                <Button primary label="Save crop" onClick={saveCrop} disabled={!croppedAreaPixels} />
                            </Box>
                        </Box>
                    </Box>
                </Layer>
            )}
        </>
    );
}
