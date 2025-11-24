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
import BoxEditor from "./components/BoxEditor";
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
      brand: "#1f2937",
      active: "#1e959c",
      accent: "#1e959c",      
      text: "#4b5563",
      gray: "#f3f4f6",
      surface: "#f3f4f6",
      light2: "rgba(0,0,0,.05)",
      light3: "rgba(0,0,0,.09)",
      background: "#FFFFFF",
      black: "#000",
      white: "#fff",
      border: "#e5e7eb",
      muted: "#6B7280",
      focus: "#1e959c",

    },
    focus: {
      background: {
        color: "#1e959c",
      },
      border: {
        color: "none",
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
      family: "ui-sans-serif, system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji, Segoe UI Symbol,Noto Color Emoji, Sharp Sans, -apple-system, BlinkMacSystemFont, SFUI, HelveticaNeue, Helvetica, Arial, sans-serif",
      size: "14px",
      weight: "400",
      height: "1.5",

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
    t14: { size: '14px', height: '1.5' },
    t16: { size: '16px', height: '1.2' },
    t18: { size: '18px', height: '1.2' },
    t20: { size: '20px', height: '1.2' },
    t28: { size: '28px', height: '1.2' },
    t44: { size: '44px', height: '1.2' },
  },
  paragraph: {
    small: { size: '12px', height: '1.5' },
    medium: { size: '14px', height: '1.5' },
    large: { size: '16px', height: '1.5' },
  },

  button: {
    border: { color: "transparent", radius: "5px" },
    padding: { vertical: "10px", horizontal: "20px", },
    color: "#fff",
    font: { size: "17px", height: "21px", weight: "semibold"},
    secondary: {background: "#1f2937" },
  },
  card: {
    container: {
      round: "12px",
      background: "white",
    },
  },
  modal: {
    container: {
      round: "10px",
      background: "white",
    },
  },
});



// S3 config
const REGION = process.env.REACT_APP_AWS_REGION || "us-east-1";
const IDENTITY_POOL_ID = process.env.REACT_APP_AWS_COGNITO_IDENTITY_POOL_ID || "us-east-1:77fcf55d-2bdf-4f46-b979-ee71beb59193";
const BUCKET = process.env.REACT_APP_AWS_S3_BUCKET || "albumgrom";

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
const MAX_ALBUMS_PER_USER = 10;

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
  const [albums, setAlbums] = useState([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [albumLimitMessage, setAlbumLimitMessage] = useState("");
  const canCreateMoreAlbums = albums.length < MAX_ALBUMS_PER_USER;
  const latestAlbum = albums.length ? albums[0] : null;
  const [pendingDeleteAlbum, setPendingDeleteAlbum] = useState(null);
  const [deleteAlbumLoading, setDeleteAlbumLoading] = useState(false);
  const [deleteAlbumError, setDeleteAlbumError] = useState("");

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

  const hydrateAlbumFromSettings = useCallback((album) => {
    if (!album) return;
    const settings = album.settings || {};
    setSessionId(album.session_id);
    setAlbumSize(settings.albumSize ?? null);
    setAlbumTitle(settings.title ?? "");
    setAlbumSubtitle(settings.subtitle ?? "");
    if (settings.identityId) {
      setIdentityId(settings.identityId);
    }
  }, []);

  const createAlbumRecord = useCallback(
    async (userId, newSessionId, extraSettings = {}) => {
      if (!userId || !newSessionId) return null;
      try {
        const res = await fetch("/.netlify/functions/session", {
          method: "POST",
          body: JSON.stringify({
            userId,
            sessionId: newSessionId,
            settings: extraSettings,
          }),
        });
        if (!res.ok) {
          let payload = {};
          try {
            payload = await res.json();
          } catch {
            // ignore body parse failures
          }
          if (res.status === 409 || payload?.error === "MAX_ALBUMS_REACHED") {
            setAlbumLimitMessage(`You can create up to ${MAX_ALBUMS_PER_USER} albums.`);
          } else {
            setAlbumLimitMessage("We couldn't create a new album right now. Please try again.");
          }
          return null;
        }
        setAlbumLimitMessage("");
        return newSessionId;
      } catch (err) {
        console.error(err);
        setAlbumLimitMessage("We couldn't create a new album right now. Please try again.");
        return null;
      }
    },
    [setAlbumLimitMessage]
  );

  const loadAlbumsFromDb = useCallback(
    async (userId, options = {}) => {
      if (!userId) return;
      const execute = async (preferredSessionId, attempt = 0) => {
        const res = await fetch(`/.netlify/functions/session?userId=${userId}`);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        let payload = {};
        try {
          payload = await res.json();
        } catch {
          payload = {};
        }
        const list = Array.isArray(payload.sessions)
          ? payload.sessions
          : payload.session
          ? [payload.session]
          : [];
        if (!list.length) {
          if (attempt > 0) {
            setAlbums([]);
            setSessionId(null);
            return;
          }
          const seedSessionId = Date.now().toString();
          const created = await createAlbumRecord(userId, seedSessionId, { identityId });
          if (created) {
            await execute(created, attempt + 1);
          }
          return;
        }
        setAlbums(list);
        setAlbumLimitMessage("");
        const nextAlbum =
          list.find((album) => album.session_id === preferredSessionId) || list[0];
        hydrateAlbumFromSettings(nextAlbum);
      };

      setAlbumsLoading(true);
      try {
        await execute(options.preferredSessionId ?? null, options.attempt ?? 0);
      } catch (err) {
        console.error(err);
      } finally {
        setAlbumsLoading(false);
      }
    },
    [createAlbumRecord, hydrateAlbumFromSettings, identityId]
  );

  const deleteAlbum = useCallback(
    async (album) => {
      if (!album || !user) return false;
      const prefix = `${album.session_id}/`;
      try {
        const { Contents } = await s3.listObjectsV2({ Prefix: prefix }).promise();
        if (Array.isArray(Contents) && Contents.length) {
          await s3
            .deleteObjects({
              Delete: { Objects: Contents.map((object) => ({ Key: object.Key })) },
            })
            .promise();
        }
      } catch (err) {
        console.error("Unable to delete album assets", err);
      }

      try {
        await fetch(
          `/.netlify/functions/session?userId=${encodeURIComponent(
            user.id
          )}&sessionId=${encodeURIComponent(album.session_id)}`,
          { method: "DELETE" }
        );
      } catch (err) {
        console.error("Unable to delete album record", err);
        return false;
      }

      await loadAlbumsFromDb(user.id);
      if (sessionId === album.session_id) {
        setLoadedImages([]);
        setAlbumSize(null);
        setAlbumTitle("");
        setAlbumSubtitle("");
      }
      return true;
    },
    [user, loadAlbumsFromDb, sessionId]
  );

  const handleLogin = (authUser) => {
    if (!authUser) return;
    setUser(authUser);
    localStorage.setItem("user", JSON.stringify(authUser));
    loadAlbumsFromDb(authUser.id);
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
    setAlbums([]);
    setAlbumLimitMessage("");
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
    if (!user) {
      showAuth("signup", "Sign up or log in to create a new album.");
      return;
    }
    if (!canCreateMoreAlbums) {
      setAlbumLimitMessage(`You can create up to ${MAX_ALBUMS_PER_USER} albums.`);
      return;
    }
    const sid = Date.now().toString();
    const created = await createAlbumRecord(user.id, sid, { identityId });
    if (!created) return;
    await loadAlbumsFromDb(user.id, { preferredSessionId: sid });
    setLoadedImages([]);
    setAlbumSize(null);
    setAlbumTitle("");
    setAlbumSubtitle("");
    setShowPrompt(false);
    navigate("products");
  };

  // continue-session fn (used by the "Continue" button)
  const continueSession = async (albumOverride = null) => {
    const targetAlbum =
      albumOverride ||
      albums.find((album) => album.session_id === sessionId);
    const targetSessionId = albumOverride?.session_id || sessionId;
    if (!targetSessionId) return;

    if (targetAlbum) {
      hydrateAlbumFromSettings(targetAlbum);
    }

    const { Contents } = await s3
      .listObjectsV2({ Prefix: `${targetSessionId}/` })
      .promise();

    const urls = Contents.map((o) => getResizedUrl(o.Key, 1000));

    setLoadedImages(urls);
    const sizeToUse = targetAlbum?.settings?.albumSize ?? albumSize;
    if (sizeToUse) {
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
          loadAlbumsFromDb(u.id);
        } else {
          localStorage.removeItem("user");
        }
      } catch (err) {
        console.error(err);
        localStorage.removeItem("user");
      }
    }
  }, [loadAlbumsFromDb]);

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

  useEffect(() => {
    if (view !== "albums" || !user) return;
    loadAlbumsFromDb(user.id);
  }, [view, user, loadAlbumsFromDb]);

  useEffect(() => {
    if (!sessionId) return;
    setAlbums((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.map((album) => {
        if (album.session_id !== sessionId) return album;
        const existingSettings = album.settings || {};
        const nextSettings = {
          ...existingSettings,
          albumSize,
          title: albumTitle,
          subtitle: albumSubtitle,
        };
        if (
          nextSettings.albumSize === existingSettings.albumSize &&
          nextSettings.title === existingSettings.title &&
          nextSettings.subtitle === existingSettings.subtitle
        ) {
          return album;
        }
        changed = true;
        return { ...album, settings: nextSettings };
      });
      return changed ? next : prev;
    });
  }, [sessionId, albumSize, albumTitle, albumSubtitle]);

  const promptDeleteAlbum = useCallback((album) => {
    setDeleteAlbumError("");
    setPendingDeleteAlbum(album);
  }, []);

  const cancelDeleteAlbum = useCallback(() => {
    if (deleteAlbumLoading) return;
    setPendingDeleteAlbum(null);
    setDeleteAlbumError("");
  }, [deleteAlbumLoading]);

  const confirmDeleteAlbum = useCallback(async () => {
    if (!pendingDeleteAlbum) return;
    setDeleteAlbumLoading(true);
    setDeleteAlbumError("");
    try {
      const removed = await deleteAlbum(pendingDeleteAlbum);
      if (removed) {
        setPendingDeleteAlbum(null);
      } else {
        setDeleteAlbumError("We couldn't delete this album. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setDeleteAlbumError("We couldn't delete this album. Please try again.");
    } finally {
      setDeleteAlbumLoading(false);
    }
  }, [deleteAlbum, pendingDeleteAlbum]);

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
        <Header className="header" pad="small">
          <Button className="logo-button" plain onClick={() => navigate("home")} hoverIndicator>
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
              className="modal-main modal-prompt"
              position="center"
              responsive={false}
              onEsc={() => setShowPrompt(false)}
              onClickOutside={() => setShowPrompt(false)}
            >
              <Box className="modal-contents" pad="large" gap="small" style={{ maxWidth: '90vw' }}>

                <Text size="large" textAlign="center" weight="bold" color="brand">You already have an album in session.</Text>
                <Text size="medium" textAlign="center"  margin={{ bottom: 'medium' }}>Would you like to continue or make a new one?</Text>
                <Box direction="row" gap="small" wrap>
                  <Button 
                   className="btn btn-primary small"
                    label="Continue"
                    
                    onClick={() => continueSession(latestAlbum)}
                    disabled={!latestAlbum}
                  />
                  <Button className="btn btn-secondary small" 
                    label="Show Previous Album"
                    onClick={() => {
                      setShowPrompt(false);
                      navigate('albums');
                    }}
                  />
                  <Button
                    
                     className="btn btn-secondary small"
                    label="New Session"
                    onClick={createNewSession}
                    disabled={!canCreateMoreAlbums}
                  />
                </Box>
                {!canCreateMoreAlbums && (
                  <Text size="small" color="status-critical">
                    {albumLimitMessage || `You can create up to ${MAX_ALBUMS_PER_USER} albums.`}
                  </Text>
                )}
              </Box>
            </Layer>
          )}
          {pendingDeleteAlbum && (
            <Layer
              position="center"
              responsive={false}
              onEsc={cancelDeleteAlbum}
              onClickOutside={cancelDeleteAlbum}
            >
              <Box pad="medium" gap="small" width="medium">
                <Text weight="bold">Delete this album?</Text>
                <Text size="small">
                  {`"${pendingDeleteAlbum.settings?.title?.trim() || "Untitled Album"}"`} and all of its
                  photos will be permanently removed.
                </Text>
                {deleteAlbumError && (
                  <Text size="small" color="status-critical">
                    {deleteAlbumError}
                  </Text>
                )}
                <Box direction="row" gap="small" justify="end">
                  <Button
                    label="Cancel"
                    onClick={cancelDeleteAlbum}
                    disabled={deleteAlbumLoading}
                  />
                  <Button
                    primary
                    color="status-critical"
                    label={deleteAlbumLoading ? "Deleting..." : "Delete"}
                    onClick={confirmDeleteAlbum}
                    disabled={deleteAlbumLoading}
                  />
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
            <AlbumsPage
              albums={albums}
              activeSessionId={sessionId}
              onOpen={continueSession}
              onCreate={createNewSession}
              onDelete={promptDeleteAlbum}
              canCreateMore={canCreateMoreAlbums}
              loading={albumsLoading}
              error={albumLimitMessage}
              maxAlbums={MAX_ALBUMS_PER_USER}
            />
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
            // Use BoxEditor for square albums (width === height), otherwise use EditorPage
            albumSize?.width === albumSize?.height ? (
              <BoxEditor
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
                onBack={() => navigate("products")}
              />
            ) : (
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
                onBack={() => navigate("products")}
              />
            )
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

