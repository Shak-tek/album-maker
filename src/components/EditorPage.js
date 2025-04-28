import React, { useState, useEffect, useRef } from "react";
import { Box, Button } from "grommet";
import { Template as TemplateIcon, Brush } from "grommet-icons";
import TemplateModal from "./TemplateModal";
import ThemeModal from "./ThemeModal";
import ColorThief from "color-thief-browser";
import { pageTemplates } from "../templates/pageTemplates";
import "./EditorPage.css";

export default function EditorPage({ images }) {
    const [slots, setSlots] = useState([]); // array of URL strings
    const [pageSettings, setPageSettings] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateModalPage, setTemplateModalPage] = useState(null);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [themeModalPage, setThemeModalPage] = useState(null);

    const previewRef = useRef();
    const previewImgRef = useRef();
    const dragActiveRef = useRef(false);
    const dragSrcRef = useRef(null);

    // 1) initialize slots & settings
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("editorSlots") || "null");
        const initialSlots = Array.isArray(saved) && saved.length ? saved : images.slice();

        const savedSettings = JSON.parse(localStorage.getItem("pageSettings") || "null");
        const defaultSettings = initialSlots.map((_, i) => ({
            templateId:
                i < 2
                    ? 1
                    : pageTemplates[Math.floor(Math.random() * pageTemplates.length)].id,
            theme: { mode: "dynamic", color: null },
        }));
        setSlots(initialSlots);
        setPageSettings(Array.isArray(savedSettings) && savedSettings.length ? savedSettings : defaultSettings);
    }, [images]);

    // 2) dynamic color detection
    useEffect(() => {
        pageSettings.forEach(async (ps, pi) => {
            if (ps.theme.mode !== "dynamic") return;
            const tmpl = pageTemplates.find((t) => t.id === ps.templateId);
            const idx = tmpl.slots[0];
            const url = slots[idx];
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
                setPageSettings((prev) => {
                    const next = [...prev];
                    next[pi] = { ...next[pi], theme: { mode: "dynamic", color: rgb } };
                    return next;
                });
            }
        });
    }, [slots, pageSettings]);

    // 3) persist
    useEffect(() => {
        localStorage.setItem("editorSlots", JSON.stringify(slots));
    }, [slots]);
    useEffect(() => {
        localStorage.setItem("pageSettings", JSON.stringify(pageSettings));
    }, [pageSettings]);

    // drag utils
    const getTouchCoords = (e) =>
        e.touches?.length
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: e.clientX, y: e.clientY };

    const startDrag = (i, e) => {
        e.stopPropagation();
        if (!slots[i]) return;
        dragActiveRef.current = true;
        dragSrcRef.current = i;
        previewImgRef.current.src = slots[i];
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
        const over = document.elementFromPoint(x, y)?.closest(".photo-slot");
        if (over?.dataset.index != null) {
            const tgt = Number(over.dataset.index);
            const src = dragSrcRef.current;
            if (src !== tgt) {
                setSlots((prev) => {
                    const next = [...prev];
                    [next[src], next[tgt]] = [next[tgt], next[src]];
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

    // template/theme handlers
    const openTemplateModal = (pi) => {
        setTemplateModalPage(pi);
        setShowTemplateModal(true);
    };
    const pickTemplate = (pi, tid) => {
        setPageSettings((prev) => prev.map((s, i) => (i === pi ? { ...s, templateId: tid } : s)));
        setShowTemplateModal(false);
    };

    const openThemeModal = (pi) => {
        setThemeModalPage(pi);
        setShowThemeModal(true);
    };
    const pickTheme = (pi, { mode, color }) => {
        setPageSettings((prev) =>
            prev.map((s, i) => (i === pi ? { ...s, theme: { mode, color: mode === "dynamic" ? null : color } } : s))
        );
        setShowThemeModal(false);
    };

    return (
        <>
            <div className="container">
                {pageSettings.map((ps, pi) => {
                    const tmpl = pageTemplates.find((t) => t.id === ps.templateId);
                    return (
                        <div key={pi} className="page-wrapper" style={{ backgroundColor: ps.theme.color || "transparent" }}>
                            <Box className="toolbar" direction="row" gap="small" align="center">
                                <Button icon={<TemplateIcon />} tip="Layout" onClick={() => openTemplateModal(pi)} />
                                <Button icon={<Brush />} tip="Theme" onClick={() => openThemeModal(pi)} />
                            </Box>
                            <div className="photo-page">
                                {tmpl.slots.map((idx) => (
                                    <div
                                        key={idx}
                                        className={`photo-slot slot${idx + 1}`}
                                        data-index={idx}
                                        onMouseDown={(e) => startDrag(idx, e)}
                                        onTouchStart={(e) => startDrag(idx, e)}
                                    >
                                        {slots[idx] && <img src={slots[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
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
                <TemplateModal templates={pageTemplates} onSelect={(id) => pickTemplate(templateModalPage, id)} onClose={() => setShowTemplateModal(false)} />
            )}
            {showThemeModal && (
                <ThemeModal pageIdx={themeModalPage} onSelect={pickTheme} onClose={() => setShowThemeModal(false)} />
            )}
        </>
    );
}
