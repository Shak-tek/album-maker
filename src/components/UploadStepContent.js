// src/components/UploadStepContent.js
import React from 'react';
import { Box, Button, Heading, Text } from 'grommet';

export default function UploadStepContent({ fileInputRef }) {
    return (
        <Box pad="medium" gap="medium">
            <Box gap="small">
                <Heading level={2} size="xlarge" margin="none">
                    Upload Photos
                </Heading>
                <Text size="small" color="dark-5">
                    Select the photos you would like to print to make your Photo Book.
                </Text>
            </Box>

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

