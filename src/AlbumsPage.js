import React, { useMemo } from "react";
import { Box, Text, Image, Button } from "grommet";
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
        width="small"
        gap="xsmall"
        border={{ color: isActive ? "brand" : "light-4", size: "small" }}
        pad="xsmall"
        background="white"
        round="small"
        onClick={() => onOpen && onOpen(album)}
        style={{ cursor: onOpen ? "pointer" : "default" }}
      >
        <Box
          height="small"
          overflow="hidden"
          round="xsmall"
          background="light-3"
          style={{ position: "relative" }}
        >
          {preview ? (
            <Image src={preview} fit="cover" />
          ) : (
            <Box fill align="center" justify="center" pad="small">
              <Text size="small" color="muted">
                Upload photos to see a preview
              </Text>
            </Box>
          )}
          {onDelete && (
            <Button
              icon={<Trash size="small" color="muted" />}
              plain
              onClick={handleDeleteClick}
              title="Delete album"
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                padding: 4,
                background: "rgba(255,255,255,0.85)",
                borderRadius: "50%",
              }}
            />
          )}
        </Box>
        <Box pad={{ horizontal: "xsmall", bottom: "xsmall" }} gap="xxsmall">
          <Text weight="bold" truncate>
            {title}
          </Text>
          <Text size="small" color="muted" truncate>
            {subtitle || "No subtitle yet"}
          </Text>
        </Box>
      </Box>
    );
  };

  const renderCreateCard = () => (
    <Box
      key="create-album"
      width="small"
      justify="center"
      align="center"
      gap="small"
      border={{ color: "brand", size: "small", style: "dashed" }}
      round="small"
      pad="medium"
      background="light-1"
      onClick={() => canCreateMore && onCreate && onCreate()}
      style={{ cursor: canCreateMore ? "pointer" : "not-allowed" }}
    >
      <Add color="brand" size="medium" />
      <Text weight="bold">Create Album</Text>
      {!canCreateMore && (
        <Text size="small" color="status-critical" textAlign="center">
          Album limit reached
        </Text>
      )}
    </Box>
  );

  const showEmptyState = !albums.length && !loading;

  return (
    <Box pad="large" gap="medium">
      <Box gap="xsmall">
        <Text weight="bold" size="large">
          My Albums
        </Text>
        <Text size="small" color="muted">
          You can keep up to {maxAlbums} albums in your library.
        </Text>
        {error && (
          <Text size="small" color="status-critical">
            {error}
          </Text>
        )}
      </Box>

      <Box direction="row" wrap gap="medium">
        {renderCreateCard()}
        {albums.map(renderAlbumCard)}
      </Box>

      {loading && <Text>Loading albums...</Text>}
      {showEmptyState && (
        <Text color="muted">No albums yet. Use the tile above to create your first album.</Text>
      )}
    </Box>
  );
}
