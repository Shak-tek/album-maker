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
        >
            <Box pad="medium" width="medium" gap="small" style={{ maxWidth: '90vw' }}>
                <Box direction="row" justify="between" align="center">
                    <Text weight="bold">Templates</Text>
                    <Button label="×" onClick={onClose} />
                </Box>
                <Box wrap direction="row" gap="small">
                    {pageTemplates.map(t => (
                        <Button
                            key={t.id}
                            pad="none"
                            onClick={() => onSelect(t.id)}
                        >
                            <Box
                                width="100px"
                                height="60px"
                                background={t.thumbnailUrl ? `url(${t.thumbnailUrl})` : 'light-4'}
                                round="xsmall"
                                border={{ color: 'dark-3' }}
                                justify="center"
                                align="center"
                            >
                                <Text size="small">{t.name}</Text>
                            </Box>
                        </Button>
                    ))}
                </Box>
            </Box>
        </Layer>
    );
}
