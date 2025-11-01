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
  DropButton,
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
import AdminPanel from "./admin/AdminPanel";
import AdminLogin from "./admin/AdminLogin";
import HomePage from "./HomePage";
import { User } from "grommet-icons";

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

const PROTECTED_VIEWS = new Set(["profile", "albums", "upload", "title", "editor"]);

function MainApp() {
  const [sessionId, setSessionId] = useState(null);
  const [view, setView] = useState("home");
  const [user, setUser] = useState(null);
  const [loadedImages, setLoadedImages] = useState([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [albumSize, setAlbumSize] = useState(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumSubtitle, setAlbumSubtitle] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [authMode, setAuthMode] = useState("signup");
  const [pendingView, setPendingView] = useState(null);
  const [authPrompt, setAuthPrompt] = useState("");
  const [authDropOpen, setAuthDropOpen] = useState(false);
  const [, setAuthEmail] = useState("");
  const [identityId, setIdentityId] = useState(null);

  const showAuth = (mode = "signup", prompt = "") => {
    setAuthMode(mode);
    setAuthPrompt(prompt);
    setAuthDropOpen(false);
    setView("login");
  };

  const navigate = (nextView) => {
    if (!user && PROTECTED_VIEWS.has(nextView)) {
      setPendingView(nextView);
      showAuth("signup", "Sign up or log in to start your album.");
      return;
    }
    setAuthDropOpen(false);
    setAuthPrompt("");
    setView(nextView);
  };

  // Fetch the Cognito identity ID on mount
  useEffect(() => {
    AWS.config.credentials.get((err) => {
      if (!err) {
        const id = AWS.config.credentials.identityId;
        setIdentityId(id);
      }
    });
  }, []);

  const loadSessionFromDb = useCallback(async (userId) => {
    try {
      const res = await fetch(`/.netlify/functions/session?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session_id);
        setAlbumSize(data.settings?.albumSize ?? null);
        if (data.settings?.identityId) {
          setIdentityId(data.settings.identityId);
        }
        setAlbumTitle(data.settings?.title ?? "");
        setAlbumSubtitle(data.settings?.subtitle ?? "");
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
        setAlbumSize(null);
        setAlbumTitle("");
        setAlbumSubtitle("");
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


  const handleLogin = (authUser) => {
    if (!authUser) return;
    setUser(authUser);
    localStorage.setItem("user", JSON.stringify(authUser));
    loadSessionFromDb(authUser.id);
    setAuthDropOpen(false);
    setAuthEmail("");
    setAuthPrompt("");
    if (pendingView) {
      setView(pendingView);
      setPendingView(null);
    } else {
      setView("products");
    }
    setAuthMode("login");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setSessionId(null);
    setAlbumSize(null);
    setAlbumTitle("");
    setAlbumSubtitle("");
    setLoadedImages([]);
    setShowPrompt(false);
    setPendingView(null);
    setAuthMode("signup");
    setAuthDropOpen(false);
    setAuthEmail("");
    setAuthPrompt("");
    setShowPrompt(false);
    navigate("products");
  };

  useEffect(() => {
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
    setSessionId(sid);
    setLoadedImages([]);
    setAlbumSize(null);
    setAlbumTitle("");
    setAlbumSubtitle("");
    navigate("products");
    setShowPrompt(false);
    if (user) {
      fetch("/.netlify/functions/session", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          sessionId: sid,
          settings: { identityId },
          reset: true,
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
    if (albumSize) {
      navigate("editor");
    } else {
      navigate("products");
    }
    setShowPrompt(false);
  };

  // On first mount load user and discover an existing session
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u && u.id) {
          setUser(u);
          loadSessionFromDb(u.id);
        } else {
          localStorage.removeItem("user");
        }
      } catch (err) {
        console.error(err);
        localStorage.removeItem("user");
      }
    }
  }, [loadSessionFromDb]);

  useEffect(() => {
    if (!sessionId) {
      setShowPrompt(false);
      return;
    }
    s3
      .listObjectsV2({ Prefix: `${sessionId}/` })
      .promise()
      .then(({ Contents }) => {
        setShowPrompt(Array.isArray(Contents) && Contents.length > 0);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [sessionId]);

  useEffect(() => {
    setLoadedImages([]);
  }, [sessionId]);

  if (view === "login") {
    return (
      <Grommet theme={theme} full>
        <LoginPage onLogin={handleLogin} initialMode={authMode} message={authPrompt} />
      </Grommet>
    );
  }

  return (
    <Grommet theme={theme} full>
      <Page className="page">
        <Header className="header" background="gray" pad="small">
          <Button plain onClick={() => navigate("home")} hoverIndicator>
            <Text size="large" weight="bold">
              FlipSnip
            </Text>
          </Button>
          {user ? (
            <Menu
              label="Profile"
              items={[
                { label: "My Profile", onClick: () => navigate("profile") },
                { label: "My Albums", onClick: () => navigate("albums") },
                { label: "Sign Out", onClick: handleLogout },
              ]}
            />
          ) : (
            <DropButton
              open={authDropOpen}
              onOpen={() => setAuthDropOpen(true)}
              onClose={() => setAuthDropOpen(false)}
              plain
              dropAlign={{ top: "bottom", right: "right" }}
              label={
                <Box direction="row" gap="xsmall" align="center">
                  <User />
                  <Text>User</Text>
                </Box>
              }
              dropContent={
                <Box pad="medium" gap="small" width="medium">
                  <Text weight="bold">Do you have an account?</Text>
                  <Button
                    primary
                    label="Get started with Sign Up"
                    onClick={() => showAuth("signup")}
                  />
                  <Button
                    primary
                    label="Already have an account? Log in"
                    onClick={() => showAuth("login")}
                  />
                </Box>
              }
            />
          )}
        </Header>
        <div className="main-content">
          {user && showPrompt && (
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
                      navigate('albums');
                    }}
                  />
                  <Button primary label="New Session" onClick={createNewSession} />
                </Box>
              </Box>
            </Layer>
          )}

          {view === "home" ? (
            <HomePage
              onStartAlbum={() => navigate("products")}
              onBrowseProducts={() => navigate("products")}
              onSignUp={() => showAuth("signup")}
            />
          ) : view === "profile" ? (
            <ProfilePage user={user} />
          ) : view === "albums" ? (
            <AlbumsPage sessionId={sessionId} onOpen={continueSession} />
          ) : view === "products" ? (
            <ProductsPage onSelect={(p) => { setSelectedProduct(p); navigate("productDetail"); }} />
          ) : view === "productDetail" ? (
            <ProductDetailPage
              product={selectedProduct}
              onContinue={(size) => {
                setAlbumSize(size);
                navigate("upload");
              }}
            />
          ) : view === "upload" ? (
            <ImageUploader
              sessionId={sessionId}
              onContinue={(urls = []) => {
                const list = Array.isArray(urls)
                  ? urls.filter(Boolean)
                  : urls
                  ? [urls]
                  : [];
                setLoadedImages(list);
                navigate("title");
              }}
            />
          ) : view === "title" ? (
            <TitlePage
              onContinue={({ title, subtitle }) => {
                setAlbumTitle(title);
                setAlbumSubtitle(subtitle);
                navigate("editor");
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

const ADMIN_SESSION_KEY = "flipsnip_admin_session_v1";

const loadAdminSession = () => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.id) {
      return parsed;
    }
  } catch (err) {
    // ignore malformed storage payloads
  }
  return null;
};

const storeAdminSession = (admin) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify(admin)
    );
  } catch (err) {
    // storage might be unavailable (private mode)
  }
};

const clearAdminSession = () => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (err) {
    // ignore
  }
};

function AdminRoot() {
  const [admin, setAdmin] = useState(() => loadAdminSession());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncSession = (event) => {
      if (event.key && event.key !== ADMIN_SESSION_KEY) return;
      setAdmin(loadAdminSession());
    };
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);

  const handleSignedIn = (adminUser) => {
    storeAdminSession(adminUser);
    setAdmin(adminUser);
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/admin"
    ) {
      window.history.replaceState({}, "", "/admin");
    }
  };

  const handleSignOut = () => {
    clearAdminSession();
    setAdmin(null);
  };

  if (!admin) {
    return <AdminLogin onSuccess={handleSignedIn} />;
  }

  return <AdminPanel admin={admin} onSignOut={handleSignOut} />;
}
export default function App() {
  const isAdminRoute =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <AdminRoot />;
  }

  return <MainApp />;
}

