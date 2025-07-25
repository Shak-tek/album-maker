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
import TitlePage from "./components/TitlePage";
import EditorPage from "./components/EditorPage";
import ProductDetailPage from "./components/ProductDetailPage";
import LoginPage from "./LoginPage";
import ProfilePage from "./ProfilePage";

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

// base ImageKit URL for resizing images stored in S3
const IK_URL_ENDPOINT = process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "";

// helper to build an ImageKit transformation URL
const getResizedUrl = (key, width = 1000) =>
  `${IK_URL_ENDPOINT}/${encodeURI(key)}?tr=w-${width},fo-face`;

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);
  const [loadedImages, setLoadedImages] = useState([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [albumSize, setAlbumSize] = useState(null);

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    setView("size");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setView("login");
  };

  useEffect(() => {
    if (albumSize) {
      localStorage.setItem("albumSize", JSON.stringify(albumSize));
    }
  }, [albumSize]);

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
    localStorage.removeItem("albumSize");
    setSessionId(sid);
    setLoadedImages([]);
    setAlbumSize(null);
    setView("size");
    setShowPrompt(false);
  };

  // continue-session fn (used by the "Continue" button)
  const continueSession = async () => {
    const { Contents } = await s3
      .listObjectsV2({ Prefix: `${sessionId}/` })
      .promise();

    // map each key into the ImageKit URL
    const urls = Contents.map((o) => {
      const key = o.Key; // e.g. "1612345678901/myImage.jpg"
      return getResizedUrl(key, 1000);
    });

    setLoadedImages(urls);
    const storedSize = localStorage.getItem("albumSize");
    if (storedSize) {
      setAlbumSize(JSON.parse(storedSize));
      setView("editor");
    } else {
      setView("size");
    }
    setShowPrompt(false);
  };

  // On first mount load user and discover an existing session
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setView("size");
    } else {
      setView("login");
      return;
    }

    const sid = localStorage.getItem("sessionId");
    if (sid) {
      setSessionId(sid);
      const storedSize = localStorage.getItem("albumSize");
      if (storedSize) setAlbumSize(JSON.parse(storedSize));
      s3.listObjectsV2({ Prefix: `${sid}/` })
        .promise()
        .then(({ Contents }) => {
          if (Contents.length) setShowPrompt(true);
        })
        .catch(console.error);
    } else {
      const newSid = Date.now().toString();
      localStorage.setItem("sessionId", newSid);
      setSessionId(newSid);
      setLoadedImages([]);
      setShowPrompt(false);
    }
  }, []);

  if (view === "login") {
    return (
      <Grommet theme={theme} full>
        <LoginPage onLogin={handleLogin} />
      </Grommet>
    );
  }

  return (
    <Grommet theme={theme} full>
      <Page>
        <Header background="brand" pad="small">
          <Text size="large">FlipSnip</Text>
          <Button
            label={user ? "Profile" : "Login"}
            onClick={() => setView(user ? "profile" : "login")}
          />
          {user && <Button label="Logout" onClick={handleLogout} />}
        </Header>
        <PageContent pad="large">
          {showPrompt && (
            <Layer
              position="center"
              responsive={false}
              onEsc={() => setShowPrompt(false)}
              onClickOutside={() => setShowPrompt(false)}
            >
              <Box pad="medium" gap="small" style={{ maxWidth: '90vw' }}>
                <Text>Continue your previous session?</Text>
                <Box direction="row" gap="small">
                  <Button label="Continue" primary onClick={continueSession} />
                  <Button label="New Session" onClick={createNewSession} />
                </Box>
              </Box>
            </Layer>
          )}

          {view === "profile" ? (
            <ProfilePage user={user} />
          ) : view === "size" ? (
            <ProductDetailPage
              onContinue={(size) => {
                setAlbumSize(size);
                setView("upload");
              }}
            />
          ) : view === "upload" ? (
            <ImageUploader
              sessionId={sessionId}
              onContinue={(finishedUploads) => {
                const keys = finishedUploads.map((u) => u.key);
                const urls = keys.map((k) => getResizedUrl(k, 1000));
                setLoadedImages(urls);
                setView("title");
              }}
            />
          ) : view === "title" ? (
            <TitlePage onContinue={() => setView("editor")} />
          ) : view === "editor" ? (
            <EditorPage
              images={loadedImages}
              onAddImages={(urls) =>
                setLoadedImages((prev) => [...prev, ...urls])
              }
              albumSize={albumSize}
              s3={s3}
              sessionId={sessionId}
            />
          ) : null}
        </PageContent>
      </Page>
    </Grommet>
  );
}
