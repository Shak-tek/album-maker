// src/components/EditorPage.js
import React, { useState, useEffect, useRef } from 'react';
import './EditorPage.css';

const TEMPLATE_SLOTS = [
    // page 1
    [0, 1, 2],
    // page 2
    [3, 4],
    // page 3
    [5, 6, 7, 8],
    // page 4
    [9],
];

export default function EditorPage({ images }) {
    const [slots, setSlots] = useState(Array(10).fill(null));
    const previewRef = useRef();
    const previewImgRef = useRef();
    const dragging = useRef(false);
    const draggedIndex = useRef(null);

    useEffect(() => {
        const filled = images.slice(0, 10);
        setSlots([
            ...filled,
            ...Array(10 - filled.length).fill(null)
        ]);
    }, [images]);

    const getTouchCoords = e => {
        if (e.touches?.length) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const startDrag = (idx, e) => {
        e.stopPropagation();
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

        document.querySelectorAll('.photo-slot.highlight')
            .forEach(el => el.classList.remove('highlight'));

        const over = document.elementFromPoint(x, y)?.closest('.photo-slot');
        if (over) over.classList.add('highlight');
        if (e.cancelable) e.preventDefault();
    };

    const handleDrop = e => {
        if (!dragging.current) return;
        const { x, y } = getTouchCoords(e);
        const over = document.elementFromPoint(x, y)?.closest('.photo-slot');
        if (over && over.dataset.index != null) {
            const target = parseInt(over.dataset.index, 10);
            const from = draggedIndex.current;
            if (from !== target) {
                setSlots(s => {
                    const next = [...s];
                    [next[from], next[target]] = [next[target], next[from]];
                    return next;
                });
            }
        }
        endDrag();
    };

    const endDrag = () => {
        dragging.current = false;
        draggedIndex.current = null;
        previewRef.current.style.display = 'none';
        document.querySelectorAll('.photo-slot.highlight')
            .forEach(el => el.classList.remove('highlight'));

        document.removeEventListener('mousemove', movePreview);
        document.removeEventListener('mouseup', handleDrop);
        document.removeEventListener('touchmove', movePreview);
        document.removeEventListener('touchend', handleDrop);
    };

    // group pages into rows of 2
    const pageRows = [];
    for (let i = 0; i < TEMPLATE_SLOTS.length; i += 2) {
        pageRows.push(TEMPLATE_SLOTS.slice(i, i + 2));
    }

    return (
        <>
            <div className="container">
                {pageRows.map((pages, rowIdx) => (
                    <div className="row" key={rowIdx}>
                        {pages.map((slotIndices, pi) => (
                            <div className="photo-page" key={rowIdx * 2 + pi}>
                                {slotIndices.map(idx => (
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
                        ))}
                    </div>
                ))}
            </div>

            <div id="drag-preview" ref={previewRef}>
                <img ref={previewImgRef} alt="" />
            </div>
        </>
    );
}
