import React, { useState, useEffect } from "react";
import AWS from "aws-sdk";
import {
  Grommet,
  Header,
  Page,
  PageContent,
  Text,
  Button,
  Layer,
  Box,
} from "grommet";
import { deepMerge } from "grommet/utils";
import ImageUploader from "./components/ImageUploader";
import EditorPage from "./components/EditorPage";

// theme
const theme = deepMerge({
  global: {
    colors: { brand: "#228BE6" },
    font: { family: "Roboto", size: "18px", height: "20px" },
  },
});

// S3 config
const REGION = "us-east-1";
const IDENTITY_POOL_ID = "us-east-1:77fcf55d-2bdf-4f46-b979-ee71beb59193";
const BUCKET = "albumgrom";

AWS.config.update({ region: REGION });
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: IDENTITY_POOL_ID,
});
const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: BUCKET },
});

// your resize API
const RESIZER_API_URL =
  process.env.REACT_APP_RESIZER_API_URL ||
  "https://rd654zmm4e.execute-api.us-east-1.amazonaws.com/prod/resize";

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [view, setView] = useState("upload");
  const [loadedImages, setLoadedImages] = useState([]);
  const [showPrompt, setShowPrompt] = useState(false);

  // create-new-session fn (used by the "New Session" button)
  const createNewSession = async () => {
    if (sessionId) {
      const { Contents } = await s3
        .listObjectsV2({ Prefix: `${sessionId}/` })
        .promise();
      if (Contents.length) {
        await s3
          .deleteObjects({
            Delete: { Objects: Contents.map((o) => ({ Key: o.Key })) },
          })
          .promise();
      }
    }
    const sid = Date.now().toString();
    localStorage.setItem("sessionId", sid);
    setSessionId(sid);
    setLoadedImages([]);
    setView("upload");
    setShowPrompt(false);
  };

  // continue-session fn (used by the "Continue" button)
  const continueSession = async () => {
    const { Contents } = await s3
      .listObjectsV2({ Prefix: `${sessionId}/` })
      .promise();

    // map each key into your resizer URL
    const urls = Contents.map((o) => {
      const key = o.Key; // e.g. "1612345678901/myImage.jpg"
      return `${RESIZER_API_URL}/${encodeURIComponent(key)}?width=1000`;
    });

    setLoadedImages(urls);
    setView("editor");
    setShowPrompt(false);
  };

  // On first mount: either discover an existing session or spin up a new one
  useEffect(() => {
    const sid = localStorage.getItem("sessionId");
    if (sid) {
      setSessionId(sid);
      s3.listObjectsV2({ Prefix: `${sid}/` })
        .promise()
        .then(({ Contents }) => {
          if (Contents.length) setShowPrompt(true);
        })
        .catch(console.error);
    } else {
      // inline "new session" for initial load
      const newSid = Date.now().toString();
      localStorage.setItem("sessionId", newSid);
      setSessionId(newSid);
      setLoadedImages([]);
      setView("upload");
      setShowPrompt(false);
    }
  }, []);

  return (
    <Grommet theme={theme} full>
      <Page>
        <Header background="brand" pad="small">
          <Text size="large">FlipSnip</Text>
        </Header>
        <PageContent pad="large">
          {showPrompt && (
            <Layer
              onEsc={() => setShowPrompt(false)}
              onClickOutside={() => setShowPrompt(false)}
            >
              <Box pad="medium" gap="small">
                <Text>Continue your previous session?</Text>
                <Box direction="row" gap="small">
                  <Button label="Continue" primary onClick={continueSession} />
                  <Button label="New Session" onClick={createNewSession} />
                </Box>
              </Box>
            </Layer>
          )}

          {view === "upload" ? (
            <ImageUploader
              sessionId={sessionId}
              onContinue={(finishedUploads) => {
                const keys = finishedUploads.map((u) => u.key);
                const urls = keys.map((k) =>
                  `${RESIZER_API_URL}/${encodeURIComponent(k)}?width=300`
                );
                setLoadedImages(urls);
                setView("editor");
              }}
            />
          ) : (
            <EditorPage images={loadedImages} />
          )}
        </PageContent>
      </Page>
    </Grommet>
  );
}
