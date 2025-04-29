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

    // Update one upload entry
    const updateUpload = (idx, fields) =>
        setUploads((all) => {
            const next = [...all];
            next[idx] = { ...next[idx], ...fields };
            return next;
        });

    // AWS config
    useEffect(() => {
        AWS.config.update({
            region: REGION,
            credentials: new AWS.CognitoIdentityCredentials({
                IdentityPoolId: IDENTITY_POOL_ID,
            }),
        });
    }, []);

    const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

    // Handle file selection (append new)
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES - uploads.length);
        const newEntries = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            status: "pending",
            progress: 0,
            uploadUrl: null,
        }));
        setUploads((prev) => [...prev, ...newEntries]);
        // reset input so same file can be re-selected later
        e.target.value = "";
    };

    // Kick off all pending uploads
    const handleUploadAll = () => {
        uploads.forEach((u, idx) => {
            if (u.status !== "pending") return;
            const key = `${Date.now()}_${u.file.name}`;
            const params = {
                Bucket: BUCKET,
                Key: key,
                Body: u.file,
                ContentType: u.file.type,
            };

            updateUpload(idx, { status: "uploading" });
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

    const photosUploaded = uploads.filter((u) => u.status === "uploaded").length;
    const allDone = uploads.length > 0 && uploads.every((u) => u.status === "uploaded");

    return (
        <Box pad="medium">
            {/* hidden native file input */}
            <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
            />

            <Button
                label="Upload All"
                onClick={handleUploadAll}
                primary
                margin={{ bottom: "small" }}
                disabled={!uploads.some((u) => u.status === "pending")}
            />

            {uploads.length > 0 || (
                // if no uploads yet, show an initial Add button
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

            {/* Dynamic grid: one per upload + one Add cell */}
            {uploads.length > 0 && (
                <>
                    <Box margin={{ top: "medium" }}>
                        <Grid rows="small" columns={["small", "small", "small", "small"]} gap="small">
                            {uploads.map((slot, idx) => (
                                <Box
                                    key={idx}
                                    round="xsmall"
                                    border={{ color: "light-4", size: "xsmall" }}
                                    overflow="hidden"
                                    style={{ position: "relative" }}
                                    background="light-2"
                                >
                                    <GrommetImage
                                        fit="cover"
                                        src={slot.uploadUrl || slot.preview}
                                        alt={`Image ${idx}`}
                                        style={{ width: "100%", height: "100%" }}
                                    />

                                    {slot.status === "uploading" && (
                                        <>
                                            <Box
                                                fill
                                                align="center"
                                                justify="center"
                                                background={{ color: "black", opacity: "strong" }}
                                                style={{ position: "absolute", top: 0 }}
                                            >
                                                <Spinner />
                                                <Text margin={{ top: "small" }}>{`${slot.progress}%`}</Text>
                                            </Box>
                                            <Box
                                                pad={{ horizontal: "xsmall", bottom: "xsmall" }}
                                                style={{
                                                    position: "absolute",
                                                    bottom: 0,
                                                    width: "100%",
                                                }}
                                            >
                                                <Meter values={[{ value: slot.progress }]} max={100} thickness="small" />
                                            </Box>
                                        </>
                                    )}

                                    {slot.status === "error" && (
                                        <Text
                                            color="status-critical"
                                            margin="small"
                                            style={{ position: "absolute", top: 4, right: 4 }}
                                        >
                                            ❌
                                        </Text>
                                    )}
                                </Box>
                            ))}

                            {/* placeholder “add more” */}
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
                        <Button label="Continue" onClick={onContinue} primary disabled={!allDone} />
                    </Box>
                </>
            )}
        </Box>
    );
}
