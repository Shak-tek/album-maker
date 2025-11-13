import React from "react";
import { Box, Button, Heading, Text } from "grommet";

export default function HomePage({
  onStartAlbum,
  onBrowseProducts,
  onSignUp,
}) {
  return (
    <Box  className="page-height-section">
      <Box className="page-container page-height-content">
        <Heading level={1} margin={{ bottom: 'large'}} textAlign="center">
          Capture your memories, craft a beautiful FlipSnip album.
        </Heading>
        <Text size="large" textAlign="center" margin={{ bottom: 'large'}}>
          Choose a stunning template, add your photos, and let us handle the rest.
        </Text>
        <Box direction="row" gap="medium" wrap justify="center" pad={{ top: 'large'}}>
          <Button className="btn btn-primary"
            primary
            label="Start Your Album"
            onClick={onStartAlbum}
          />
          <Button className="btn btn-secondary" label="Browse Products" onClick={onBrowseProducts} />
          <Button  className="btn btn-secondary" label="Sign Up Free" onClick={onSignUp} />
        </Box>
      </Box>
    </Box>
  );
}
