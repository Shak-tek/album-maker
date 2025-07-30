import React from "react";
import { Box, Image, Text } from "grommet";

const products = [
  { id: 1, title: "Soft Cover Album", price: "10 EUR", image: "boy_reading.png" },
  { id: 2, title: "Hard Cover Album", price: "15 EUR", image: "girl_reading.png" },
  { id: 3, title: "Premium Album", price: "25 EUR", image: "old_man_reading.png" },
];

export default function ProductsPage({ onSelect }) {
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
          <Image src={p.image} alt="" fit="cover" />
          <Text weight="bold">{p.title}</Text>
          <Text>{p.price}</Text>
        </Box>
      ))}
    </Box>
  );
}
