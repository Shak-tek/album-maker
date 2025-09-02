// src/components/TemplateModal.js
import React from 'react';
import { Box, Button, Layer, Text } from 'grommet';
import { pageTemplates } from '../templates/pageTemplates';

export default function TemplateModal({ onSelect, onClose }) {
    return (
        <Layer
            className="modalTemplatesWrap" 
            position="center"
            responsive={false}
            onEsc={onClose}
            onClickOutside={onClose}
            modal
        >
            <Box pad="medium" className="modalTemplates" width="" gap="medium" style={{ maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
                <Box direction="row" justify="between" align="center">
                    <Text weight="bold">Templates</Text>
                    <Button label="x" className="modalClose" Text="white" onClick={onClose} />
                </Box>

                <Box className="btnLayoutWrap" wrap direction="row">
                    {pageTemplates.map(t => (
                        <Button className="btnLayout" 
                            key={t.id}
                            onClick={() => onSelect(t.id)}
                            plain
                            a11yTitle={`Choose ${t.name}`}
                        >
                            
                                <Box
                                    
                                    height="110px"
                                    round="xsmall"
                                    overflow="hidden"
                                    border={{ color: '#efefef' }}
                                    background={
                                        t.thumbnailUrl
                                            ? { image: `url(${t.thumbnailUrl})`, size: 'contain', position: 'center' }
                                            : '#efefef'
                                    }
                                />
                                <Text size="small">{t.name}</Text>
                            
                        </Button>
                    ))}
                </Box>
            </Box>
        </Layer>
    );
}
