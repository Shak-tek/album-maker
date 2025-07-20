import React, { useState } from 'react';
import { Box, Heading, Text, Button } from 'grommet';

const albumSizes = [
  { label: '20cm × 15cm', width: 20, height: 15 },
  { label: '27cm × 21cm', width: 27, height: 21 },
  { label: '35cm × 26cm', width: 35, height: 26 },
];

export default function SizePage({ onContinue }) {
  const [selected, setSelected] = useState(null);

  return (
    <Box pad="medium" gap="medium" align="start">
      <Heading level={2} size="xlarge" margin="none">
        Choose Album Size
      </Heading>
      <Box direction="row" gap="small" wrap>
        {albumSizes.map((size) => (
          <Box
            key={size.label}
            pad="medium"
            border={{ color: selected?.label === size.label ? 'brand' : 'border' }}
            round="small"
            onClick={() => setSelected(size)}
            style={{ cursor: 'pointer' }}
          >
            <Text>{size.label}</Text>
          </Box>
        ))}
      </Box>
      <Button
        primary
        label="Continue"
        onClick={() => selected && onContinue(selected)}
        disabled={!selected}
      />
    </Box>
  );
}
