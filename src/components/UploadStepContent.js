// src/components/UploadStepContent.js
import React from 'react';
import { Box, Button } from 'grommet';

export default function UploadStepContent({ fileInputRef }) {
    const openPicker = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    return (
        <Box pad="medium" gap="medium">
            <Box
                border={{ color: 'neutral-3', size: 'small' }}
                pad="large"
                round="small"
                align="center"
                justify="center"
                onClick={openPicker}
                style={{ cursor: 'pointer' }}
                data-cy="uploadDropzone"
            >
                {/* No onClick here—clicks bubble up to the Box above */}
                <Button
                    label="Select Photos"
                    primary
                    // Prevent the button from stopping propagation,
                    // so it uses the Box's onClick
                    plain={false}
                />
            </Box>
        </Box>
    );
}
