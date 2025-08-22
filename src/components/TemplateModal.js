// src/components/TemplateModal.js
import React from 'react';
import { Box, Button, Layer, Text } from 'grommet';
import { pageTemplates } from '../templates/pageTemplates';

export default function TemplateModal({ onSelect, onClose }) {
    return (
        <Layer
            position="center"
            responsive={false}
            onEsc={onClose}
            onClickOutside={onClose}
            modal
        >
            <Box pad="medium" width="large" gap="medium" style={{ maxWidth: '90vw' }}>
                <Box direction="row" justify="between" align="center">
                    <Text weight="bold">Templates</Text>
                    <Button label="Close" onClick={onClose} />
                </Box>

                <Box wrap direction="row" gap="small">
                    {pageTemplates.map(t => (
                        <Button
                            key={t.id}
                            onClick={() => onSelect(t.id)}
                            plain
                            a11yTitle={`Choose ${t.name}`}
                        >
                            <Box gap="xsmall" align="center">
                                <Box
                                    width="140px"
                                    height="90px"
                                    round="xsmall"
                                    overflow="hidden"
                                    border={{ color: 'dark-3' }}
                                    background={
                                        t.thumbnailUrl
                                            ? { image: `url(${t.thumbnailUrl})`, size: 'cover', position: 'center' }
                                            : 'light-4'
                                    }
                                />
                                <Text size="small">{t.name}</Text>
                            </Box>
                        </Button>
                    ))}
                </Box>
            </Box>
        </Layer>
    );
}
