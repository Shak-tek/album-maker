import "./EditorPage.css";
import React, { useState, useEffect, useRef } from "react";
import { Box, Button } from "grommet";
import { Template as TemplateIcon, Brush } from "grommet-icons";
import TemplateModal from "./TemplateModal";
import ThemeModal from "./ThemeModal";
import ColorThief from "color-thief-browser";
import { pageTemplates } from "../templates/pageTemplates";

export default function EditorPage({ images }) {
    const [pageSettings, setPageSettings] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateModalPage, setTemplateModalPage] = useState(null);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [themeModalPage, setThemeModalPage] = useState(null);

    // refs for drag‐and‐drop
    const previewRef = useRef();
    const previewImgRef = useRef();
    const dragActiveRef = useRef(false);
    const dragSrcRef = useRef({ page: null, slot: null });

    // 1) initialize per‐page assignments (never reuse an image)
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
            const count = tmpl.slots.length;
            const assigned = remaining.splice(0, count);
            return { ...ps, assignedImages: assigned };
        });

        setPageSettings(withAssignments);
    }, [images]);

    // 2) dynamic color
    useEffect(() => {
        pageSettings.forEach(async (ps, pi) => {
            if (ps.theme.mode !== "dynamic") return;
            const url = ps.assignedImages[0];
            if (!url || url.startsWith("blob:")) return;

            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            try {
                await img.decode();
            } catch {
                return;
            }

            const [r, g, b] = new ColorThief().getColor(img);
            const rgb = `rgb(${r}, ${g}, ${b})`;
            if (rgb !== ps.theme.color) {
                setPageSettings(prev => {
                    const next = [...prev];
                    next[pi] = { ...next[pi], theme: { mode: "dynamic", color: rgb } };
                    return next;
                });
            }
        });
    }, [pageSettings]);

    // 3) persist
    useEffect(() => {
        localStorage.setItem("pageSettings", JSON.stringify(pageSettings));
    }, [pageSettings]);

    // helper to get mouse/touch coords
    const getTouchCoords = e =>
        e.touches?.length
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: e.clientX, y: e.clientY };

    // start dragging a specific page/slot
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

    // move the preview image
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

    // on mouseup/touchend: swap src↔tgt
    const handleDrop = e => {
        if (!dragActiveRef.current) return;
        const { x, y } = getTouchCoords(e);
        const over = document
            .elementFromPoint(x, y)
            ?.closest(".photo-slot");

        if (over) {
            const tgtPage = Number(over.dataset.pageIndex);
            const tgtSlot = Number(over.dataset.slotIndex);
            const { page: srcPage, slot: srcSlot } = dragSrcRef.current;

            if (
                srcPage !== null &&
                (srcPage !== tgtPage || srcSlot !== tgtSlot)
            ) {
                setPageSettings(prev => {
                    // deep‐clone assignedImages arrays
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

    // clean up
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

    // template/theme modals
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
                    const tmpl = pageTemplates.find(t => t.id === ps.templateId);
                    return (
                        <div
                            key={pi}
                            className="page-wrapper"
                            style={{
                                backgroundColor: ps.theme.color || "transparent",
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
                                        className={`photo-slot slot${slotPos + 1}`}
                                        data-page-index={pi}
                                        data-slot-index={slotIdx}
                                        onMouseDown={e => startDrag(pi, slotIdx, e)}
                                        onTouchStart={e => startDrag(pi, slotIdx, e)}
                                    >
                                        {ps.assignedImages[slotIdx] && (
                                            <img
                                                src={ps.assignedImages[slotIdx]}
                                                alt=""
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                }}
                                            />
                                        )}
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
                    onSelect={pickTheme}
                    onClose={() => setShowThemeModal(false)}
                />
            )}
        </>
    );
}
