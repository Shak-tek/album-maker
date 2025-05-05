// src/components/UploadStepContent.js
import React from 'react';
import { Box, Button } from 'grommet';

export default function UploadStepContent({ fileInputRef }) {
    return (
        <Box pad="medium" gap="medium">

            <Box
                border={{ color: 'neutral-3', size: 'small' }}
                pad="large"
                round="small"
                align="center"
                justify="center"
                onClick={() => fileInputRef.current.click()}
                style={{ cursor: 'pointer' }}
                data-cy="uploadDropzone"
            >
                {/* we no longer render an <input> here */}
                <Button
                    label="Select Photos"
                    primary
                    onClick={() => fileInputRef.current.click()}
                    data-cy="uploadButton"
                />
            </Box>
        </Box>
    );
}

