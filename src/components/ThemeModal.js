import React, { useState } from 'react';
import { Box, Heading, Layer, Text } from 'grommet';
import { themeGroups } from '../templates/predefinedThemes';

// base ImageKit URL for transforming uploaded backgrounds
const IK_URL_ENDPOINT = process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "";

// helper to build an ImageKit resize URL with cache-busting
const getResizedUrl = (key, width = 1200) =>
    `${IK_URL_ENDPOINT}/${encodeURI(key)}?tr=w-${width},fo-face&v=${Date.now()}`;

export default function ThemeModal({
    onSelect,
    onClose,
    pageIdx,
    s3,
    sessionId,
    dynamicColors = [],
    paletteLoading = false,
    hasPaletteSources = false,
}) {
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

    const swatchProps = {
        round: 'xsmall',
        border: { color: 'light-4', size: 'xsmall' },
        className: 'themePaletteSwatch',
        role: 'button',
        tabIndex: 0,
        style: { cursor: 'pointer' },
    };

    const makeSwatchHandlers = (payload) => ({
        onClick: () => onSelect(pageIdx, payload),
        onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(pageIdx, payload);
            }
        },
    });

    return (
        <Layer
            position="center"
            responsive={false}
            onEsc={onClose}
            onClickOutside={onClose}
            className="themeModalContent modal-main"
            style={{ maxWidth: '90vw', overflowY: 'auto', maxHeight: '90vh' }}
        >
            <div className="modal-header">
                <h2>Theme Selection</h2>
                <button
                    type="button"
                    className="modal-close-button"
                    onClick={onClose}
                    aria-label="Close editor"
                >
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <Box
                className="modal-contents"
                gap="large"



            >
                <Box className='custom-upload'>

                    <Heading level={5} >Custom Image</Heading>
                    <Box pad={{ vertical: 'xsmall' }}>
                        {uploading ? (
                            <Text size="small">Uploading...</Text>
                        ) : (
                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                        )}
                    </Box>
                </Box>
                {themeGroups.map((group) => (
                    <Box key={group.name}>
                        <Heading level={5}>{group.name}</Heading>
                        <Box className="dynamicColors" direction="row" wrap gap="small" pad={{ vertical: 'xsmall' }}>
                            {group.dynamic ? (
                                <>
                                    <Box
                                        pad="small"
                                        border={{ color: 'brand', size: 'xsmall' }}
                                        round="xsmall"
                                        className="themePaletteAuto"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSelect(pageIdx, { mode: 'dynamic', color: null })}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onSelect(pageIdx, { mode: 'dynamic', color: null });
                                            }
                                        }}
                                    >
                                        <Text size="small">Auto</Text>
                                    </Box>
                                    {dynamicColors.length ? (
                                        dynamicColors.map((c, idx) => (
                                            <Box
                                                key={`${c}-${idx}`}
                                                background={c}
                                                {...swatchProps}
                                                {...makeSwatchHandlers({ mode: 'dynamic', color: c })}
                                            />
                                        ))
                                    ) : (
                                        <Text size="small" color="dark-5">
                                            {paletteLoading
                                                ? 'Extracting colors...'
                                                : hasPaletteSources
                                                    ? 'Generating palette...'
                                                    : 'Upload photos to unlock palette'}
                                        </Text>
                                    )}
                                </>
                            ) : (
                                group.colors.map((c) => (

                                    <Box
                                        key={c}
                                        background={c}
                                        {...swatchProps}
                                        {...makeSwatchHandlers({ mode: 'manual', color: c })}
                                    />
                                ))
                            )}
                        </Box>
                        <Box pad="medium">
                            
                        </Box>
                    </Box>
                    
                ))}
            </Box>
            
        </Layer>
    );
}
