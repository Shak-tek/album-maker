import React, { useState, useEffect } from "react";
import { Grommet, Header, Page, PageContent, Text } from "grommet";
import { deepMerge } from "grommet/utils";
import ImageUploader from "./components/ImageUploader";
import EditorPage from "./components/EditorPage";

const theme = deepMerge({
  global: {
    colors: { brand: "#228BE6" },
    font: { family: "Roboto", size: "18px", height: "20px" },
  },
});

// Replace with your resize API endpoint
const RESIZER_API_URL =
  process.env.REACT_APP_RESIZER_API_URL ||
  "https://rd654zmm4e.execute-api.us-east-1.amazonaws.com/prod/resize";

export default function App() {
  const [uploads, setUploads] = useState([]);
  const [view, setView] = useState("upload");

  // On mount, rehydrate saved uploads
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("uploads") || "null");
    if (Array.isArray(saved) && saved.length) {
      setUploads(saved);
      setView("editor");
    }
  }, []);

  // Persist uploads to localStorage
  useEffect(() => {
    if (uploads.length) {
      const toSave = uploads.map(({ preview, key }) => ({ preview, key }));
      localStorage.setItem("uploads", JSON.stringify(toSave));
    } else {
      localStorage.removeItem("uploads");
    }
  }, [uploads]);

  return (
    <Grommet theme={theme} full>
      <Page>
        <Header background="brand" pad="small">
          <Text size="large">FlipSnip</Text>
        </Header>
        <PageContent pad="large">
          {view === "upload" ? (
            <ImageUploader
              onContinue={finishedUploads => {
                const toSave = finishedUploads.map(({ preview, key }) => ({
                  preview,
                  key,
                }));
                setUploads(toSave);
                setView("editor");
              }}
            />
          ) : (
            <EditorPage
              images={uploads.map(
                u =>
                  `${RESIZER_API_URL}/${encodeURIComponent(u.key)}?width=300`
              )}
            />
          )}
        </PageContent>
      </Page>
    </Grommet>
  );
}
