// src/components/EditorPage.js
import "./EditorPage.css";
import React, { useState, useEffect, useRef } from "react";
import ColorThief from "color-thief-browser";
import { Box, Button, Layer, Text } from "grommet";
import { jsPDF } from "jspdf";
import { toJpeg } from "html-to-image";
import { Template as TemplateIcon, Brush } from "grommet-icons";
import TemplateModal from "./TemplateModal";
import ThemeModal from "./ThemeModal";
import SettingsBar from "./SettingsBar";
import { pageTemplates } from "../templates/pageTemplates";

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

export default function EditorPage({ images, onAddImages, albumSize, s3, sessionId }) {
    const [pageSettings, setPageSettings] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateModalPage, setTemplateModalPage] = useState(null);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [themeModalPage, setThemeModalPage] = useState(null);
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

    // transparent placeholder for lazy images
  

    // 1) initialize per-page assignments whenever `images` changes
    useEffect(() => {
        const remaining = images.slice();
        const initial = remaining.map((_, i) => ({
            templateId:
                i < 2
                    ? 1
                    : pageTemplates[
                        Math.floor(Math.random() * pageTemplates.length)
                    ].id,
            theme: { mode: "dynamic", color: null },
        }));

        const withAssignments = initial.map(ps => {
            const tmpl = pageTemplates.find(t => t.id === ps.templateId);
            const assigned = remaining.splice(0, tmpl.slots.length);
            return { ...ps, assignedImages: assigned };
        });

        setPageSettings(withAssignments);
        setImagesWarm(false);
    }, [images]);

    // 2) persist settings to localStorage
    useEffect(() => {
        localStorage.setItem(
            "pageSettings",
            JSON.stringify(pageSettings)
        );
    }, [pageSettings]);

    // compute dynamic theme colors using ColorThief
    useEffect(() => {
        if (!imagesWarm) return;
        const thief = new ColorThief();
        pageSettings.forEach((ps, idx) => {
            if (
                ps.theme.mode === "dynamic" &&
                ps.assignedImages[0] &&
                !ps.theme.color
            ) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = ps.assignedImages[0];
                img.onload = () => {
                    const [r, g, b] = thief.getColor(img);
                    const rgb = `rgb(${r}, ${g}, ${b})`;
                    setPageSettings(prev => {
                        if (prev[idx].theme.color === rgb) return prev;
                        const next = [...prev];
                        next[idx] = {
                            ...next[idx],
                            theme: { mode: "dynamic", color: rgb },
                        };
                        return next;
                    });
                };
            }
        });
    }, [imagesWarm, pageSettings]);

    // 3) preload all assignedImages; when every one fires onload/onerror → mark warm
    useEffect(() => {
        if (!pageSettings.length) return;
        const allUrls = pageSettings.flatMap(ps => ps.assignedImages);
        if (!allUrls.length) {
            setImagesWarm(true);
            return;
        }

        let loaded = 0;
        allUrls.forEach(url => {
            const img = new Image();
            img.src = url;
            img.onload = img.onerror = () => {
                loaded += 1;
                if (loaded === allUrls.length) {
                    setImagesWarm(true);
                }
            };
        });
    }, [pageSettings]);

    // DRAG & DROP UTILS
    const getTouchCoords = e => {
        if (e.touches?.length) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches?.length) {
            return {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY,
            };
        }
        if (typeof e.clientX === "number" && typeof e.clientY === "number") {
            return { x: e.clientX, y: e.clientY };
        }
        return lastTouchRef.current;
    };

    const longPressDuration = 300; // ms
    const lastTouchRef = useRef({ x: 0, y: 0 });

    const scheduleTouchDrag = (pi, si, e) => {
        cancelTouchDrag();
        const touch = e.touches?.[0];
        if (touch) {
            lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        }
        touchTimerRef.current = setTimeout(() => {
            const fakeEvent = {
                clientX: lastTouchRef.current.x,
                clientY: lastTouchRef.current.y,
                touches: [{
                    clientX: lastTouchRef.current.x,
                    clientY: lastTouchRef.current.y,
                }],
                stopPropagation: () => {},
                cancelable: true,
                preventDefault: () => {},
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
        const url =
            pageSettings[pageIdx].assignedImages[slotIdx];
        if (!url) return;
        dragActiveRef.current = true;
        dragSrcRef.current = { page: pageIdx, slot: slotIdx };
        previewImgRef.current.src = url;
        const { x, y } = getTouchCoords(e);
        lastTouchRef.current = { x, y };
        previewRef.current.style.display = "block";
        movePreview(e);
        document.addEventListener("mousemove", movePreview);
        document.addEventListener("mouseup", handleDrop);
        document.addEventListener("touchmove", movePreview, {
            passive: false,
        });
        document.addEventListener("touchend", handleDrop);
    };

    const movePreview = e => {
        if (!dragActiveRef.current) return;
        const { x, y } = getTouchCoords(e);
        lastTouchRef.current = { x, y };
        previewRef.current.style.left = `${x}px`;
        previewRef.current.style.top = `${y}px`;
        document
            .querySelectorAll(".photo-slot.highlight")
            .forEach(el => el.classList.remove("highlight"));
        const over = document
            .elementFromPoint(x, y)
            ?.closest(".photo-slot");
        if (over) over.classList.add("highlight");
        if (e.cancelable) e.preventDefault();
    };

    const handleDrop = e => {
        if (!dragActiveRef.current) return;
        const { x, y } = getTouchCoords(e);
        lastTouchRef.current = { x, y };
        const over = document
            .elementFromPoint(x, y)
            ?.closest(".photo-slot");
        if (over) {
            const tgtPage = Number(over.dataset.pageIndex);
            const tgtSlot = Number(over.dataset.slotIndex);
            const { page: srcPage, slot: srcSlot } =
                dragSrcRef.current;
            if (
                srcPage !== null &&
                (srcPage !== tgtPage || srcSlot !== tgtSlot)
            ) {
                setPageSettings(prev => {
                    const next = prev.map(ps => ({
                        ...ps,
                        assignedImages: [...ps.assignedImages],
                    }));
                    const tmp =
                        next[srcPage].assignedImages[srcSlot];
                    next[srcPage].assignedImages[srcSlot] =
                        next[tgtPage].assignedImages[tgtSlot];
                    next[tgtPage].assignedImages[tgtSlot] = tmp;
                    return next;
                });
            }
        }
        endDrag();
    };

    const endDrag = () => {
        dragActiveRef.current = false;
        previewRef.current.style.display = "none";
        document
            .querySelectorAll(".photo-slot.highlight")
            .forEach(el => el.classList.remove("highlight"));
        document.removeEventListener("mousemove", movePreview);
        document.removeEventListener("mouseup", handleDrop);
        document.removeEventListener("touchmove", movePreview);
        document.removeEventListener("touchend", handleDrop);
    };

    // TEMPLATE & THEME MODALS
    const openTemplateModal = (pi) => {
        // blur the active element to avoid accessibility warnings when the Layer opens
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setTemplateModalPage(pi);
        setShowTemplateModal(true);
    };
    const pickTemplate = (pi, tid) => {
        setPageSettings(prev => {
            const next = [...prev];
            next[pi].templateId = tid;
            return next;
        });
        setShowTemplateModal(false);
    };

    const openThemeModal = (pi) => {
        // blur active element so the button losing focus prevents aria-hidden warning
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setThemeModalPage(pi);
        setShowThemeModal(true);
    };
    const pickTheme = (pi, { mode, color }) => {
        setPageSettings(prev =>
            prev.map((s, i) => {
                if (pi === null || pi === undefined || pi === -1 || i === pi) {
                    return {
                        ...s,
                        theme: {
                            mode,
                            color: mode === "dynamic" ? null : color,
                        },
                    };
                }
                return s;
            })
        );
        setShowThemeModal(false);
    };

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
            await s3
                .upload({ Key: key, Body: blob, ContentType: 'application/pdf' })
                .promise();
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/** SKELETON WIREFRAME until all imagesWarm */}
            {!imagesWarm ? (
                <div className="container">
                    {pageSettings.map((ps, pi) => {
                        const tmpl = pageTemplates.find(
                            t => t.id === ps.templateId
                        );
                        return (
                            <div
                                key={pi}
                                className="page-wrapper skeleton-page-wrapper"
                            >
                                <Box direction="row" wrap gap="small" pad="small">
                                    {tmpl.slots.map((_, slotIdx) => (
                                        <div
                                            key={slotIdx}
                                            className="skeleton-photo-slot"
                                        />
                                    ))}
                                </Box>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /** REAL EDITOR PAGE once warm **/
                <div className="container">
                    {pageSettings.map((ps, pi) => {
                        if (!ps.assignedImages?.length) return null;
                        const tmpl = pageTemplates.find(
                            t => t.id === ps.templateId
                        );
                        return (
                            <div
                                key={pi}
                                className="page-wrapper"
                                style={{
                                    backgroundColor: backgroundEnabled
                                        ? ps.theme.color || 'transparent'
                                        : 'transparent',
                                }}
                            >
                                <Box
                                    className="toolbar"
                                    direction="row"
                                    gap="small"
                                    align="center"
                                >
                                    <Button
                                        icon={<TemplateIcon />}
                                        tip="Layout"
                                        onClick={() => openTemplateModal(pi)}
                                    />
                                    <Button
                                        icon={<Brush />}
                                        tip="Theme"
                                        onClick={() => openThemeModal(pi)}
                                    />
                                </Box>

                                <div className={`photo-page ${!backgroundEnabled ? 'zoomed' : ''}`}>
                                    {tmpl.slots.map((slotPos, slotIdx) => {
                                        const pos = backgroundEnabled
                                            ? slotPositions[slotPos]
                                            : slotPositionsNoBg[slotPos];
                                        return (
                                            <div
                                                key={slotPos}
                                                className={`photo-slot slot${
                                                    slotPos + 1
                                                }`}
                                                data-page-index={pi}
                                                data-slot-index={slotIdx}
                                                style={{
                                                    ...pos,
                                                }}
                                            onMouseDown={e =>
                                                startDrag(pi, slotIdx, e)
                                            }
                                            onTouchStart={e =>
                                                scheduleTouchDrag(pi, slotIdx, e)
                                            }
                                            onTouchMove={e => {
                                                if (!dragActiveRef.current) {
                                                    cancelTouchDrag();
                                                }
                                            }}
                                            onTouchEnd={cancelTouchDrag}
                                        >
                                                <img
                                                    src={ps.assignedImages[slotIdx]}
                                                    alt=""
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* hidden pages for PDF generation */}
            <Box style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {pageSettings.map((ps, pi) => {
                    const tmpl = pageTemplates.find(t => t.id === ps.templateId);
                    if (!tmpl) return null;
                    return (
                        <Box key={pi}>
                            <Box
                                ref={el => (refs.current[pi] = el)}
                                className="photo-page"
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: '500px',
                                    paddingTop: `${paddingPercent}%`,
                                    backgroundColor: backgroundEnabled
                                        ? ps.theme.color || 'transparent'
                                        : 'transparent',
                                }}
                            >
                                {tmpl.slots.map((slotPos, slotIdx) => (
                                    <Box
                                        key={slotPos}
                                        className={`photo-slot slot${slotPos + 1}`}
                                        style={{
                                            position: 'absolute',
                                            overflow: 'hidden',
                                            borderRadius: '4px',
                                            ...slotPositions[slotPos],
                                        }}
                                    >
                                        <img
                                            src={ps.assignedImages[slotIdx]}
                                            alt=""
                                            crossOrigin="anonymous"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </Box>
                                ))}
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

            {showTemplateModal && (
                <TemplateModal
                    templates={pageTemplates}
                    onSelect={id =>
                        pickTemplate(templateModalPage, id)
                    }
                    onClose={() => setShowTemplateModal(false)}
                />
            )}
            {showThemeModal && (
                <ThemeModal
                    pageIdx={themeModalPage}
                    onSelect={pickTheme}
                    onClose={() => setShowThemeModal(false)}
                />
            )}

            <SettingsBar
                backgroundEnabled={backgroundEnabled}
                setBackgroundEnabled={setBackgroundEnabled}
                onAddImages={onAddImages}
                onOpenThemeModal={() => openThemeModal(null)}
                onSave={handleSave}
            />
        </>
    );
}
