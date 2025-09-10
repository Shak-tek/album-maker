import React, { useState, useEffect, useCallback } from "react";
import AWS from "aws-sdk";
import {
  Grommet,
  Header,
  Page,
  Text,
  Button,
  Layer,
  Box,
  Menu,
} from "grommet";
import { deepMerge } from "grommet/utils";
import ImageUploader from "./components/ImageUploader";
import EditorPage from "./components/EditorPage";
import TitlePage from "./components/TitlePage";
import ProductsPage from "./ProductsPage";
import ProductDetailPage from "./components/ProductDetailPage";
import AlbumsPage from "./AlbumsPage";
import LoginPage from "./LoginPage";
import ProfilePage from "./ProfilePage";

// theme
/*
const theme = deepMerge({
  global: {
    colors: { brand: "#228BE6" },
    font: { family: "Roboto", size: "18px", height: "20px" },
  },
});
*/

const theme = deepMerge({
  global: {
    colors: {
      brand: "#2e2e2e",
      active: "#df3b3b",
      accent: "#df3b3b",
      text: "#585858",
      gray: "#f9f9f9",
      surface: "#f9f9f9",
      light2: "rgba(0,0,0,.05)",
      light3: "rgba(0,0,0,.09)",
      background: "#FFFFFF",
      black: "#000",
      white: "#fff",
      border: "#E5E7EB",
      muted: "#6B7280",
      focus: "#df3b3b",

    },
    focus: {
      background: {
        color: "#df3b3b",
      },
      border: {
        color: "#df3b3b",
      },
      elevation: "none",
      shadow: {
        color: "transparent",
      },
    },

    /*
    
    button: {
      font: {
        size: '26px', 
      },
      border: {
        radius: "18px",
      },
      padding: {
        vertical: "8px",
        horizontal: "16px",
      },
      background: {
        color: "#ffffff",
        opacity: 1,      
      },
      color: "#fff", 
      primary: {
        color: "#1f1f1f", 
      },
      hover: {
        background: {
          color: "#d74012",
        },
        color: "#fff",
      },
      active: {
        background: {
          color: "#f0f0f0", 
        },
      },
      focus: {
        border: {
          color: "#d74012",
        },
        shadow: {
          color: "transparent", 
        },
      },
      elevation: "none",
    },

*/

    breakpoints: {
      small: {
        value: 767,
        edgeSize: {
          xl1: "20px",
          xl2: "30px",
          xl3: "40px",
          xl4: "50px",
        },
      },
      medium: { value: 1023 },
      large: { value: 1250 },
    },

    font: {
      family: "-apple-system, BlinkMacSystemFont, SFUI, HelveticaNeue, Helvetica, Arial, sans-serif",
      size: "14px",
      weight: "400",
      height: "1.57",

    },

    edgeSize: {
      
      xxsmall: "4px",
      xsmall: "8px",
      small: "12px",
      medium: "16px",
      large: "20px",
      xlarge: "24px",
      xxlarge: "32px",
      xl1: "40px",
      xl2: "60px",
      xl3: "80px",
      xl4: "100px",
    },
  },

  

  text: {
    t14: { size: '14px', height: '1.57' },
    t16: { size: '16px', height: '1.2' },
    t18: { size: '18px', height: '1.2' },
    t20: { size: '20px', height: '1.2' },
    t28: { size: '28px', height: '1.2' },
    t44: { size: '44px', height: '1.2' },
  },
  paragraph: {
    small: { size: '12px', height: '1.57' },
    medium: { size: '14px', height: '1.57' },
    large: { size: '16px', height: '1.57' },
  },

  button: {
    border: { color: "transparent", radius: "5px" },
    padding: { vertical: "12px", horizontal: "24px", },
    color: "#fff",
    font: { size: "12px"},
    secondary: {background: "#000" },
  },
  card: {
    container: {
      round: "12px",
      background: "white",
    },
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
  const [albumTitle, setAlbumTitle] = useState(
    localStorage.getItem("albumTitle") || ""
  );
  const [albumSubtitle, setAlbumSubtitle] = useState(
    localStorage.getItem("albumSubtitle") || ""
  );
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [identityId, setIdentityId] = useState(
    localStorage.getItem("identityId") || null
  );

  // Fetch the Cognito identity ID on mount
  useEffect(() => {
    AWS.config.credentials.get((err) => {
      if (!err) {
        const id = AWS.config.credentials.identityId;
        setIdentityId(id);
        localStorage.setItem("identityId", id);
      }
    });
  }, []);

  const loadSessionFromDb = useCallback(async (userId) => {
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
        if (data.settings?.identityId) {
          setIdentityId(data.settings.identityId);
          localStorage.setItem("identityId", data.settings.identityId);
        }
        if (data.settings?.title) {
          setAlbumTitle(data.settings.title);
          localStorage.setItem("albumTitle", data.settings.title);
        }
        if (data.settings?.subtitle) {
          setAlbumSubtitle(data.settings.subtitle);
          localStorage.setItem("albumSubtitle", data.settings.subtitle);
        }
        if (data.settings?.pageSettings) {
          localStorage.setItem("pageSettings", JSON.stringify(data.settings.pageSettings));
        }
        // check if S3 has uploads for this session
        try {
          const { Contents } = await s3.listObjectsV2({ Prefix: `${data.session_id}/` }).promise();
          if (Contents.length) setShowPrompt(true);
        } catch (err) {
          console.error(err);
        }
      } else {
        const sid = Date.now().toString();
        setSessionId(sid);
        localStorage.setItem("sessionId", sid);
        await fetch("/.netlify/functions/session", {
          method: "POST",
          body: JSON.stringify({
            userId,
            sessionId: sid,
            settings: { identityId },
          }),
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, [identityId]);


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
    localStorage.setItem("albumTitle", albumTitle);
    localStorage.setItem("albumSubtitle", albumSubtitle);
    if (user && sessionId) {
      fetch("/.netlify/functions/session", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          sessionId,
          settings: {
            albumSize,
            identityId,
            title: albumTitle,
            subtitle: albumSubtitle,
          },
        }),
      }).catch(console.error);
    }
  }, [albumSize, albumTitle, albumSubtitle, user, sessionId, identityId]);

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
    localStorage.removeItem("albumTitle");
    localStorage.removeItem("albumSubtitle");
    setSessionId(sid);
    setLoadedImages([]);
    setAlbumSize(null);
    setAlbumTitle("");
    setAlbumSubtitle("");
    setView("products");
    setShowPrompt(false);
    if (user) {
      fetch("/.netlify/functions/session", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          sessionId: sid,
          settings: { identityId },
        }),
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
      const storedTitle = localStorage.getItem("albumTitle");
      if (storedTitle) setAlbumTitle(storedTitle);
      const storedSubtitle = localStorage.getItem("albumSubtitle");
      if (storedSubtitle) setAlbumSubtitle(storedSubtitle);
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
      const storedTitle = localStorage.getItem("albumTitle");
      if (storedTitle) setAlbumTitle(storedTitle);
      const storedSubtitle = localStorage.getItem("albumSubtitle");
      if (storedSubtitle) setAlbumSubtitle(storedSubtitle);
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
  }, [loadSessionFromDb]);

  if (view === "login") {
    return (
      <Grommet theme={theme} full>
        <LoginPage onLogin={handleLogin} />
      </Grommet>
    );
  }

  return (
    <Grommet theme={theme} full>
      <Page className="page">
        <Header className="header" background="gray" pad="small">
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
        <div className="main-content">
          {showPrompt && (
            <Layer
              position="center"
              responsive={false}
              onEsc={() => setShowPrompt(false)}
              onClickOutside={() => setShowPrompt(false)}
            >
              <Box pad="medium" gap="small" style={{ maxWidth: '90vw' }}>
                <Text>You already have an album in session.</Text>
                <Text>Would you like to continue or make a new one?</Text>
                <Box direction="row" gap="small" wrap>
                  <Button label="Continue" primary onClick={continueSession} />
                  <Button primary 
                    label="Show Previous Album"
                    onClick={() => {
                      setShowPrompt(false);
                      setView('albums');
                    }}
                  />
                  <Button primary label="New Session" onClick={createNewSession} />
                </Box>
              </Box>
            </Layer>
          )}

          {view === "profile" ? (
            <ProfilePage user={user} />
          ) : view === "albums" ? (
            <AlbumsPage sessionId={sessionId} onOpen={continueSession} />
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
                setView("title");
              }}
            />
          ) : view === "title" ? (
            <TitlePage
              onContinue={({ title, subtitle }) => {
                setAlbumTitle(title);
                setAlbumSubtitle(subtitle);
                setView("editor");
              }}
              initialTitle={albumTitle}
              initialSubtitle={albumSubtitle}
            />
          ) : view === "editor" ? (
            <EditorPage
              images={loadedImages}
              onAddImages={(urls = []) =>
                setLoadedImages((prev) => [
                  ...prev,
                  ...(Array.isArray(urls) ? urls : [urls]),
                ])
              }
              albumSize={albumSize}
              s3={s3}
              sessionId={sessionId}
              user={user}
              identityId={identityId}
              title={albumTitle}
              subtitle={albumSubtitle}
              setTitle={setAlbumTitle}
              setSubtitle={setAlbumSubtitle}
            />
          ) : null}
        </div>
      </Page>
    </Grommet>
  );
}
