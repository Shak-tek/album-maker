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
// your API Gateway invoke URL + /resize
const RESIZER_API_URL =
    process.env.REACT_APP_RESIZER_API_URL ||
    "https://rd654zmm4e.execute-api.us-east-1.amazonaws.com/prod/resize";

const ImageUploader = () => {
    const [uploads, setUploads] = useState([]);

    // 1️⃣ ask your Lambda for a presigned PUT URL
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

    // 2️⃣ PUT the file into S3
    async function uploadFileToS3(presignedUrl, file) {
        const res = await fetch(presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
        });
        if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
    }

    // 3️⃣ upload & then switch to the resize URL
    const uploadBatch = async (batch) => {
        for (const { index, file } of batch) {
            // mark uploading
            setUploads((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], status: "uploading" };
                return next;
            });

            try {
                const { url, key } = await getPresignedUrl(file);
                await uploadFileToS3(url, file);

                // strip the "original/" prefix and build your resize endpoint URL
                const keyWithoutPrefix = key.replace(/^original\//, "");
                const encodedKey = encodeURIComponent(keyWithoutPrefix);
                const resizeUrl = `${RESIZER_API_URL}/${encodedKey}?width=300`;

                // switch to waiting + set displayUrl
                setUploads((prev) => {
                    const next = [...prev];
                    next[index] = {
                        ...next[index],
                        status: "waiting",     // waiting for browser to fetch the resized image
                        displayUrl: resizeUrl,
                    };
                    return next;
                });
            } catch (err) {
                console.error(`Upload error [${index}]`, err);
                setUploads((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], status: "error" };
                    return next;
                });
            }
        }
    };

    // when the user picks files
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploads((prev) => {
            const start = prev.length;
            const batch = files.map((file, i) => ({
                file,
                preview: URL.createObjectURL(file),
                displayUrl: null,
                status: "pending",       // pending → uploading → waiting → loaded/error
                index: start + i,
            }));
            uploadBatch(batch);
            return [...prev, ...batch];
        });
    };

    const photosUploaded = uploads.length;
    const minimumRequired = 21;
    const slots = Array.from({ length: MAX_IMAGES }, (_, i) => uploads[i] || null);

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

                                const { preview, displayUrl, status } = slot;
                                const isLoading = status !== "loaded";
                                // use the dynamic‐resize URL once we have it
                                const src = displayUrl || preview;

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
                                            onLoad={() => {
                                                if (status === "waiting") {
                                                    setUploads((prev) => {
                                                        const next = [...prev];
                                                        next[i] = { ...next[i], status: "loaded" };
                                                        return next;
                                                    });
                                                }
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
                                                            ? "Resizing…"
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
