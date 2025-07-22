import React, { useState } from 'react';
import { Box, Heading, Text, Button, Grid, Image as GrommetImage } from 'grommet';
import { DocumentText, AddCircle, Document } from 'grommet-icons';

const albumSizes = [
  { label: '20cm × 15cm', width: 20, height: 15 },
  { label: '27cm × 21cm', width: 27, height: 21 },
  { label: '35cm × 26cm', width: 35, height: 26 },
];

export default function ProductDetailPage({ onContinue }) {
  const [selected, setSelected] = useState(null);


  return (
    <Box direction="row" pad="medium" gap="large" align="start">
      <Box width="large" gap="small">
        <Grid
          rows={['medium', 'small']}
          columns={['medium', 'small']}
          gap="medium"
          areas={[
            { name: 'main_pictures', start: [0, 0], end: [2, 0] },
            { name: 'small1', start: [0, 1], end: [0, 1] },
            { name: 'small2', start: [1, 1], end: [1, 1] },
            { name: 'small3', start: [2, 1], end: [2, 1] },
          ]}
        >
          <Box gridArea="main_pictures" background="brand" round="medium">
            <GrommetImage
              src="boy_reading.png"
              alt=""
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
          <Box gridArea="small1" background="light-5">
            <GrommetImage
              src="girl_reading.png"
              alt=""
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
          <Box gridArea="small2" background="light-2">
            <GrommetImage
              src="old_woman_reading.png"
              alt=""
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
          <Box gridArea="small3" background="light-2">
            <GrommetImage
              src="old_man_reading.png"
              alt=""
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        </Grid>
        
        
      </Box>
     
      <Box width="medium" gap="small" >
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
            <DocumentText />
            <Text>20 pages</Text>
          </Box>
          <Box direction="row" align="center" gap="xsmall">
            <AddCircle />
            <Text>Add up to 10 additional pages</Text>
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
