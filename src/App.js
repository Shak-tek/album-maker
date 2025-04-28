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

export default function App() {
  const [uploads, setUploads] = useState([]);
  const [view, setView] = useState("upload");

  // rehydrate on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("uploads") || "null");
    if (Array.isArray(saved) && saved.length) {
      setUploads(
        saved.map(({ preview, displayUrl, key }) => ({
          file: null,
          preview,
          displayUrl,
          key,
          status: "loaded",
          progress: 100,
        }))
      );
      setView("editor");
    }
  }, []);

  // persist whenever uploads change
  useEffect(() => {
    if (uploads.length) {
      const toSave = uploads.map(({ preview, displayUrl, key }) => ({ preview, displayUrl, key }));
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
            <ImageUploader uploads={uploads} setUploads={setUploads} onContinue={() => setView("editor")} />
          ) : (
            <EditorPage images={uploads.map((u) => u.displayUrl || u.preview)} />
          )}
        </PageContent>
      </Page>
    </Grommet>
  );
}
