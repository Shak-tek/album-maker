import React, { useRef } from 'react';
import { Box, Button } from 'grommet';
//import { Add } from 'grommet-icons';

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
      <Button label="Add Pictures" onClick={() => fileRef.current && fileRef.current.click()}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="24" height="24"><path fill="#585858" fill-rule="evenodd" d="M17.206 5c2.362 0 3.219.246 4.083.708a4.8 4.8 0 0 1 2.003 2.003c.462.864.708 1.72.708 4.083v4.412c0 2.362-.246 3.219-.708 4.083a4.8 4.8 0 0 1-2.003 2.003c-.864.462-1.72.708-4.083.708h-6.412c-2.362 0-3.219-.246-4.083-.708a4.8 4.8 0 0 1-2.003-2.003C4.246 19.425 4 18.569 4 16.206v-4.412c0-2.362.246-3.219.708-4.083A4.8 4.8 0 0 1 6.71 5.708C7.575 5.246 8.431 5 10.794 5zm1.077 8.166-4.51 4.51-.829.836.442-1.216-.566-.575-1.293-1.292-4.578 4.578q.32.328.74.552c.505.27 1.008.422 2.291.44l.25.001h7.54c1.47 0 2.004-.153 2.542-.44s.96-.71 1.247-1.248c.27-.506.422-1.009.44-2.292v-.139zM17.77 7h-7.54c-1.47 0-2.004.153-2.542.44s-.96.71-1.247 1.248c-.27.506-.423 1.009-.44 2.292L6 11.23v5.54c0 .545.021.961.062 1.297l4.334-4.335a1.6 1.6 0 0 1 2.263 0q.581.589.823.842.021.021-.54 1.02l-.09.159.922-.906 3.378-3.378a1.6 1.6 0 0 1 2.148-.104l.115.104 2.25 2.25q.168.168.335.308V11.23c0-1.47-.153-2.004-.44-2.542a3 3 0 0 0-1.248-1.247c-.506-.27-1.009-.423-2.292-.44zm-5.564-6c2.362 0 3.219.246 4.083.708a4.8 4.8 0 0 1 2.003 2.003q.082.154.155.31-.385-.015-.832-.02L17.308 4h-1.25a3 3 0 0 0-.746-.56c-.506-.27-1.009-.422-2.292-.438L12.77 3H6.23c-1.47 0-2.004.153-2.542.44s-.96.71-1.247 1.248c-.27.506-.423 1.009-.44 2.292L2 7.23v4.54c0 1.47.153 2.004.44 2.542q.227.422.56.746v1.25q0 .628.02 1.139a6 6 0 0 1-.309-.155A4.8 4.8 0 0 1 .708 15.29C.246 14.425 0 13.569 0 11.206V7.794c0-2.362.246-3.219.708-4.083A4.8 4.8 0 0 1 2.71 1.708C3.575 1.246 4.431 1 6.794 1zM9.5 9.25c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25-1.25-.56-1.25-1.25.56-1.25 1.25-1.25" clip-rule="evenodd"></path></svg>
        <span>Add Photos</span>
      </Button>
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
