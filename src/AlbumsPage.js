import React, { useMemo } from "react";
import { Box, Text, Image, Button, Heading, Paragraph } from "grommet";
import { Add, Trash } from "grommet-icons";

export default function AlbumsPage({
  albums = [],
  activeSessionId,
  onOpen,
  onCreate,
  onDelete,
  canCreateMore = true,
  loading = false,
  error = "",
  maxAlbums = 10,
}) {
  const coverPreviews = useMemo(() => {
    const pickCoverImage = (album) => {
      const settings = album?.settings;
      const pages = Array.isArray(settings?.pageSettings) ? settings.pageSettings : [];
      const coverPage = pages[0];
      if (coverPage) {
        const editPreview = coverPage.edits?.[0]?.previewDataUrl;
        if (editPreview) return editPreview;
        const assigned = coverPage.assignedImages?.[0];
        if (assigned) return assigned;
      }
      if (settings?.coverImage) return settings.coverImage;
      return null;
    };

    return albums.reduce((map, album) => {
      const preview = pickCoverImage(album);
      if (preview) {
        map[album.session_id] = preview;
      }
      return map;
    }, {});
  }, [albums]);

  const renderAlbumCard = (album) => {
    const settings = album.settings || {};
    const title = settings.title?.trim() || "Untitled Album";
    const subtitle = settings.subtitle?.trim();
    const isActive = album.session_id === activeSessionId;
    const preview = coverPreviews[album.session_id];
    const handleDeleteClick = (event) => {
      event.stopPropagation();
      if (onDelete) {
        onDelete(album);
      }
    };

    return (
      <Box
        key={album.session_id}
        className={`box-album ${isActive ? "active" : ""}`}

        color="white"


        onClick={() => onOpen && onOpen(album)}
        style={{ cursor: onOpen ? "pointer" : "default" }}
      >
        <Box
          className="box-holder"
        >
          <Box fill align="center" justify="center" pad="small" className="img-area">
            <Text size="small" color="gray" className="text-cat">Photobook</Text>
            {preview ? (
              <Image src={preview} fit="cover" />
            ) : (

              <Text size="small" className="text-upload">
                Upload photos to see a preview
              </Text>

            )}
          </Box>


          {onDelete && (
            <Button
              icon={<Trash size="small" color="muted" />}
              plain
              onClick={handleDeleteClick}
              className="btn-delete"
              title="Delete album"
              style={{

                color: "#fff",

              }}
            />
          )}
          <Box className="text-box" gap="xxsmall">
            <Heading level={6} margin="none">
              {title}
            </Heading>
            <Text size="small" truncate>
              {subtitle || "No subtitle yet"}
            </Text>
          </Box>
        </Box>

      </Box>
    );
  };

  const renderCreateCard = () => (
    <button
      key="create-album"
      className="btn btn-primary btn-create-album"
      onClick={() => canCreateMore && onCreate && onCreate()}
      style={{ cursor: canCreateMore ? "pointer" : "not-allowed" }}
    >
      <Add color="white" size="small" />
      <Text weight="bold">Create Album</Text>
      {!canCreateMore && (
        <Text size="small" color="gray" textAlign="center">
          Album limit reached
        </Text>
      )}
    </button>
  );

  const showEmptyState = !albums.length && !loading;

  return (
    <Box className="page-wrap" pad={{ vertical: 'xl1' }}>
      <div className="page-container">
        <Box className="album-page">
          <Box gap="xsmall" margin={{ bottom: 'xl1' }} direction="row" wrap className="heading-heder">
            <div className="heading-area">
              <Heading level={1} margin="none">
                My Albums
              </Heading>
              <Paragraph size="large" >
                You can keep up to {maxAlbums} albums in your library.
              </Paragraph>
              {error && (
                <Paragraph size="large" color="status-critical">
                  {error}
                </Paragraph>
              )}
            </div>
            <div className="btn-area">
              {renderCreateCard()}
            </div>
          </Box>

          <Box className="album-wrap">

            {albums.map(renderAlbumCard)}
          </Box>

          {loading && <Text>Loading albums...</Text>}
          {showEmptyState && (
            <Text color="muted">No albums yet. Use the tile above to create your first album.</Text>
          )}
        </Box>
      </div>
    </Box>
  );
}
