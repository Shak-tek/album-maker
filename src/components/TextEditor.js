// src/components/TextEditor.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Box } from "grommet";


// Remove hidden bidi control characters that can flip order
const stripBidi = (s) =>
  s.replace(/[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g, "");

export default function TextEditor({
  value = "",
  onChange,
}) {
  const ref = useRef(null);
  const [focusCaret, setFocusCaret] = useState(false);

  // keep DOM in sync with external value
  useEffect(() => {
    if (!ref.current) return;
    const next = stripBidi(value || "");
    if (ref.current.innerHTML !== next) {
      const sel = document.getSelection();
      const wasFocused = document.activeElement === ref.current;
      ref.current.innerHTML = next;
      if (wasFocused && sel && sel.rangeCount) setFocusCaret(true);
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
    onChange?.(stripBidi(ref.current?.innerHTML || ""));
  }, [onChange]);

  // sanitized plain-text paste
  const onPaste = useCallback((e) => {
    e.preventDefault();
    const t = stripBidi((e.clipboardData || window.clipboardData).getData("text") || "");
    document.execCommand("insertText", false, t);
    emit();
  }, [emit]);

  return (
    <Box className="text-editor" gap="xsmall">
      {/* Editable surface: LTR locked */}
      <Box
        round="xsmall"
        border={{ color: "light-4" }}
        background="white"
        pad="small"
        style={{ minHeight: 140, maxHeight: 320, overflowY: "auto" }}
      >
        <div
          ref={ref}
          contentEditable
          className="te-content"
          // hard-lock LTR writing order
          dir="ltr"
          style={{ outline: "none", direction: "ltr", unicodeBidi: "isolate" }}
          dangerouslySetInnerHTML={{ __html: stripBidi(value || "") }}
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
