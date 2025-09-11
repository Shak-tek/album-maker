// src/components/TextEditor.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";

const FONT_SIZES = ["12px", "14px", "16px", "20px", "24px", "32px"];
const FONT_FAMILIES = [
  "inherit",
  "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  "Georgia, 'Times New Roman', Times, serif",
  "'Courier New', Courier, monospace",
];

export default function TextEditor({
  value = "",
  onChange,
  defaultDir = "ltr", // force left-to-right by default
}) {
  const ref = useRef(null);
  const [dir, setDir] = useState(defaultDir);  // "ltr" | "rtl"
  const [focusCaret, setFocusCaret] = useState(false);

  // Keep DOM in sync with external value without fighting typing
  useEffect(() => {
    if (!ref.current) return;
    const next = value || "";
    if (ref.current.innerHTML !== next) {
      // preserve scroll/caret best-effort
      const sel = document.getSelection();
      const wasFocused = document.activeElement === ref.current;
      ref.current.innerHTML = next;
      if (wasFocused && sel && sel.rangeCount) setFocusCaret(true);
    }
  }, [value]);

  useEffect(() => {
    if (!focusCaret) return;
    setFocusCaret(false);
    // place caret at end after external updates while focused
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
    onChange?.(ref.current?.innerHTML || "");
  }, [onChange]);

  // Simple wrappers for inline styles (font-size/family) using insertHTML
  const wrapSelectionWithSpan = useCallback((styleString) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return; // only act when there's a selection
    const frag = range.cloneContents();
    const div = document.createElement("div");
    div.appendChild(frag);
    const html = div.innerHTML || range.toString();
    const wrapped = `<span style="${styleString}">${html}</span>`;
    document.execCommand("insertHTML", false, wrapped);
    emit();
    ref.current?.focus();
  }, [emit]);

  const cmd = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    emit();
    ref.current?.focus();
  }, [emit]);

  const setFontSize = (px) => wrapSelectionWithSpan(`font-size:${px}`);
  const setFontFamily = (family) => wrapSelectionWithSpan(`font-family:${family}`);

  return (
    <div className="text-editor">
      {/* Toolbar */}
      <div className="te-toolbar" role="toolbar" aria-label="text editor toolbar">
        {/* Font family */}
        <select
          className="te-select"
          title="Font family"
          onChange={(e) => setFontFamily(e.target.value)}
          defaultValue="inherit"
        >
          {FONT_FAMILIES.map((f, i) => (
            <option key={i} value={f}>{f.split(",")[0].replace(/['"]/g, "")}</option>
          ))}
        </select>

        {/* Font size */}
        <select
          className="te-select"
          title="Font size"
          onChange={(e) => setFontSize(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button type="button" className="te-btn" title="Bold" onClick={() => cmd("bold")}><b>B</b></button>
        <button type="button" className="te-btn" title="Italic" onClick={() => cmd("italic")}><i>I</i></button>
        <button type="button" className="te-btn" title="Underline" onClick={() => cmd("underline")}><u>U</u></button>

        <span className="te-sep" />

        <button type="button" className="te-btn" title="Align left" onClick={() => cmd("justifyLeft")}>⟸</button>
        <button type="button" className="te-btn" title="Align center" onClick={() => cmd("justifyCenter")}>↔</button>
        <button type="button" className="te-btn" title="Align right" onClick={() => cmd("justifyRight")}>⟹</button>

        <span className="te-sep" />

        {/* Direction toggle */}
        <button
          type="button"
          className={`te-btn ${dir === "ltr" ? "te-active" : ""}`}
          title="Left-to-right"
          onClick={() => setDir("ltr")}
        >
          LTR
        </button>
        <button
          type="button"
          className={`te-btn ${dir === "rtl" ? "te-active" : ""}`}
          title="Right-to-left"
          onClick={() => setDir("rtl")}
        >
          RTL
        </button>

        <span className="te-sep" />

        <button type="button" className="te-btn" title="Clear formatting"
          onClick={() => { cmd("removeFormat"); cmd("unlink"); }}>
          Clear
        </button>
      </div>

      {/* Editable surface */}
      <div
        ref={ref}
        className="te-content"
        contentEditable
        dir={dir} // ← force direction (fixes accidental RTL)
        // IMPORTANT: no children when using dangerouslySetInnerHTML
        dangerouslySetInnerHTML={{ __html: value || "" }}
        onInput={emit}
        // Keep the caret inside on click
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        spellCheck={true}
      />
    </div>
  );
}
