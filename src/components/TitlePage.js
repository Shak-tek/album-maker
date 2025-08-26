import React, { useState } from 'react';
import { Box, Heading, TextInput, Button } from 'grommet';

export default function TitlePage({ onContinue, initialTitle = '', initialSubtitle = '' }) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);

  return (
    <Box pad="medium" gap="medium" align="start">
      <Heading level={2} size="xlarge" margin="none">
        Album Details
      </Heading>
      <Box gap="small" width="medium">
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
        <Button
          primary
          label="Continue"
          onClick={() => onContinue({ title, subtitle })}
        />
      </Box>
    </Box>
  );
}
