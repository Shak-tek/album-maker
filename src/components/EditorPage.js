// src/components/EditorPage.js
import "./EditorPage.css";
import React, { useState, useEffect, useRef } from "react";
import { Box, Button } from "grommet";
import { Template as TemplateIcon, Brush } from "grommet-icons";
import TemplateModal from "./TemplateModal";
import ThemeModal from "./ThemeModal";
// import ColorThief from "color-thief-browser";
import { pageTemplates } from "../templates/pageTemplates";

export default function EditorPage({ images }) {
    const [pageSettings, setPageSettings] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateModalPage, setTemplateModalPage] = useState(null);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [themeModalPage, setThemeModalPage] = useState(null);

    const previewRef = useRef(null);
    const previewImgRef = useRef(null);
    const dragActiveRef = useRef(false);
    const dragSrcRef = useRef({ page: null, slot: null });

    // 1×1 transparent placeholder
    const TRANSPARENT_PIXEL =
        "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

    // 1) initialize per-page assignments
    useEffect(() => {
        const remaining = images.slice();
        const initial = remaining.map((_, i) => ({
            templateId:
                i < 2
                    ? 1
                    : pageTemplates[Math.floor(Math.random() * pageTemplates.length)].id,
            theme: { mode: "dynamic", color: null },
        }));

        const withAssignments = initial.map(ps => {
            const tmpl = pageTemplates.find(t => t.id === ps.templateId);
            const assigned = remaining.splice(0, tmpl.slots.length);
            return { ...ps, assignedImages: assigned };
        });

        setPageSettings(withAssignments);
    }, [images]);

    // 2) persist settings
    useEffect(() => {
        localStorage.setItem("pageSettings", JSON.stringify(pageSettings));
    }, [pageSettings]);

    // 3) lazy-load + dynamic color on actual load
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const img = entry.target;
                    img.src = img.dataset.src;        // swap in real URL

                    // img.onload = () => {
                    //     // extract color only once it's in view
                    //     const slotEl = img.closest(".photo-slot");
                    //     if (!slotEl) return;
                    //     const pageIdx = Number(slotEl.dataset.pageIndex);
                    //     const setting = pageSettings[pageIdx];
                    //     if (setting?.theme.mode === "dynamic") {
                    //         try {
                    //             const [r, g, b] = new ColorThief().getColor(img);
                    //             const rgb = `rgb(${r}, ${g}, ${b})`;
                    //             setPageSettings(ps => {
                    //                 const next = [...ps];
                    //                 next[pageIdx] = {
                    //                     ...next[pageIdx],
                    //                     theme: { mode: "dynamic", color: rgb },
                    //                 };
                    //                 return next;
                    //             });
                    //         } catch {
                    //             // ignore any ColorThief failures
                    //         }
                    //     }
                    // };

                    obs.unobserve(img);
                });
            },
            { rootMargin: "100px", threshold: 0.1 }
        );

        document.querySelectorAll("img[data-src]").forEach(img => {
            img.src = TRANSPARENT_PIXEL;
            observer.observe(img);
        });

        return () => observer.disconnect();
    }, [pageSettings]);

    // helper for drag coords
    const getTouchCoords = e =>
        e.touches?.length
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: e.clientX, y: e.clientY };

    // start dragging
    const startDrag = (pageIdx, slotIdx, e) => {
        e.stopPropagation();
        const url = pageSettings[pageIdx].assignedImages[slotIdx];
        if (!url) return;
        dragActiveRef.current = true;
        dragSrcRef.current = { page: pageIdx, slot: slotIdx };
        previewImgRef.current.src = url;
        previewRef.current.style.display = "block";
        movePreview(e);
        document.addEventListener("mousemove", movePreview);
        document.addEventListener("mouseup", handleDrop);
        document.addEventListener("touchmove", movePreview, { passive: false });
        document.addEventListener("touchend", handleDrop);
    };

    // move drag preview
    const movePreview = e => {
        if (!dragActiveRef.current) return;
        const { x, y } = getTouchCoords(e);
        previewRef.current.style.left = `${x}px`;
        previewRef.current.style.top = `${y}px`;
        document
            .querySelectorAll(".photo-slot.highlight")
            .forEach(el => el.classList.remove("highlight"));
        const over = document.elementFromPoint(x, y)?.closest(".photo-slot");
        if (over) over.classList.add("highlight");
        if (e.cancelable) e.preventDefault();
    };

    // drop & swap
    const handleDrop = e => {
        if (!dragActiveRef.current) return;
        const { x, y } = getTouchCoords(e);
        const over = document.elementFromPoint(x, y)?.closest(".photo-slot");
        if (over) {
            const tgtPage = Number(over.dataset.pageIndex);
            const tgtSlot = Number(over.dataset.slotIndex);
            const { page: srcPage, slot: srcSlot } = dragSrcRef.current;
            if (
                srcPage !== null &&
                (srcPage !== tgtPage || srcSlot !== tgtSlot)
            ) {
                setPageSettings(prev => {
                    const next = prev.map(ps => ({
                        ...ps,
                        assignedImages: [...ps.assignedImages],
                    }));
                    const tmp = next[srcPage].assignedImages[srcSlot];
                    next[srcPage].assignedImages[srcSlot] =
                        next[tgtPage].assignedImages[tgtSlot];
                    next[tgtPage].assignedImages[tgtSlot] = tmp;
                    return next;
                });
            }
        }
        endDrag();
    };

    // end drag cleanup
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

    // template modal
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

    // theme modal
    const openThemeModal = pi => {
        setThemeModalPage(pi);
        setShowThemeModal(true);
    };
    const pickTheme = (pi, { mode, color }) => {
        setPageSettings(prev =>
            prev.map((s, i) =>
                i === pi
                    ? { ...s, theme: { mode, color: mode === "dynamic" ? null : color } }
                    : s
            )
        );
        setShowThemeModal(false);
    };

    return (
        <>
            <div className="container">
                {pageSettings.map((ps, pi) => {
                    // skip any page with zero assignedImages
                    if (!ps.assignedImages?.length) return null;

                    const tmpl = pageTemplates.find(t => t.id === ps.templateId);
                    return (
                        <div
                            key={pi}
                            className="page-wrapper"
                            style={{ backgroundColor: ps.theme.color || "transparent" }}
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
                                        className={`photo-slot slot${slotPos + 1}`}
                                        data-page-index={pi}
                                        data-slot-index={slotIdx}
                                        onMouseDown={e => startDrag(pi, slotIdx, e)}
                                        onTouchStart={e => startDrag(pi, slotIdx, e)}
                                    >
                                        <img
                                            src={TRANSPARENT_PIXEL}
                                            data-src={ps.assignedImages[slotIdx]}
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

            <div id="drag-preview" ref={previewRef}>
                <img ref={previewImgRef} alt="" />
            </div>

            {showTemplateModal && (
                <TemplateModal
                    templates={pageTemplates}
                    onSelect={id => pickTemplate(templateModalPage, id)}
                    onClose={() => setShowTemplateModal(false)}
                />
            )}
            {showThemeModal && (
                <ThemeModal
                    pageIdx={themeModalPage}
                    onSelect={opts => pickTheme(themeModalPage, opts)}
                    onClose={() => setShowThemeModal(false)}
                />
            )}
        </>
    );
}
