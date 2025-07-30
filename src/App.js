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
  Menu,
} from "grommet";
import { deepMerge } from "grommet/utils";
import ImageUploader from "./components/ImageUploader";
import EditorPage from "./components/EditorPage";
import ProductsPage from "./ProductsPage";
import ProductDetailPage from "./components/ProductDetailPage";
import AlbumsPage from "./AlbumsPage";
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
  const [selectedProduct, setSelectedProduct] = useState(null);

  const loadSessionFromDb = async (userId) => {
    try {
      const res = await fetch(`/.netlify/functions/session?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session_id);
        localStorage.setItem("sessionId", data.session_id);
        if (data.settings?.albumSize) {
          setAlbumSize(data.settings.albumSize);
          localStorage.setItem("albumSize", JSON.stringify(data.settings.albumSize));
        }
      } else {
        const sid = Date.now().toString();
        setSessionId(sid);
        localStorage.setItem("sessionId", sid);
        await fetch("/.netlify/functions/session", {
          method: "POST",
          body: JSON.stringify({ userId, sessionId: sid, settings: {} }),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    loadSessionFromDb(u.id);
    setView("products");
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
    if (user && sessionId) {
      fetch("/.netlify/functions/session", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          sessionId,
          settings: { albumSize },
        }),
      }).catch(console.error);
    }
  }, [albumSize, user, sessionId]);

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
    setView("products");
    setShowPrompt(false);
    if (user) {
      fetch("/.netlify/functions/session", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, sessionId: sid, settings: {} }),
      }).catch(console.error);
    }
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
      setView("products");
    }
    setShowPrompt(false);
  };

  // On first mount load user and discover an existing session
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      loadSessionFromDb(u.id);
      setView("products");
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
          {user ? (
            <Menu
              label="Profile"
              items={[
                { label: "My Profile", onClick: () => setView("profile") },
                { label: "My Albums", onClick: () => setView("albums") },
                { label: "Sign Out", onClick: handleLogout },
              ]}
            />
          ) : (
            <Button label="Login" onClick={() => setView("login")} />
          )}
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
          ) : view === "albums" ? (
            <AlbumsPage />
          ) : view === "products" ? (
            <ProductsPage onSelect={(p) => { setSelectedProduct(p); setView("productDetail"); }} />
          ) : view === "productDetail" ? (
            <ProductDetailPage
              product={selectedProduct}
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
                setView("editor");
              }}
            />
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
