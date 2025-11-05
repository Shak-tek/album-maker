import React, { useEffect, useState } from "react";
import { Box, Button, Heading, Layer, TextInput } from "grommet";

export default function TitlePage({
  onContinue,
  initialTitle = "",
  initialSubtitle = "",
}) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setSubtitle(initialSubtitle);
  }, [initialSubtitle]);

  const handleContinue = () => {
    onContinue({
      title: title.trim(),
      subtitle: subtitle.trim(),
    });
  };

  return (
    <Layer full modal plain>
      <Box
        fill
        align="center"
        justify="center"
        background="rgba(15, 23, 42, 0.45)"
        pad={{ horizontal: "medium" }}
        style={{ backdropFilter: "blur(6px)" }}
      >
        <Box
          width="medium"
          background="white"
          round="medium"
          pad="large"
          gap="medium"
          elevation="large"
        >
          <Heading level={3} margin="none">
            Add Album Details
          </Heading>
          <TextInput
            placeholder="Album Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <TextInput
            placeholder="Subtitle (optional)"
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
          />
          <Box direction="row" gap="small" justify="end">
            <Button primary label="Continue" onClick={handleContinue} />
          </Box>
        </Box>
      </Box>
    </Layer>
  );
}
