// src/components/ImageUploader.js
import React, { useEffect, useState, useRef } from "react";
import {
    Box,
    Grid,
    Image as GrommetImage,
    Spinner,
    Text,
    Button,
    Meter,
} from "grommet";
import AWS from "aws-sdk";

const REGION = "us-east-1";
const IDENTITY_POOL_ID = "us-east-1:77fcf55d-2bdf-4f46-b979-ee71beb59193";
const BUCKET = "albumgrom";
const MAX_IMAGES = 24;

export default function ImageUploader({ onContinue }) {
    const [uploads, setUploads] = useState([]);
    const fileInputRef = useRef();

    const updateUpload = (idx, fields) =>
        setUploads((all) => {
            const next = [...all];
            next[idx] = { ...next[idx], ...fields };
            return next;
        });

    // Configure AWS
    useEffect(() => {
        AWS.config.update({
            region: REGION,
            credentials: new AWS.CognitoIdentityCredentials({
                IdentityPoolId: IDENTITY_POOL_ID,
            }),
        });
    }, []);

    // Upload a single file once we have creds
    const doUpload = (idx, file) => {
        AWS.config.credentials.get((credErr) => {
            if (credErr) {
                console.error("Cognito identity load failed", credErr);
                updateUpload(idx, { status: "error" });
                return;
            }

            const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
            const key = `${Date.now()}_${file.name}`;

            updateUpload(idx, { status: "uploading" });

            const params = {
                Bucket: BUCKET,
                Key: key,
                Body: file,
                ContentType: file.type,
            };

            const managed = s3.upload(params);
            managed.on("httpUploadProgress", (evt) => {
                const pct = Math.round((evt.loaded / evt.total) * 100);
                updateUpload(idx, { progress: pct });
            });
            managed.send((err, data) => {
                if (err) {
                    console.error("Upload error:", err);
                    updateUpload(idx, { status: "error" });
                } else {
                    updateUpload(idx, {
                        status: "uploaded",
                        uploadUrl: data.Location,
                        progress: 100,
                    });
                }
            });
        });
    };

    // Handle file selection & start each upload immediately
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []).slice(
            0,
            MAX_IMAGES - uploads.length
        );
        const newEntries = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            status: "pending",
            progress: 0,
            uploadUrl: null,
        }));

        setUploads((prev) => {
            const startIdx = prev.length;
            const next = [...prev, ...newEntries];
            newEntries.forEach((entry, i) =>
                doUpload(startIdx + i, entry.file)
            );
            return next;
        });

        e.target.value = ""; // allow re-selecting same files
    };

    const photosUploaded = uploads.filter((u) => u.status === "uploaded").length;
    const allDone =
        uploads.length > 0 && uploads.every((u) => u.status === "uploaded");

    return (
        <Box pad="medium">
            {/* hidden file input */}
            <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
            />

            {/* initial “Add photos” prompt */}
            {uploads.length === 0 && (
                <Box
                    align="center"
                    justify="center"
                    pad="large"
                    border={{ color: "light-4", size: "xsmall" }}
                    round="xsmall"
                    onClick={() => fileInputRef.current.click()}
                    style={{ cursor: "pointer" }}
                >
                    <Text size="large">+ Add Photos</Text>
                </Box>
            )}

            {/* dynamic grid */}
            {uploads.length > 0 && (
                <>
                    <Box margin={{ top: "medium" }}>
                        <Grid
                            rows="small"
                            columns={["small", "small", "small", "small"]}
                            gap="small"
                        >
                            {uploads.map((slot, idx) => {
                                const src = slot.uploadUrl || slot.preview;
                                return (
                                    <Box
                                        key={idx}
                                        round="xsmall"
                                        border={{ color: "light-4", size: "xsmall" }}
                                        overflow="hidden"
                                        position="relative"
                                        background="light-2"
                                    >
                                        {src && (
                                            <GrommetImage
                                                fit="cover"
                                                src={src}
                                                alt={`Image ${idx}`}
                                                style={{ width: "100%", height: "100%" }}
                                            />
                                        )}

                                        {slot.status === "uploading" && (
                                            <>
                                                <Box
                                                    fill
                                                    align="center"
                                                    justify="center"
                                                    background={{ color: "black", opacity: "strong" }}
                                                    position="absolute"
                                                    top="0"
                                                    left="0"
                                                >
                                                    <Spinner />
                                                    <Text margin={{ top: "small" }}>
                                                        {`${slot.progress}%`}
                                                    </Text>
                                                </Box>
                                                <Box
                                                    pad={{ horizontal: "xsmall", bottom: "xsmall" }}
                                                    position="absolute"
                                                    bottom="0"
                                                    left="0"
                                                    width="100%"
                                                >
                                                    <Meter
                                                        values={[{ value: slot.progress }]}
                                                        max={100}
                                                        thickness="small"
                                                    />
                                                </Box>
                                            </>
                                        )}

                                        {slot.status === "error" && (
                                            <Text
                                                color="status-critical"
                                                margin="small"
                                                position="absolute"
                                                top="4px"
                                                right="4px"
                                            >
                                                ❌
                                            </Text>
                                        )}
                                    </Box>
                                );
                            })}

                            {/* “add more” cell */}
                            {uploads.length < MAX_IMAGES && (
                                <Box
                                    key="add"
                                    align="center"
                                    justify="center"
                                    background="light-3"
                                    border={{ color: "light-4", size: "xsmall" }}
                                    round="xsmall"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    <Text size="xxlarge">+</Text>
                                </Box>
                            )}
                        </Grid>
                    </Box>

                    <Box
                        direction="row"
                        align="center"
                        justify="between"
                        margin={{ top: "medium" }}
                        pad="small"
                        background="light-1"
                        round="xsmall"
                    >
                        <Text>{photosUploaded} Photos Uploaded</Text>
                        <Button
                            label="Continue"
                            onClick={onContinue}
                            primary
                            disabled={!allDone}
                        />
                    </Box>
                </>
            )}
        </Box>
    );
}
