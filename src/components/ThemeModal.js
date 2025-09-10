import React, { useState } from 'react';
import { Box, Layer, Text } from 'grommet';
import { themeGroups } from '../templates/predefinedThemes';

// base ImageKit URL for transforming uploaded backgrounds
const IK_URL_ENDPOINT = process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "";

// helper to build an ImageKit resize URL with cache-busting
const getResizedUrl = (key, width = 1200) =>
    `${IK_URL_ENDPOINT}/${encodeURI(key)}?tr=w-${width},fo-face&v=${Date.now()}`;

export default function ThemeModal({ onSelect, onClose, pageIdx, s3, sessionId }) {
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file || !s3 || !sessionId) return;

        const key = `${sessionId}/${Date.now()}_${file.name}`;
        try {
            setUploading(true);
            await s3
                .upload({ Key: key, Body: file, ContentType: file.type })
                .promise();
            const url = getResizedUrl(key, 1200);
            onSelect(pageIdx, { mode: 'image', image: url });
        } catch (err) {
            console.error('background upload error', err);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <Layer
            position="center"
            responsive={false}
            onEsc={onClose}
            onClickOutside={onClose}
        >
            <Box pad="small" gap="medium" width="medium" style={{ maxWidth: '90vw', overflowY: 'auto', maxHeight: '90vh' }}>
                <Box>
                    <Text weight="bold">Custom Image</Text>
                    <Box pad={{ vertical: 'xsmall' }}>
                        {uploading ? (
                            <Text size="small">Uploading...</Text>
                        ) : (
                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                        )}
                    </Box>
                </Box>
                {themeGroups.map(group => (
                    <Box key={group.name}>
                        <Text weight="bold">{group.name}</Text>
                        <Box className="dynamicColors" direction="row" wrap pad={{ vertical: 'xsmall' }}>
                            {group.dynamic
                                ? <Box
                                    pad="small"
                                    border={{ color: 'brand' }}
                                    round="xsmall"
                                    onClick={() => onSelect(pageIdx, { mode: 'dynamic' })}
                                >
                                    <Text size="small">Auto</Text>
                                </Box>
                                : group.colors.map(c => (
                                    <Box
                                        key={c}
                                        width="xxsmall"
                                        height="xxsmall"
                                        background={c}
                                        onClick={() => onSelect(pageIdx, { mode: 'manual', color: c })}
                                    />
                                ))
                            }
                        </Box>
                    </Box>
                ))}
            </Box>
        </Layer>
    );
}
