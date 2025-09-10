import React, { useRef, useEffect } from 'react';
import { Box, Button } from 'grommet';

const fonts = ['Arial', 'Times New Roman', 'Courier New'];
const sizes = [1, 2, 3, 4, 5, 6, 7];

export default function TextEditor({ value, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd, arg) => {
    document.execCommand(cmd, false, arg);
    ref.current && ref.current.focus();
  };

  return (
    <Box fill className="text-editor-container">
      <Box direction="row" gap="xsmall" className="text-editor-toolbar">
        <select onChange={(e) => exec('fontName', e.target.value)}>
          {fonts.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select onChange={(e) => exec('fontSize', e.target.value)}>
          {sizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Button size="small" label="B" onClick={() => exec('bold')} />
        <Button size="small" label="I" onClick={() => exec('italic')} />
        <Button size="small" label="U" onClick={() => exec('underline')} />
      </Box>
      <Box
        flex
        as="div"
        className="text-editor-content"
        contentEditable
        ref={ref}
        onInput={() => onChange(ref.current.innerHTML)}
      />
    </Box>
  );
}

