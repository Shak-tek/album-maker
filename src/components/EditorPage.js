// src/components/EditorPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Box, Button } from 'grommet';
import { Template as TemplateIcon } from 'grommet-icons';
import TemplateModal from './TemplateModal';
import { pageTemplates } from '../templates/pageTemplates';
import './EditorPage.css';

export default function EditorPage({ images: incomingImages }) {
    const [slots, setSlots] = useState([]);
    const [pageSettings, setPageSettings] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [modalPage, setModalPage] = useState(null);

    // — refs for drag preview
    const previewRef = useRef();
    const previewImgRef = useRef();
    const dragging = useRef(false);
    const draggedIndex = useRef(null);

    // — initialize slots & settings
    useEffect(() => {
        const savedSlots = JSON.parse(localStorage.getItem('editorSlots') || 'null');
        const imgs = Array.isArray(savedSlots) && savedSlots.length
            ? savedSlots
            : incomingImages.slice();

        const savedSettings = JSON.parse(localStorage.getItem('pageSettings') || 'null');
        // build a default settings array:
        const defaultSettings = imgs.map((_, i) => {
            // force the “one-up” template on pages 0 and 1:
            if (i === 0 || i === 1) {
                return { templateId: 3 };
            }
            // otherwise pick any template at random:
            const rnd = Math.floor(Math.random() * pageTemplates.length);
            return { templateId: pageTemplates[rnd].id };
        });
        const settings = Array.isArray(savedSettings) && savedSettings.length
            ? savedSettings
            : defaultSettings;

        setSlots(imgs);
        setPageSettings(settings);
    }, [incomingImages]);

    // — persist when slots or settings change
    useEffect(() => {
        localStorage.setItem('editorSlots', JSON.stringify(slots));
    }, [slots]);

    useEffect(() => {
        localStorage.setItem('pageSettings', JSON.stringify(pageSettings));
    }, [pageSettings]);

    // — drag utilities
    const getTouchCoords = e => {
        if (e.touches?.length) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const startDrag = (idx, e) => {
        e.stopPropagation();
        if (!slots[idx]) return;
        dragging.current = true;
        draggedIndex.current = idx;
        previewImgRef.current.src = slots[idx];
        previewRef.current.style.display = 'block';
        movePreview(e);
        document.addEventListener('mousemove', movePreview);
        document.addEventListener('mouseup', handleDrop);
        document.addEventListener('touchmove', movePreview, { passive: false });
        document.addEventListener('touchend', handleDrop);
    };

    const movePreview = e => {
        if (!dragging.current) return;
        const { x, y } = getTouchCoords(e);
        previewRef.current.style.left = `${x}px`;
        previewRef.current.style.top = `${y}px`;
        document.querySelectorAll('.photo-slot.highlight').forEach(el => el.classList.remove('highlight'));
        const over = document.elementFromPoint(x, y)?.closest('.photo-slot');
        if (over) over.classList.add('highlight');
        if (e.cancelable) e.preventDefault();
    };

    const handleDrop = e => {
        if (!dragging.current) return;
        const { x, y } = getTouchCoords(e);
        const over = document.elementFromPoint(x, y)?.closest('.photo-slot');
        if (over && over.dataset.index != null) {
            const tgt = Number(over.dataset.index);
            const src = draggedIndex.current;
            if (src !== tgt) {
                setSlots(arr => {
                    const next = [...arr];
                    [next[src], next[tgt]] = [next[tgt], next[src]];
                    return next;
                });
            }
        }
        endDrag();
    };

    const endDrag = () => {
        dragging.current = false;
        previewRef.current.style.display = 'none';
        document.querySelectorAll('.photo-slot.highlight').forEach(el => el.classList.remove('highlight'));
        document.removeEventListener('mousemove', movePreview);
        document.removeEventListener('mouseup', handleDrop);
        document.removeEventListener('touchmove', movePreview);
        document.removeEventListener('touchend', handleDrop);
    };

    // — template modal handlers
    const openTemplateModal = pageIdx => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setModalPage(pageIdx);
        setShowTemplateModal(true);
    };
    const pickTemplate = (pageIdx, tmplId) => {
        setPageSettings(ps => ps.map((s, i) =>
            i === pageIdx ? { ...s, templateId: tmplId } : s
        ));
        setShowTemplateModal(false);
    };

    return (
        <>
            <div className="container">
                {pageSettings.map((setting, pageIdx) => {
                    // look up the chosen template
                    const tmpl = pageTemplates.find(t => t.id === setting.templateId);
                    // **always** use tmpl.slots here:
                    const indices = tmpl.slots;

                    return (
                        <div key={pageIdx} className="page-wrapper">
                            {/* per‑page toolbar */}
                            <Box className="toolbar" direction="row" gap="small" align="center">
                                <Button
                                    icon={<TemplateIcon />}
                                    tip="Change layout"
                                    onClick={() => openTemplateModal(pageIdx)}
                                />
                            </Box>

                            {/* photo canvas */}
                            <div className="photo-page">
                                {indices.map(idx => (
                                    <div
                                        key={idx}
                                        className={`photo-slot slot${idx + 1}`}
                                        data-index={idx}
                                        onMouseDown={e => startDrag(idx, e)}
                                        onTouchStart={e => startDrag(idx, e)}
                                    >
                                        {slots[idx] && <img src={slots[idx]} alt="" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* drag preview */}
            <div id="drag-preview" ref={previewRef}>
                <img ref={previewImgRef} alt="" />
            </div>

            {/* template picker */}
            {showTemplateModal && (
                <TemplateModal
                    templates={pageTemplates}
                    onSelect={id => pickTemplate(modalPage, id)}
                    onClose={() => setShowTemplateModal(false)}
                />
            )}
        </>
    );
}
