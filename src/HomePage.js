import React from "react";
import { Box, Button, Heading, Text } from "grommet";

export default function HomePage({
  onStartAlbum,
  onBrowseProducts,
  onSignUp,
}) {
  return (
    <Box fill align="center" justify="center" pad="large">
      <Box align="center" gap="medium" width="large">
        <Heading level={1} margin="none" textAlign="center">
          Capture your memories, craft a beautiful FlipSnip album.
        </Heading>
        <Text size="large" textAlign="center" color="muted">
          Choose a stunning template, add your photos, and let us handle the rest.
        </Text>
        <Box direction="row" gap="medium" wrap justify="center">
          <Button
            primary
            label="Start Your Album"
            onClick={onStartAlbum}
          />
          <Button label="Browse Products" onClick={onBrowseProducts} />
          <Button label="Sign Up Free" onClick={onSignUp} />
        </Box>
      </Box>
    </Box>
  );
}
