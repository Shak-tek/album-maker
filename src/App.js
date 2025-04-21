// src/App.js
import React, { useState } from 'react';
import { Grommet, Header, Page, PageContent, PageHeader, Text } from "grommet";
import { deepMerge } from "grommet/utils";
import ImageUploader from "./components/ImageUploader";
import EditorPage from './components/EditorPage';


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

const App = () => {
  const [uploads, setUploads] = useState([]);        // Array of { file, preview, … }
  const [view, setView] = useState('upload');        // 'upload' or 'editor'

  return (
    <Grommet theme={theme} full>
      <Page>
        <Header background="brand" pad="small">
          <Text size="large">FlipSnip</Text>
        </Header>
        <PageContent pad="large">
          {view === 'upload' ? (
            <ImageUploader
              uploads={uploads}
              setUploads={setUploads}
              onContinue={() => setView('editor')}
            />
          ) : (
            <EditorPage images={uploads.map(u => u.preview)} />
          )}
        </PageContent>
      </Page>
    </Grommet>
  );
};

export default App;