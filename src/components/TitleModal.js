import React, { useState } from 'react';
import { Layer, Box, Heading, TextInput, Button } from 'grommet';

export default function TitleModal({ title: initialTitle = '', subtitle: initialSubtitle = '', onSave, onClose }) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);

  return (
    <Layer position="center" className='modal-main modal-prompt' responsive={false} onEsc={onClose} onClickOutside={onClose}>
      <Box className='modal-contents' gap="small" width="medium">
        <Heading level={4} margin={{ bottom: 'small' }}>Edit Album Details</Heading>
        <TextInput
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextInput
          placeholder="Subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
        <Box direction="row" gap="small" justify="end" margin={{ top: 'medium' }}>
          <Button className="btn btn-secondary small" label="Cancel" onClick={onClose} />
          <Button className="btn btn-primary small" label="Save" onClick={() => onSave({ title, subtitle })} />
        </Box>
      </Box>
    </Layer>
  );
}
