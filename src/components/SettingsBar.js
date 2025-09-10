import React, { useRef } from 'react';
import { Box, Button } from 'grommet';
import { Edit } from 'grommet-icons';
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
  onEditTitle,
  fileInputRef,
}) {
const BackgroundIcon = () => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
  >
    <rect width="256" height="256" fill="none" />
    <path
      d="M80,56V48A16,16,0,0,1,96,32h8a8,8,0,0,1,0,16H96v8a8,8,0,0,1-16,0Zm64-8h16a8,8,0,0,0,0-16H144a8,8,0,0,0,0,16Zm64-16h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V48A16,16,0,0,0,208,32Zm8,56a8,8,0,0,0-8,8v16a8,8,0,0,0,16,0V96A8,8,0,0,0,216,88Zm-40,8V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V96A16,16,0,0,1,48,80H160A16,16,0,0,1,176,96Zm-16,0H48V208H160Zm56,48a8,8,0,0,0-8,8v8h-8a8,8,0,0,0,0,16h8a16,16,0,0,0,16-16v-8A8,8,0,0,0,216,144Z"
      fill="#000"
    />
  </svg>
);


const PhotosIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="24" height="24"><path fill="#585858" fill-rule="evenodd" d="M17.206 5c2.362 0 3.219.246 4.083.708a4.8 4.8 0 0 1 2.003 2.003c.462.864.708 1.72.708 4.083v4.412c0 2.362-.246 3.219-.708 4.083a4.8 4.8 0 0 1-2.003 2.003c-.864.462-1.72.708-4.083.708h-6.412c-2.362 0-3.219-.246-4.083-.708a4.8 4.8 0 0 1-2.003-2.003C4.246 19.425 4 18.569 4 16.206v-4.412c0-2.362.246-3.219.708-4.083A4.8 4.8 0 0 1 6.71 5.708C7.575 5.246 8.431 5 10.794 5zm1.077 8.166-4.51 4.51-.829.836.442-1.216-.566-.575-1.293-1.292-4.578 4.578q.32.328.74.552c.505.27 1.008.422 2.291.44l.25.001h7.54c1.47 0 2.004-.153 2.542-.44s.96-.71 1.247-1.248c.27-.506.422-1.009.44-2.292v-.139zM17.77 7h-7.54c-1.47 0-2.004.153-2.542.44s-.96.71-1.247 1.248c-.27.506-.423 1.009-.44 2.292L6 11.23v5.54c0 .545.021.961.062 1.297l4.334-4.335a1.6 1.6 0 0 1 2.263 0q.581.589.823.842.021.021-.54 1.02l-.09.159.922-.906 3.378-3.378a1.6 1.6 0 0 1 2.148-.104l.115.104 2.25 2.25q.168.168.335.308V11.23c0-1.47-.153-2.004-.44-2.542a3 3 0 0 0-1.248-1.247c-.506-.27-1.009-.423-2.292-.44zm-5.564-6c2.362 0 3.219.246 4.083.708a4.8 4.8 0 0 1 2.003 2.003q.082.154.155.31-.385-.015-.832-.02L17.308 4h-1.25a3 3 0 0 0-.746-.56c-.506-.27-1.009-.422-2.292-.438L12.77 3H6.23c-1.47 0-2.004.153-2.542.44s-.96.71-1.247 1.248c-.27.506-.423 1.009-.44 2.292L2 7.23v4.54c0 1.47.153 2.004.44 2.542q.227.422.56.746v1.25q0 .628.02 1.139a6 6 0 0 1-.309-.155A4.8 4.8 0 0 1 .708 15.29C.246 14.425 0 13.569 0 11.206V7.794c0-2.362.246-3.219.708-4.083A4.8 4.8 0 0 1 2.71 1.708C3.575 1.246 4.431 1 6.794 1zM9.5 9.25c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25-1.25-.56-1.25-1.25.56-1.25 1.25-1.25" clip-rule="evenodd"></path></svg>
);
const ThemeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="24" height="24"><path fill="#585858" fill-rule="evenodd" d="M12 1C5.934 1 1 5.934 1 12s4.934 11 11 11a2.557 2.557 0 0 0 2.563-2.562c0-.7-.26-1.252-.64-1.696a.82.82 0 0 1-.227-.555c0-.447.365-.812.813-.812H16.5c3.59 0 6.5-2.91 6.5-6.5C23 5.365 18.011 1 12 1m0 2c4.961 0 9 3.532 9 7.875 0 2.486-2.014 4.5-4.5 4.5h-1.991a2.814 2.814 0 0 0-2.813 2.813c0 .675.248 1.338.709 1.856a.6.6 0 0 1 .158.393A.557.557 0 0 1 12 21c-4.961 0-9-4.039-9-9s4.039-9 9-9m-1 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m-3 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M14.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m4.5 2.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" clip-rule="evenodd"></path></svg>
);

const SavingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    width="24"
    height="24"
  >
    <g>
      <path d="M83.996,7h-3.385H41.96H12.201C9.333,7,7,9.333,7,12.201v75.6C7,90.667,9.333,93,12.201,93H15.4h69.061h3.34
        C90.668,93,93,90.667,93,87.801V16.005L83.996,7z M78.611,9v15.802c0,1.764-1.436,3.198-3.199,3.198h-29.25
        c-1.766,0-3.202-1.435-3.202-3.198V9H78.611z M17.4,91V45.749c0-1.764,1.437-3.199,3.201-3.199h58.66
        c1.764,0,3.199,1.435,3.199,3.199V91H17.4z M91,87.801C91,89.565,89.564,91,87.801,91h-3.34V45.749
        c0-2.867-2.332-5.199-5.199-5.199h-58.66c-2.868,0-5.201,2.333-5.201,5.199V91h-3.199C10.437,91,9,89.565,9,87.801v-75.6
        C9,10.436,10.437,9,12.201,9H40.96v15.802c0,2.866,2.334,5.198,5.202,5.198h29.25c2.867,0,5.199-2.332,5.199-5.198V9h2.557
        L91,16.833V87.801z"/>
      <rect x="71.352" y="12.201" width="4.209" height="12.473" />
      <rect x="26.375" y="54.25" width="47.25" height="2" />
      <rect x="26.375" y="63.875" width="47.25" height="2" />
      <rect x="26.375" y="72.625" width="47.25" height="2" />
    </g>
  </svg>
);






  const internalRef = useRef();
  const fileRef = fileInputRef || internalRef;

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      const urls = files.map(f => URL.createObjectURL(f));
      if (typeof onAddImages === 'function') {
        onAddImages(urls);
      }
      e.target.value = '';
    }
  };

  return (
    <Box className="settings-bar" direction="row" gap="small" pad="xsmall" background="light-1" elevation="medium" align="center">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      <Button className="btn-setting" 
  icon={<PhotosIcon />}
  label="Add Photos"
  onClick={() => fileRef.current && fileRef.current.click()}
/>
      
       <Button icon={<BackgroundIcon />}  className="btn-setting" label={backgroundEnabled ? 'Remove Background' : 'Show Background'} onClick={() => setBackgroundEnabled(!backgroundEnabled)} />


          

          {onOpenThemeModal && (
            <Button className="btn-setting" icon={<ThemeIcon />} label="Change Theme" onClick={onOpenThemeModal} />
          )}
          {onEditTitle && (
            <Button className="btn-setting" icon={<Edit />} label="Edit Title" onClick={onEditTitle} />
          )}
          {onSave && (
            <Button className="btn-setting" icon={<SavingIcon />} label="Save" onClick={onSave} />
          )}
     
    </Box>
  );
}
