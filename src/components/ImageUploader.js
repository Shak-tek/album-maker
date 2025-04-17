// src/components/ImageUploader.js
import React, { useState } from "react";
import {
    Box,
    FileInput,
    Form,
    Grid,
    Image,
    Spinner,
    Text,
    Button,
} from "grommet";
import { Add } from "grommet-icons";

const MAX_IMAGES = 24;
const CLOUDFRONT_BASE_URL =
    process.env.REACT_APP_CLOUDFRONT_URL ||
    "https://d3tc9brglces8j.cloudfront.net";

const ImageUploader = () => {
    const [uploads, setUploads] = useState([]);

    // 1️⃣ Get presigned URL
    async function getPresignedUrl(file) {
        const resp = await fetch(
            "https://00z443975i.execute-api.us-east-1.amazonaws.com/prod/getPresignedUrl",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: file.name, filetype: file.type }),
            }
        );
        if (!resp.ok) throw new Error(`Presign failed: ${resp.status}`);
        return resp.json(); // { url, key }
    }

    // 2️⃣ Upload via PUT
    async function uploadFileToS3(presignedUrl, file) {
        const res = await fetch(presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
        });
        if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
    }

    // 3️⃣ After PUT, start polling HEAD on the low‑res key
    function pollForLowRes(index, lowResUrl) {
        const handle = setInterval(async () => {
            try {
                const resp = await fetch(lowResUrl, { method: "HEAD" });
                if (resp.ok) {
                    clearInterval(handle);
                    setUploads((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], status: "ready" };
                        return next;
                    });
                }
            } catch {
                // still not ready; keep polling
            }
        }, 2000);
    }

    // 4️⃣ Batch‐upload then queue polling
    const uploadBatch = async (batch) => {
        for (const entry of batch) {
            const { index, file } = entry;

            // mark "uploading"
            setUploads((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], status: "uploading" };
                return next;
            });

            try {
                const { url, key } = await getPresignedUrl(file);
                await uploadFileToS3(url, file);

                // low‑res key + URL
                const lowResKey = key.replace("original/", "low-res/");
                const lowResUrl = `${CLOUDFRONT_BASE_URL}/${lowResKey}`;

                // mark "waiting" and stash lowResUrl
                setUploads((prev) => {
                    const next = [...prev];
                    next[index] = {
                        ...next[index],
                        status: "waiting",
                        lowResUrl,
                    };
                    return next;
                });

                // begin polling
                pollForLowRes(index, lowResUrl);
            } catch (e) {
                console.error(`Upload error [${index}]`, e);
                setUploads((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], status: "error" };
                    return next;
                });
            }
        }
    };

    // When the user selects files
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploads((prev) => {
            const start = prev.length;
            const newEntries = files.map((file, i) => ({
                file,
                preview: URL.createObjectURL(file),
                lowResUrl: null,
                status: "pending",   // "pending" → "uploading" → "waiting" → "ready"
                index: start + i,
            }));
            uploadBatch(newEntries);
            return [...prev, ...newEntries];
        });
    };

    const photosUploaded = uploads.length;
    const minimumRequired = 21;

    // Build GRID slots up to MAX_IMAGES
    const slots = Array.from(
        { length: MAX_IMAGES },
        (_, i) => uploads[i] || null
    );

    return (
        <Box pad="medium">
            <Form>
                <FileInput name="file" multiple onChange={handleFileChange} />
            </Form>

            {uploads.length > 0 && (
                <>
                    <Box margin={{ top: "medium" }}>
                        <Grid rows="small" columns="small" gap="small">
                            {slots.map((slot, i) => {
                                if (!slot) {
                                    return (
                                        <Box
                                            key={i}
                                            align="center"
                                            justify="center"
                                            background="light-2"
                                            round="xsmall"
                                            border={{ color: "light-4", size: "xsmall" }}
                                        >
                                            <Add color="#585858" size="medium" />
                                        </Box>
                                    );
                                }

                                const { preview, lowResUrl, status } = slot;
                                // grey out everything until status === "ready"
                                const isLoading = status !== "ready";
                                // show low-res only when ready
                                const src = status === "ready" ? lowResUrl : preview;

                                return (
                                    <Box
                                        key={i}
                                        round="xsmall"
                                        border={{ color: "light-4", size: "xsmall" }}
                                        overflow="hidden"
                                        style={{ position: "relative" }}
                                    >
                                        <Image
                                            src={src}
                                            alt={`img-${i}`}
                                            fit="cover"
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                filter: isLoading
                                                    ? "grayscale(100%) opacity(0.4)"
                                                    : "none",
                                            }}
                                        />
                                        {isLoading && (
                                            <Box
                                                fill
                                                align="center"
                                                justify="center"
                                                background={{ color: "dark-2", opacity: "strong" }}
                                                style={{ position: "absolute", top: 0, left: 0 }}
                                            >
                                                <Spinner />
                                                <Text margin={{ top: "small" }}>
                                                    {status === "uploading"
                                                        ? "Uploading…"
                                                        : status === "waiting"
                                                            ? "Finalizing…"
                                                            : "Queued…"}
                                                </Text>
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
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
                        <Box direction="row" gap="medium">
                            <Text>{photosUploaded} Photos Uploaded</Text>
                            <Text>{minimumRequired} Minimum Required</Text>
                        </Box>
                        <Button label="Continue" onClick={() => alert("Continue")} />
                    </Box>
                </>
            )}
        </Box>
    );
};

export default ImageUploader;
