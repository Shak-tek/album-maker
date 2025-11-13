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
            <Box className="modalTemplates" width="" style={{ maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', zIndex: '1000' }}>
                

                <div className="modal-header">
                <h2>Templates</h2>
                <button
                    type="button"
                    className="modal-close-button"
                    onClick={onClose}
                    aria-label="Close editor"
                >
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

                <Box className="btnLayoutWrap modal-contents" wrap direction="row">
                    {pageTemplates.map(t => (
                        <Button className="btnLayout" 
                            key={t.id}
                            onClick={() => onSelect(t.id)}
                            plain
                            a11yTitle={`Choose ${t.name}`}
                        >
                            
                                <Box
                                    
                                    height="90px"
                                    round="xsmall"
                                    overflow="hidden"
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
