// src/App.js
import React, { useState, useEffect } from 'react';
import { Grommet, Header, Page, PageContent, Text } from 'grommet';
import { deepMerge } from 'grommet/utils';
import ImageUploader from './components/ImageUploader';
import EditorPage from './components/EditorPage';

const theme = deepMerge({
  global: {
    colors: { brand: '#228BE6' },
    font: { family: 'Roboto', size: '18px', height: '20px' },
  },
});

export default function App() {
  // uploads is an array of { preview: string, … }
  const [uploads, setUploads] = useState([]);
  // view: 'upload' or 'editor'
  const [view, setView] = useState('upload');

  // — Load from localStorage on mount —
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('uploads') || 'null');
    if (Array.isArray(saved) && saved.length > 0) {
      // rehydrate into the same shape your uploader expects
      setUploads(saved.map(preview => ({ preview })));
      setView('editor');
    }
  }, []);

  // — Persist previews to localStorage whenever uploads change —
  useEffect(() => {
    if (uploads.length > 0) {
      localStorage.setItem(
        'uploads',
        JSON.stringify(uploads.map(u => u.preview))
      );
    } else {
      localStorage.removeItem('uploads');
    }
  }, [uploads]);

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
}
