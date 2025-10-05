// src/components/TextEditor.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "grommet";

// Base typography fallback for all rich-text editors
const DEFAULT_STYLE = {
    fontFamily: "Inter, system-ui, Helvetica, Arial, sans-serif",
    fontSize: "18px",
    color: "#1F2933",
    lineHeight: "1.45",
};

// Remove hidden bidi control characters that can flip order
const stripBidi = (s) =>
    s.replace(/[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g, "");

export default function TextEditor({
    value = "",
    onChange,
    placeholder = "Write something...",
    baseStyle = {},
}) {
    const ref = useRef(null);
    const [focusCaret, setFocusCaret] = useState(false);

    const appliedStyle = { ...DEFAULT_STYLE, ...baseStyle };

    // keep DOM in sync with external value
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const next = stripBidi(value || "");
        if (el.innerHTML !== next) {
            const sel = document.getSelection();
            const wasInside = sel && sel.rangeCount > 0 && el.contains(sel.anchorNode);
            el.innerHTML = next;
            if (wasInside && sel && sel.rangeCount) setFocusCaret(true);
        }
    }, [value]);

    useEffect(() => {
        if (!focusCaret) return;
        setFocusCaret(false);
        const el = ref.current;
        if (!el) return;
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }, [focusCaret]);

    const emit = useCallback(() => {
        if (!ref.current) return;
        onChange?.(stripBidi(ref.current.innerHTML || ""));
    }, [onChange]);

    // sanitized plain-text paste
    const onPaste = useCallback(
        (e) => {
            e.preventDefault();
            const clipboard = e.clipboardData || window.clipboardData;
            const text = stripBidi(clipboard?.getData("text") || "");
            document.execCommand("insertText", false, text);
            emit();
        },
        [emit],
    );

    const contentStyle = {
        outline: "none",
        direction: "ltr",
        unicodeBidi: "isolate",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        minHeight: "100%",
        width: "100%",
        flex: "1 1 auto",
        ...appliedStyle,
    };

    return (
        <Box className="text-editor" pad="none" fill>
            <Box
                className="text-editor-surface"
                fill
                round="small"
                pad={{ horizontal: "medium", vertical: "small" }}
                background="rgba(255, 255, 255, 0.96)"
                border={{ color: "rgba(15, 23, 42, 0.08)" }}
                style={{
                    boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.08)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    overflowY: "auto",
                    height: "100%",
                }}
            >
                <div
                    ref={ref}
                    contentEditable
                    suppressContentEditableWarning
                    className="te-content"
                    dir="ltr"
                    data-placeholder={placeholder}
                    style={contentStyle}
                    onInput={emit}
                    onPaste={onPaste}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    spellCheck
                />
            </Box>
        </Box>
    );
}
