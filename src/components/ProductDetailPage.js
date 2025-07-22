import React, { useState } from 'react';
import { Box, Heading, Text, Button, Distribution } from 'grommet';
import { Gallery, DocumentText, AddCircle, Document } from 'grommet-icons';

const albumSizes = [
  { label: '20cm × 15cm', width: 20, height: 15 },
  { label: '27cm × 21cm', width: 27, height: 21 },
  { label: '35cm × 26cm', width: 35, height: 26 },
];

export default function ProductDetailPage({ onContinue }) {
  const [selected, setSelected] = useState(null);

  const distributionValues = [
    { value: 40, color: 'light-2' },
    { value: 30, color: 'light-3' },
    { value: 20, color: 'light-4' },
    { value: 10, color: 'light-5' },
  ];

  return (
    <Box direction="row" pad="medium" gap="large" align="start">
      <Box width="medium" gap="small">
        <Box height="medium" background="light-2" />
        <Distribution values={distributionValues} gap="xsmall">
          {(val, idx) => (
            <Box key={idx} background={val.color} height="xsmall" />
          )}
        </Distribution>
      </Box>
      <Box gap="small" flex="grow">
        <Heading level={2} margin="none">
          Soft cover Album
        </Heading>
        <Text weight="bold" size="large">10 EUR</Text>
        <Box direction="row" gap="small" wrap>
          {albumSizes.map((size) => (
            <Box
              key={size.label}
              pad="small"
              border={{ color: selected?.label === size.label ? 'brand' : 'border' }}
              round="xsmall"
              onClick={() => setSelected(size)}
              style={{ cursor: 'pointer' }}
            >
              <Text>{size.label}</Text>
            </Box>
          ))}
        </Box>
        <Box gap="xsmall" margin={{ top: 'medium', bottom: 'medium' }}>
          <Box direction="row" align="center" gap="xsmall">
            <Gallery />
            <Text>20cm × 15cm</Text>
          </Box>
          <Box direction="row" align="center" gap="xsmall">
            <DocumentText />
            <Text>20 pages</Text>
          </Box>
          <Box direction="row" align="center" gap="xsmall">
            <AddCircle />
            <Text>Add up to 130 additional pages</Text>
          </Box>
          <Box direction="row" align="center" gap="xsmall">
            <Document />
            <Text>200gsm Paper</Text>
          </Box>
        </Box>
        <Button
          primary
          label="Continue"
          onClick={() => selected && onContinue(selected)}
          disabled={!selected}
        />
      </Box>
    </Box>
  );
}
