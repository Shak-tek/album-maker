import React, { useEffect, useState } from "react";
import { Box, Image, Text, Heading, Paragraph } from "grommet";

export default function ProductsPage({ onSelect }) {
  const [products, setProducts] = useState([]);
  const BASE_URL = process.env.REACT_APP_IMAGE_BASE_URL || '';

  useEffect(() => {
    fetch("/.netlify/functions/products")
      .then((res) => res.json())
      .then(setProducts)
      .catch(console.error);
  }, []);

  return (
    <Box className="page-wrap" pad={{ vertical: 'xl1' }}>
      <div className="page-container">
        <Box gap="xsmall" margin={{ bottom: 'xl1' }}>
          <Heading level={1} margin="none">
            Personalised Photo Products

          </Heading>
          <Paragraph size="large" >
            There’s something for everyone. Whatever you choose, we’ll make sure it looks great.

          </Paragraph>
        </Box>
        <Box className="products-wrap">
          {products.map((p) => (
            <Box
              className="product-item"
              key={p.id}
              onClick={() => onSelect(p)}
              hoverIndicator
            >
              <div className="product-holder">
                <Image src={p.images?.[0] ? `${BASE_URL}${p.images[0]}` : ''} alt="" fit="cover" />
                <Box className="text-box" direction="row" align="center" alignContent="center" gap="xsmall" pad={{ vertical: 'xlarge' }}>
                  <Box className="text-info" flex="grow" overflow="hidden" gap="xsmall">
                    <Heading level={3} margin="none">{p.name}</Heading>
                    <Text size="large" weight="bold" color="brand">£{p.price}</Text>
                    
                  </Box>
                  <button className="btn btn-light small" flex="shrink">Create</button>
                </Box>
                <Paragraph size="large">
                  Description text to explain what this product is and what it does. <br />Lorem ipsum dolor sit amet, consectetur adipiscing elit.                  
                </Paragraph>
              </div>
            </Box>
          ))}
        </Box>
      </div>
    </Box>
  );
}
