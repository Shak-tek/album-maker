// src/components/TextEditor.jsx
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Box,
    Button,
    Heading,
    Layer,
    Select,
    Text,
    TextInput,
    Tip,
} from "grommet";
import {
    Bold,
    ClearOption,
    Italic,
    TextAlignCenter,
    TextAlignLeft,
    TextAlignRight,
    Underline,
} from "grommet-icons";

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

const mergeRefs = (...refs) => (node) => {
    refs.forEach((ref) => {
        if (!ref) return;
        if (typeof ref === "function") {
            ref(node);
        } else {
            // eslint-disable-next-line no-param-reassign
            ref.current = node;
        }
    });
};

const noop = () => {};

const DEFAULT_FONTS = [
    "Inter, system-ui, Helvetica, Arial, sans-serif",
    "Roboto, system-ui, Helvetica, Arial, sans-serif",
    "Helvetica, Arial, sans-serif",
    "Georgia, serif",
    "\"Times New Roman\", Times, serif",
    "\"Courier New\", Courier, monospace",
];

const buildSizeOptions = () => {
    const arr = [];
    for (let px = 10; px <= 72; px += 2) arr.push(`${px}px`);
    return arr;
};

const COLOR_OPTIONS = [
    { name: "Black", value: "#000000" },
    { name: "Dark Grey", value: "#333333" },
    { name: "Grey", value: "#777777" },
    { name: "White", value: "#FFFFFF" },
    { name: "Red", value: "#E53935" },
    { name: "Orange", value: "#FB8C00" },
    { name: "Yellow", value: "#FDD835" },
    { name: "Green", value: "#43A047" },
    { name: "Blue", value: "#1E88E5" },
    { name: "Indigo", value: "#3949AB" },
    { name: "Purple", value: "#8E24AA" },
];

const applySelectionChange = (savedRangeRef, editableRef) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const editable = editableRef.current;
    if (!editable || !editable.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
};

const restoreSelection = (savedRangeRef, editableRef) => {
    if (!savedRangeRef.current) return false;
    const editable = editableRef.current;
    if (!editable) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(savedRangeRef.current);
    if (editable.focus) editable.focus();
    return true;
};

const execCommand = (cmd, value, savedRangeRef, editableRef) => {
    const restored = restoreSelection(savedRangeRef, editableRef);
    if (!restored) return false;
    document.execCommand(cmd, false, value);
    applySelectionChange(savedRangeRef, editableRef);
    return true;
};

const wrapSelectionWithSpan = (styleString, savedRangeRef, editableRef) => {
    const restored = restoreSelection(savedRangeRef, editableRef);
    if (!restored) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return false;
    const frag = range.cloneContents();
    const div = document.createElement("div");
    div.appendChild(frag);
    const html = div.innerHTML || range.toString();
    document.execCommand("insertHTML", false, `<span style="${styleString}">${html}</span>`);
    applySelectionChange(savedRangeRef, editableRef);
    return true;
};

const applyTextSettings = (setter = noop, patch) => {
    if (typeof setter !== "function") return;
    const updater = typeof patch === "function" ? patch : () => patch;
    setter((prev) => {
        const safePrev = prev && typeof prev === "object" ? prev : {};
        const nextPatch = updater(safePrev) || {};
        return { ...safePrev, ...nextPatch };
    });
};

const focusEditableEnd = (editable) => {
    if (!editable) return;
    const range = document.createRange();
    range.selectNodeContents(editable);
    range.collapse(false);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
    if (editable.focus) editable.focus();
};

const TextEditor = forwardRef(function TextEditor(
    {
        value = "",
        onChange,
        placeholder = "Write something...",
        baseStyle = {},
        readOnly = false,
        className,
        ...rest
    },
    forwardedRef,
) {
    const ref = useRef(null);
    const [focusCaret, setFocusCaret] = useState(false);

    const appliedStyle = { ...DEFAULT_STYLE, ...baseStyle };

    // keep DOM in sync with external value
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const next = stripBidi(value || "");
        if (el.innerHTML !== next) {
            let shouldRestore = false;
            let sel = null;
            if (!readOnly) {
                sel = document.getSelection();
                shouldRestore = sel && sel.rangeCount > 0 && el.contains(sel.anchorNode);
            }
            el.innerHTML = next;
            if (!readOnly && shouldRestore && sel && sel.rangeCount) setFocusCaret(true);
        }
    }, [value, readOnly]);

    useEffect(() => {
        if (readOnly) return;
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
    }, [focusCaret, readOnly]);

    const emit = useCallback(() => {
        if (readOnly) return;
        if (!ref.current) return;
        onChange?.(stripBidi(ref.current.innerHTML || ""));
    }, [onChange, readOnly]);

    // sanitized plain-text paste
    const onPaste = useCallback(
        (e) => {
            if (readOnly) return;
            e.preventDefault();
            const clipboard = e.clipboardData || window.clipboardData;
            const text = stripBidi(clipboard?.getData("text") || "");
            document.execCommand("insertText", false, text);
            emit();
        },
        [emit, readOnly],
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

    const classes = ["text-editor"];
    if (className) classes.push(className);

    const handlers = {
        onMouseDown: (e) => {
            if (!readOnly) e.stopPropagation();
        },
        onClick: (e) => {
            if (!readOnly) e.stopPropagation();
        },
    };

    return (
        <Box className={classes.join(" ")} pad="none" fill {...rest}>
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
                    ref={mergeRefs(ref, forwardedRef)}
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    className="te-content"
                    dir="ltr"
                    data-placeholder={placeholder}
                    style={contentStyle}
                    onInput={readOnly ? undefined : emit}
                    onPaste={readOnly ? undefined : onPaste}
                    {...handlers}
                    spellCheck={!readOnly}
                />
            </Box>
        </Box>
    );
});

export default TextEditor;

export function TextEditorModal({
    open,
    value = "",
    onChange,
    onClose,
    textSettings,
    onChangeTextSettings,
    placeholder = "Write something...",
    baseStyle = {},
    title = "Text Tools",
}) {
    const editorRef = useRef(null);
    const savedRange = useRef(null);
    const fonts = useMemo(() => DEFAULT_FONTS, []);
    const sizeOptions = useMemo(() => buildSizeOptions(), []);
    const [hex, setHex] = useState(textSettings?.color || "#000000");

    useEffect(() => {
        setHex(textSettings?.color || "#000000");
    }, [textSettings?.color]);

    useEffect(() => {
        if (!open) {
            savedRange.current = null;
            return undefined;
        }
        const handler = () => applySelectionChange(savedRange, editorRef);
        document.addEventListener("selectionchange", handler);
        return () => document.removeEventListener("selectionchange", handler);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            if (!editorRef.current) return;
            focusEditableEnd(editorRef.current);
            applySelectionChange(savedRange, editorRef);
        }, 60);
        return () => clearTimeout(timer);
    }, [open]);

    const emitChange = useCallback(() => {
        if (!editorRef.current || typeof onChange !== "function") return;
        onChange(stripBidi(editorRef.current.innerHTML || ""));
    }, [onChange]);

    const handleExec = useCallback(
        (command, arg = null) => {
            if (!editorRef.current) return;
            const ok = execCommand(command, arg, savedRange, editorRef);
            if (ok) emitChange();
        },
        [emitChange],
    );

    const handleWrapSelection = useCallback(
        (styleString) => {
            if (!editorRef.current) return false;
            const applied = wrapSelectionWithSpan(styleString, savedRange, editorRef);
            if (applied) emitChange();
            return applied;
        },
        [emitChange],
    );

    if (!open) return null;

    return (
        <Layer
            onEsc={onClose}
            onClickOutside={onClose}
            responsive
            modal
        >
            <Box pad="medium" gap="medium" width="large">
                <Heading level={4} margin="none">
                    {title}
                </Heading>

                <Box height={{ min: "medium" }} style={{ maxHeight: "40vh" }}>
                    <TextEditor
                        ref={editorRef}
                        value={value}
                        onChange={(html) => {
                            onChange?.(html);
                        }}
                        placeholder={placeholder}
                        baseStyle={baseStyle}
                    />
                </Box>

                <Box direction="row" gap="xsmall" align="center" wrap>
                    <Tip content="Bold">
                        <Button onClick={() => handleExec("bold")} icon={<Bold />} />
                    </Tip>
                    <Tip content="Italic">
                        <Button onClick={() => handleExec("italic")} icon={<Italic />} />
                    </Tip>
                    <Tip content="Underline">
                        <Button onClick={() => handleExec("underline")} icon={<Underline />} />
                    </Tip>

                    <Box width="1px" height="24px" background="light-4" margin={{ horizontal: "small" }} />

                    <Tip content="Align left">
                        <Button onClick={() => handleExec("justifyLeft")} icon={<TextAlignLeft />} />
                    </Tip>
                    <Tip content="Align center">
                        <Button onClick={() => handleExec("justifyCenter")} icon={<TextAlignCenter />} />
                    </Tip>
                    <Tip content="Align right">
                        <Button onClick={() => handleExec("justifyRight")} icon={<TextAlignRight />} />
                    </Tip>

                    <Box width="1px" height="24px" background="light-4" margin={{ horizontal: "small" }} />

                    <Tip content="Clear formatting">
                        <Button
                            onClick={() => {
                                handleExec("removeFormat");
                                handleExec("unlink");
                            }}
                            icon={<ClearOption />}
                        />
                    </Tip>
                </Box>

                <Box direction="row" gap="medium" wrap>
                    <Box gap="xsmall" width="medium">
                        <Text size="small" weight="bold">
                            Font
                        </Text>
                        <Select
                            options={fonts}
                            value={textSettings?.fontFamily || fonts[0]}
                            onChange={({ option }) => {
                                const applied = handleWrapSelection(`font-family:${option}`);
                                if (!applied) {
                                    applyTextSettings(onChangeTextSettings, { fontFamily: option });
                                }
                            }}
                        >
                            {(option) => (
                                <Box pad="xsmall">
                                    <Text style={{ fontFamily: option }}>
                                        {option.split(",")[0].replaceAll("\"", "")}
                                    </Text>
                                </Box>
                            )}
                        </Select>
                    </Box>

                    <Box gap="xsmall" width="small">
                        <Text size="small" weight="bold">
                            Size
                        </Text>
                        <Select
                            options={sizeOptions}
                            value={textSettings?.fontSize || "32px"}
                            onChange={({ option }) => {
                                const applied = handleWrapSelection(`font-size:${option}`);
                                if (!applied) {
                                    applyTextSettings(onChangeTextSettings, { fontSize: option });
                                }
                            }}
                        />
                    </Box>
                </Box>

                <Box direction="row" gap="medium" align="end" wrap>
                    <Box gap="xsmall" width="medium">
                        <Text size="small" weight="bold">
                            Color
                        </Text>
                        <Select
                            options={COLOR_OPTIONS}
                            labelKey="name"
                            valueKey={{ key: "value", reduce: true }}
                            value={textSettings?.color || "#000000"}
                            onChange={({ option }) => {
                                const applied = handleWrapSelection(`color:${option.value}`);
                                setHex(option.value);
                                if (!applied) {
                                    applyTextSettings(onChangeTextSettings, { color: option.value });
                                }
                            }}
                        >
                            {(option) => (
                                <Box direction="row" gap="small" pad="xsmall" align="center">
                                    <Box
                                        width="16px"
                                        height="16px"
                                        round
                                        background={option.value}
                                        border={{ color: "light-4" }}
                                    />
                                    <Text>{option.name}</Text>
                                </Box>
                            )}
                        </Select>
                    </Box>

                    <Box gap="xsmall" width="small">
                        <Text size="small" weight="bold">
                            Hex
                        </Text>
                        <TextInput
                            placeholder="#RRGGBB"
                            value={hex}
                            onChange={(e) => setHex(e.target.value.trim())}
                            onBlur={() => {
                                const normalized = /^#?[0-9a-fA-F]{6}$/.test(hex.replace("#", ""))
                                    ? (hex.startsWith("#") ? hex : `#${hex}`)
                                    : "#000000";
                                setHex(normalized);
                                const applied = handleWrapSelection(`color:${normalized}`);
                                if (!applied) {
                                    applyTextSettings(onChangeTextSettings, { color: normalized });
                                }
                            }}
                        />
                    </Box>
                </Box>

                <Box direction="row" justify="end">
                    <Button label="Close" onClick={onClose} />
                </Box>
            </Box>
        </Layer>
    );
}
