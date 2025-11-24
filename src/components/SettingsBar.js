// src/components/SettingsBar.js
import React, { useRef, useState } from 'react';
import { Box, Button, FileInput, CheckBox, Layer, Text } from 'grommet';
//import { Edit } from 'grommet-icons';

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
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);

  const emitSelectedFiles = (list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    if (typeof onAddImages === 'function') {
      onAddImages(list);
    }
  };

  const openUploadModal = () => setUploadModalOpen(true);
  const closeUploadModal = () => setUploadModalOpen(false);

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
    if (selected.length) {
      emitSelectedFiles(selected);
      closeUploadModal();
    }
    if (event?.target) {
      event.target.value = '';
    }
  };
  // Icons (inline SVG OK)
  const BackgroundIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
  );
  const PhotosIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#585858" fillRule="evenodd" d="M17.206 5c2.362 0 3.219.246 4.083.708a4.8 4.8 0 0 1 2.003 2.003c.462.864.708 1.72.708 4.083v4.412c0 2.362-.246 3.219-.708 4.083a4.8 4.8 0 0 1-2.003 2.003c-.864.462-1.72.708-4.083.708h-6.412c-2.362 0-3.219-.246-4.083-.708a4.8 4.8 0 0 1-2.003-2.003C4.246 19.425 4 18.569 4 16.206v-4.412c0-2.362.246-3.219.708-4.083A4.8 4.8 0 0 1 6.71 5.708C7.575 5.246 8.431 5 10.794 5zm1.077 8.166-4.51 4.51-.829.836.442-1.216-.566-.575-1.293-1.292-4.578 4.578q.32.328.74.552c.505.27 1.008.422 2.291.44l.25.001h7.54c1.47 0 2.004-.153 2.542-.44s.96-.71 1.247-1.248c.27-.506.422-1.009.44-2.292v-.139zM17.77 7h-7.54c-1.47 0-2.004.153-2.542.44s-.96.71-1.247 1.248c-.27.506-.423 1.009-.44 2.292L6 11.23v5.54c0 .545.021 .961 .062 1.297l4.334-4.335a1.6 1.6 0 0 1 2.263 0q.581 .589 .823 .842 .021 .021 -.54 1.02l-.09 .159 .922-.906 3.378-3.378a1.6 1.6 0 0 1 2.148-.104l.115 .104 2.25 2.25q.168 .168 .335 .308V11.23c0-1.47-.153-2.004-.44-2.542a3 3 0 0 0-1.248-1.247c-.506-.27-1.009-.423-2.292-.44z" clipRule="evenodd" />
    </svg>
  );
  const ThemeIcon = () => (

    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><circle cx="12" cy="12" r="10"></circle></svg>
  );
  const SavingIcon = () => (
    <svg viewBox="0 0 100 100" width="20" height="20" aria-hidden="true">
      <path d="M83.996,7h-3.385H41.96H12.201C9.333,7,7,9.333,7,12.201v75.6C7,90.667,9.333,93,12.201,93H15.4h69.061h3.34
      C90.668,93,93,90.667,93,87.801V16.005L83.996,7z M78.611,9v15.802c0,1.764-1.436,3.198-3.199,3.198h-29.25
      c-1.766,0-3.202-1.435-3.202-3.198V9H78.611z M17.4,91V45.749c0-1.764,1.437-3.199,3.201-3.199h58.66
      c1.764,0,3.199,1.435,3.199,3.199V91H17.4z" />
    </svg>
  );
  const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m3 15 4-8 4 8"></path><path d="M4 13h6"></path><path d="M15 12h5"></path><path d="M17.5 12v6"></path><path d="M20 18h-5"></path></svg>
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
        
        elevation="medium"
      align="center"
      wrap
    >
      {/* Photos */}
      
      <Button
        icon={<PhotosIcon />}
        label="Upload Photos"
        className="btn-setting btnUpload"
        onClick={openUploadModal}
      />

      {/* Background toggle */}
      <Box direction="row" align="center" gap="xsmall" className="btn-setting btn-setting-checkbox">
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
          <Button icon={<EditIcon />} label="Change Title" onClick={onEditTitle}  className="btn-setting" />
        )}
        {onSave && (
           <Button  className="btn-setting btn-continue" icon={<SavingIcon />} label="Continue" onClick={onSave} />
        )}
      </Box>

      {/* All editor options live here */}
      {isUploadModalOpen && (
        <Layer onEsc={closeUploadModal} onClickOutside={closeUploadModal}>
          <Box pad="medium" gap="medium" width="medium">
            <Box direction="row" justify="between" align="center">
              <Box direction="row" align="center" gap="small">
                <PhotosIcon />
                <Text weight="bold">Upload Photos</Text>
              </Box>
              <Button label="Close" onClick={closeUploadModal} />
            </Box>
            <FileInput
              multiple
              name="images"
              accept="image/*"
              onChange={handleFileInputChange}
            />
          </Box>
        </Layer>
      )}
    </>
  );
}
