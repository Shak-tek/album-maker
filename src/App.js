// src/App.js
import React from "react";
import { Grommet, Header, Page, PageContent, PageHeader, Text } from "grommet";
import { deepMerge } from "grommet/utils";
import ImageUploader from "./components/ImageUploader";

const theme = deepMerge({
  global: {
    colors: {
      brand: "#228BE6",
    },
    font: {
      family: "Roboto",
      size: "18px",
      height: "20px",
    },
  },
});

function App() {
  return (
    <Grommet theme={theme} full>
      <Page>
        <Header background="brand" pad="small">
          <Text size="large">FlipSnip</Text>
        </Header>
        <PageContent pad="large">
          <PageHeader title="Upload Photos" />
          {/* Include the image uploader here */}
          <ImageUploader />
        </PageContent>
      </Page>
    </Grommet>
  );
}

export default App;
