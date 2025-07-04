// src/components/EditorPage.js
import "./EditorPage.css";
import React, { useState, useEffect, useRef } from "react";
import { Box, Button } from "grommet";
import { Template as TemplateIcon, Brush } from "grommet-icons";
import TemplateModal from "./TemplateModal";
import ThemeModal from "./ThemeModal";
import { pageTemplates } from "../templates/pageTemplates";

export default function EditorPage({ images }) {
    const [pageSettings, setPageSettings] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateModalPage, setTemplateModalPage] = useState(null);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [themeModalPage, setThemeModalPage] = useState(null);

    // track when all assigned images have been fully preloaded
    const [imagesWarm, setImagesWarm] = useState(false);

    // refs for drag‐preview
    const previewRef = useRef(null);
    const previewImgRef = useRef(null);
    const dragActiveRef = useRef(false);
    const dragSrcRef = useRef({ page: null, slot: null });

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
    const getTouchCoords = e =>
        e.touches?.length
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: e.clientX, y: e.clientY };

    const startDrag = (pageIdx, slotIdx, e) => {
        e.stopPropagation();
        const url =
            pageSettings[pageIdx].assignedImages[slotIdx];
        if (!url) return;
        dragActiveRef.current = true;
        dragSrcRef.current = { page: pageIdx, slot: slotIdx };
        previewImgRef.current.src = url;
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
    const openTemplateModal = pi => {
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

    const openThemeModal = pi => {
        setThemeModalPage(pi);
        setShowThemeModal(true);
    };
    const pickTheme = (pi, { mode, color }) => {
        setPageSettings(prev =>
            prev.map((s, i) =>
                i === pi
                    ? {
                        ...s,
                        theme: {
                            mode,
                            color: mode === "dynamic" ? null : color,
                        },
                    }
                    : s
            )
        );
        setShowThemeModal(false);
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
                                    backgroundColor:
                                        ps.theme.color || "transparent",
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

                                <div className="photo-page">
                                    {tmpl.slots.map((slotPos, slotIdx) => (
                                        <div
                                            key={slotPos}
                                            className={`photo-slot slot${slotPos +
                                                1}`}
                                            data-page-index={pi}
                                            data-slot-index={slotIdx}
                                            onMouseDown={e =>
                                                startDrag(pi, slotIdx, e)
                                            }
                                            onTouchStart={e =>
                                                startDrag(pi, slotIdx, e)
                                            }
                                        >
                                            <img
                                                src={ps.assignedImages[slotIdx]}
                                                alt=""
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                    onSelect={opts =>
                        pickTheme(themeModalPage, opts)
                    }
                    onClose={() => setShowThemeModal(false)}
                />
            )}
        </>
    );
}
