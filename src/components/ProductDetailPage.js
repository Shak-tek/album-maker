import React, { useState } from 'react';
import { Box, Heading, Text, Button, Grid, Image as GrommetImage } from 'grommet';
import { DocumentText, AddCircle, Document } from 'grommet-icons';

const albumSizes = [
  { label: '20cm × 15cm', width: 20, height: 15 },
  { label: '27cm × 21cm', width: 27, height: 21 },
  { label: '35cm × 26cm', width: 35, height: 26 },
];

const boxAlbumSizes = [
  { label: '20cm × 20cm', width: 20, height: 20 },
  { label: '25cm × 25cm', width: 25, height: 25 },
  { label: '30cm × 30cm', width: 30, height: 30 },
];

const BASE_URL = process.env.REACT_APP_IMAGE_BASE_URL || '';

export default function ProductDetailPage({ product, onContinue }) {
  const [selected, setSelected] = useState(null);

  // Detect if this is a box album (square format) by checking product name
  const isBoxAlbum = product?.name?.toLowerCase().includes('box album');
  const availableSizes = isBoxAlbum ? boxAlbumSizes : albumSizes;


  return (
    <Box className="page-wrap" pad={{ vertical: 'xl1' }}>
      <div className="page-container">
        <Box direction="row" gap="large" align="start">
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
                {product?.images?.[0] && (
                  <GrommetImage
                    src={product.images?.[0] ? `${BASE_URL}${product.images[0]}` : ''}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </Box>
              {product?.images?.slice(1, 4).map((img, idx) => (
                <Box key={img} gridArea={`small${idx + 1}`} background="light">
                  <GrommetImage
                    src={img ? `${BASE_URL}${img}` : ''}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              ))}
            </Grid>
          </Box>
          <Box width="medium" gap="small" >
            <Heading level={2} margin="none">
              {product?.name}
            </Heading>
            <Text weight="bold" color="brand" size="large">£{product?.price}</Text>
            {product?.details && <Text>{product.details}</Text>}
            <Box direction="row" gap="small" wrap>
              {availableSizes.map((size) => (
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
            <Button className="btn btn-secondary" 
              label="Continue"
              onClick={() => selected && onContinue(selected)}
              disabled={!selected}
            />
          </Box>
        </Box>
      </div>
    </Box>
  );
}
