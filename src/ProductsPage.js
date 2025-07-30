import React, { useEffect, useState } from "react";
import { Box, Image, Text } from "grommet";

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
    <Box direction="row" gap="medium" wrap>
      {products.map((p) => (
        <Box
          key={p.id}
          width="small"
          pad="small"
          round="small"
          border
          onClick={() => onSelect(p)}
          hoverIndicator
        >
          <Image src={p.images?.[0] ? `${BASE_URL}${p.images[0]}` : ''} alt="" fit="cover" />
          <Text weight="bold">{p.name}</Text>
          <Text>{p.price}</Text>
        </Box>
      ))}
    </Box>
  );
}
