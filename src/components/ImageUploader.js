// src/components/ImageUploader.js
import React, { useState } from "react";
import {
    Box,
    FileInput,
    Form,
    Grid,
    Image,
    Text,
    Button,
} from "grommet";
import { Add } from "grommet-icons";

const MAX_IMAGES = 24;

const ImageUploader = () => {
    const [uploads, setUploads] = useState([]);

    // 1. Request a presigned URL from your Lambda/API
    async function getPresignedUrl(file) {
        const response = await fetch(
            "https://00z443975i.execute-api.us-east-1.amazonaws.com/prod/getPresignedUrl",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    filename: file.name,
                    filetype: file.type,
                }),
            }
        );
        if (!response.ok) {
            throw new Error(`Failed to get presigned URL: ${response.status}`);
        }
        return await response.json(); // { url, key }
    }

    // 2. Use that presigned URL to PUT the file directly to S3
    async function uploadFileToS3(presignedUrl, file) {
        const res = await fetch(presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
        });
        if (!res.ok) {
            throw new Error(`Failed to upload file to S3: ${res.status}`);
        }
    }

    // 3. Upload each file to S3 automatically once selected
    const uploadToS3 = async (fileObjects) => {
        for (const fileObj of fileObjects) {
            // Mark the file as "uploading" immediately
            setUploads((prev) => {
                const updated = [...prev];
                const index = updated.findIndex((u) => u === fileObj);
                if (index !== -1) {
                    updated[index].status = "uploading";
                }
                return updated;
            });

            try {
                const { url, key } = await getPresignedUrl(fileObj.file);
                await uploadFileToS3(url, fileObj.file);
                console.log("Uploaded file:", fileObj.file.name, "to S3 key:", key);

                // Update the file object to mark it as "done"
                setUploads((prev) => {
                    const updated = [...prev];
                    const index = updated.findIndex((u) => u === fileObj);
                    if (index !== -1) {
                        updated[index].status = "done";
                    }
                    return updated;
                });
            } catch (error) {
                console.error("Error uploading:", fileObj.file.name, error);
                // Mark file as error if the upload fails
                setUploads((prev) => {
                    const updated = [...prev];
                    const index = updated.findIndex((u) => u === fileObj);
                    if (index !== -1) {
                        updated[index].status = "error";
                    }
                    return updated;
                });
            }
        }
    };

    // Called whenever user selects new files
    const handleFileChange = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            const fileUploads = Array.from(event.target.files).map((file) => ({
                file,
                preview: URL.createObjectURL(file),
                status: "pending", // initial status
            }));

            setUploads((prev) => {
                const newUploads = [...prev, ...fileUploads];
                // Immediately trigger upload for newly selected files
                uploadToS3(fileUploads);
                return newUploads;
            });
        }
    };

    // Example “Continue” button logic
    const handleContinue = () => {
        alert("Continue clicked!");
    };

    const photosUploaded = uploads.length;
    const minimumRequired = 21;

    // Build a grid with placeholders for empty slots
    const slots = [];
    for (let i = 0; i < MAX_IMAGES; i++) {
        slots.push(uploads[i] || null);
    }

    return (
        <Box pad="medium">
            <Form>
                <FileInput name="file" multiple onChange={handleFileChange} />
            </Form>

            {uploads.length > 0 && (
                <>
                    <Box margin={{ top: "medium" }}>
                        <Grid rows="small" columns="small" gap="small">
                            {slots.map((slot, index) => {
                                if (!slot) {
                                    // Render a placeholder cell if nothing is in this slot
                                    return (
                                        <Box
                                            key={index}
                                            align="center"
                                            justify="center"
                                            background="light-2"
                                            overflow="hidden"
                                            round="xsmall"
                                            border={{ color: "light-4", size: "xsmall" }}
                                        >
                                            <Box align="center" justify="center" fill>
                                                <Add color="#585858" size="medium" />
                                            </Box>
                                        </Box>
                                    );
                                }

                                const { preview, status } = slot;
                                // Apply a grey filter if the image isn't done uploading
                                const filterStyle =
                                    status === "done"
                                        ? "none"
                                        : "grayscale(100%) opacity(0.5)";
                                return (
                                    <Box
                                        key={index}
                                        align="center"
                                        justify="center"
                                        background="light-2"
                                        overflow="hidden"
                                        round="xsmall"
                                        border={{ color: "light-4", size: "xsmall" }}
                                        style={{ position: "relative" }}
                                    >
                                        <Image
                                            fit="cover"
                                            src={preview}
                                            alt={`Preview ${index}`}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                filter: filterStyle,
                                            }}
                                        />
                                        {/* Show an overlay if not done */}
                                        {status !== "done" && (
                                            <Box
                                                fill
                                                align="center"
                                                justify="center"
                                                background={{ color: "dark-2", opacity: "strong" }}
                                                style={{
                                                    position: "absolute",
                                                    top: 0,
                                                    left: 0,
                                                }}
                                            >
                                                <Text color="light-1">Uploading...</Text>
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </Grid>
                    </Box>

                    {/* Footer with photos count and Continue button */}
                    <Box
                        direction="row"
                        align="center"
                        justify="between"
                        margin={{ top: "medium" }}
                        pad="small"
                        background="light-1"
                        round="xsmall"
                    >
                        <Box direction="row" gap="medium">
                            <Text>{photosUploaded} Photos Uploaded</Text>
                            <Text>{minimumRequired} Minimum Required</Text>
                        </Box>
                        <Button label="Continue" onClick={handleContinue} />
                    </Box>
                </>
            )}
        </Box>
    );
};

export default ImageUploader;
