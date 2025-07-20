import React, { useRef } from 'react';
import { Box, Button } from 'grommet';
import { Add } from 'grommet-icons';

export default function SettingsBar({
  borderColor,
  setBorderColor,
  borderEnabled,
  setBorderEnabled,
  backgroundEnabled,
  setBackgroundEnabled,
  onAddImages,
  onOpenThemeModal,
  onSave,
}) {
  const fileRef = useRef();

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      const urls = files.map(f => URL.createObjectURL(f));
      onAddImages(urls);
      e.target.value = '';
    }
  };

  return (
    <Box className="settings-bar" direction="row" gap="small" pad="small" background="light-1" elevation="medium" align="center">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      <Button icon={<Add />} label="Add Pictures" onClick={() => fileRef.current && fileRef.current.click()} />
      <Box direction="row" align="center" gap="xsmall">
        <Button label={backgroundEnabled ? 'Remove Background' : 'Show Background'} onClick={() => setBackgroundEnabled(!backgroundEnabled)} />
        {onOpenThemeModal && (
          <Button label="Change Theme" onClick={onOpenThemeModal} />
        )}
        {onSave && (
          <Button primary label="Save" onClick={onSave} />
        )}
      </Box>
    </Box>
  );
}
