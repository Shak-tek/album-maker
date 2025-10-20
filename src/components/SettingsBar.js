// src/components/SettingsBar.js
import React, { useRef } from 'react';
import { Box, Button, FileInput, CheckBox } from 'grommet';
import { Edit } from 'grommet-icons';

export default function SettingsBar({
  backgroundEnabled,
  setBackgroundEnabled,
  onAddImages,
  onOpenThemeModal,
  onSave,
  onEditTitle,
  fileInputRef,
}) {
  const internalUploadInputRef = useRef(null);
  const uploadInputRef = fileInputRef || internalUploadInputRef;

  const emitSelectedFiles = (list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    if (typeof onAddImages === 'function') {
      onAddImages(list);
    }
  };

  const handleHiddenInputChange = (event) => {
    const selected = Array.from(event?.target?.files || []);
    if (selected.length) emitSelectedFiles(selected);
    if (event?.target) {
      event.target.value = '';
    }
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (event, data) => {
    const selected = data?.files ? Array.from(data.files) : Array.from(event?.target?.files || []);
    if (selected.length) emitSelectedFiles(selected);
    if (event?.target) {
      event.target.value = '';
    }
  };
  // Icons (inline SVG OK)
  const BackgroundIcon = () => (
    <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
      <rect width="256" height="256" fill="none" />
      <path d="M80,56V48A16,16,0,0,1,96,32h8a8,8,0,0,1,0,16H96v8a8,8,0,0,1-16,0Zm64-8h16a8,8,0,0,0,0-16H144a8,8,0,0,0,0,16Zm64-16h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V48A16,16,0,0,0,208,32Zm8,56a8,8,0,0,0-8,8v16a8,8,0,0,0,16,0V96A8,8,0,0,0,216,88Zm-40,8V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V96A16,16,0,0,1,48,80H160A16,16,0,0,1,176,96Zm-16,0H48V208H160Zm56,48a8,8,0,0,0-8,8v8h-8a8,8,0,0,0,0,16h8a16,16,0,0,0,16-16v-8A8,8,0,0,0,216,144Z" fill="#000" />
    </svg>
  );
  const PhotosIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#585858" fillRule="evenodd" d="M17.206 5c2.362 0 3.219.246 4.083.708a4.8 4.8 0 0 1 2.003 2.003c.462.864.708 1.72.708 4.083v4.412c0 2.362-.246 3.219-.708 4.083a4.8 4.8 0 0 1-2.003 2.003c-.864.462-1.72.708-4.083.708h-6.412c-2.362 0-3.219-.246-4.083-.708a4.8 4.8 0 0 1-2.003-2.003C4.246 19.425 4 18.569 4 16.206v-4.412c0-2.362.246-3.219.708-4.083A4.8 4.8 0 0 1 6.71 5.708C7.575 5.246 8.431 5 10.794 5zm1.077 8.166-4.51 4.51-.829.836.442-1.216-.566-.575-1.293-1.292-4.578 4.578q.32.328.74.552c.505.27 1.008.422 2.291.44l.25.001h7.54c1.47 0 2.004-.153 2.542-.44s.96-.71 1.247-1.248c.27-.506.422-1.009.44-2.292v-.139zM17.77 7h-7.54c-1.47 0-2.004.153-2.542.44s-.96.71-1.247 1.248c-.27.506-.423 1.009-.44 2.292L6 11.23v5.54c0 .545.021 .961 .062 1.297l4.334-4.335a1.6 1.6 0 0 1 2.263 0q.581 .589 .823 .842 .021 .021 -.54 1.02l-.09 .159 .922-.906 3.378-3.378a1.6 1.6 0 0 1 2.148-.104l.115 .104 2.25 2.25q.168 .168 .335 .308V11.23c0-1.47-.153-2.004-.44-2.542a3 3 0 0 0-1.248-1.247c-.506-.27-1.009-.423-2.292-.44z" clipRule="evenodd" />
    </svg>
  );
  const ThemeIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#585858" fillRule="evenodd" d="M12 1C5.934 1 1 5.934 1 12s4.934 11 11 11a2.557 2.557 0 0 0 2.563-2.562c0-.7-.26-1.252-.64-1.696a.82.82 0 0 1-.227-.555c0-.447.365-.812.813-.812H16.5c3.59 0 6.5-2.91 6.5-6.5C23 5.365 18.011 1 12 1m0 2c4.961 0 9 3.532 9 7.875 0 2.486-2.014 4.5-4.5 4.5h-1.991a2.814 2.814 0 0 0-2.813 2.813c0 .675.248 1.338.709 1.856a.6.6 0 0 1 .158.393A.557.557 0 0 1 12 21c-4.961 0-9-4.039-9-9s4.039-9 9-9m-1 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m-3 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M14.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m4.5 2.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" clipRule="evenodd" />
    </svg>
  );
  const SavingIcon = () => (
    <svg viewBox="0 0 100 100" width="20" height="20" aria-hidden="true">
      <path d="M83.996,7h-3.385H41.96H12.201C9.333,7,7,9.333,7,12.201v75.6C7,90.667,9.333,93,12.201,93H15.4h69.061h3.34
      C90.668,93,93,90.667,93,87.801V16.005L83.996,7z M78.611,9v15.802c0,1.764-1.436,3.198-3.199,3.198h-29.25
      c-1.766,0-3.202-1.435-3.202-3.198V9H78.611z M17.4,91V45.749c0-1.764,1.437-3.199,3.201-3.199h58.66
      c1.764,0,3.199,1.435,3.199,3.199V91H17.4z" />
    </svg>
  );

  return (
    <>
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleHiddenInputChange}
      />
      <Box
        className="settings-bar"
        direction="row"
        gap="small"
        pad="xsmall"
        background="light-1"
        elevation="medium"
        align="center"
        wrap
      >
        {/* Photos */}
        <Box direction="row" align="center" gap="xsmall" className="btn-setting btnUpload"> 
          <PhotosIcon />
          <FileInput
            multiple
            name="images"
            accept="image/*"
            onChange={handleFileInputChange}
          />
        </Box>

        {/* Background toggle */}
        <Box direction="row" align="center" gap="xsmall" className="btn-setting">
          <BackgroundIcon />
          <CheckBox
            toggle
            checked={backgroundEnabled}
            label={backgroundEnabled ? 'Keep Borders' : 'Remove Borders'}
            onChange={(e) => setBackgroundEnabled(e.target.checked)}
          />
        </Box>

        {/* Theme / Title / Save */}
        {onOpenThemeModal && (
          <Button icon={<ThemeIcon />} label="Change Theme" onClick={onOpenThemeModal}  className="btn-setting" />
        )}
        {onEditTitle && (
          <Button icon={<Edit />} label="Edit Title" onClick={onEditTitle}  className="btn-setting" />
        )}
        {onSave && (
          <Button  className="btn-setting" icon={<SavingIcon />} label="Save" onClick={onSave} />
        )}
      </Box>

      {/* All editor options live here */}
    </>
  );
}
