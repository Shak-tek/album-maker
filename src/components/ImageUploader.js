// src/components/ImageUploader.js
import React, { useState, useEffect } from "react";
import {
    Box,
    FileInput,
    Grid,
    Image as GrommetImage,
    Spinner,
    Text,
    Button,
    Meter,
} from "grommet";

const RESIZER_API_URL =
    process.env.REACT_APP_RESIZER_API_URL ||
    "https://rd654zmm4e.execute-api.us-east-1.amazonaws.com/prod/resize";

// create thumbnail via canvas
const generateThumbnail = (file, maxSize = 200) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new window.Image();
            img.src = e.target.result;
            img.onload = () => {
                let { width, height } = img;
                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
                if (height >= width && height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        const url = URL.createObjectURL(blob);
                        resolve({ blob, url });
                    },
                    "image/jpeg",
                    0.7
                );
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });

// presign call with optional retries
async function getPresignedUrl(file, retries = 3, backoff = 500) {
    try {
        const resp = await fetch(
            "https://00z443975i.execute-api.us-east-1.amazonaws.com/prod/getPresignedUrl",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: file.name, filetype: file.type }),
            }
        );
        if (!resp.ok) throw new Error(`Presign failed: ${resp.status}`);
        return resp.json();
    } catch (err) {
        if (retries > 0) {
            await new Promise((r) => setTimeout(r, backoff));
            return getPresignedUrl(file, retries - 1, backoff * 2);
        }
        throw err;
    }
}

// XHR PUT to S3 so we can track onprogress
const uploadFileToS3 = (url, file, onProgress) =>
    new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status === 200) resolve();
            else reject(new Error(`S3 PUT failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("S3 PUT error"));
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
    });

const ImageUploader = ({ uploads, setUploads, onContinue }) => {
    // 1️⃣ Load any previously saved uploads from sessionStorage
    useEffect(() => {
        const saved = sessionStorage.getItem("uploads");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setUploads(
                    parsed.map(({ key, displayUrl }) => ({
                        file: null,
                        preview: displayUrl,    // show the resized URL as the thumbnail
                        displayUrl,
                        key,
                        status: "loaded",
                        progress: 100,
                    }))
                );
            } catch (e) {
                console.warn("Could not parse saved uploads:", e);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2️⃣ Persist every time uploads change (only key + displayUrl)
    useEffect(() => {
        const toSave = uploads
            .filter((u) => u.key && u.displayUrl)
            .map(({ key, displayUrl }) => ({ key, displayUrl }));
        sessionStorage.setItem("uploads", JSON.stringify(toSave));
    }, [uploads]);

    const processAndUpload = async (file, idx) => {
        try {
            // a) generate & show thumbnail
            const { url: thumbUrl } = await generateThumbnail(file);
            setUploads((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], preview: thumbUrl };
                return next;
            });

            // b) mark uploading
            setUploads((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], status: "uploading" };
                return next;
            });

            // c) presign + upload
            const { url, key } = await getPresignedUrl(file);
            await uploadFileToS3(url, file, (pct) => {
                setUploads((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], progress: pct };
                    return next;
                });
            });

            // d) build resized display URL
            const keyWithoutPrefix = key.replace(/^original\//, "");
            const resizeUrl = `${RESIZER_API_URL}/${encodeURIComponent(
                keyWithoutPrefix
            )}?width=300`;

            // e) store both displayUrl + key in state (and thus session)
            setUploads((prev) => {
                const next = [...prev];
                next[idx] = {
                    ...next[idx],
                    status: "waiting",
                    displayUrl: resizeUrl,
                    key,
                    progress: 100,
                };
                return next;
            });
        } catch (err) {
            console.error(`Upload error [${idx}]`, err);
            setUploads((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], status: "error" };
                return next;
            });
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploads((prev) => {
            const startIdx = prev.length;
            const newEntries = files.map((file) => ({
                file,
                preview: null,
                displayUrl: null,
                key: null,
                status: "pending",
                progress: 0,
            }));
            // kick off uploads in parallel
            newEntries.forEach((entry, i) =>
                processAndUpload(entry.file, startIdx + i)
            );
            return [...prev, ...newEntries];
        });
    };

    // footer state
    const total = uploads.length;
    const completed = uploads.filter((u) => u.progress === 100).length;
    const allDone = completed === total;
    const avgProgress =
        total === 0
            ? 0
            : Math.round(
                uploads.reduce((sum, u) => sum + (u.progress || 0), 0) / total
            );

    return (
        <Box pad="medium">
            {uploads.length === 0 && (
                <Box margin={{ bottom: "medium" }}>
                    <FileInput name="file" multiple onChange={handleFileChange} />
                </Box>
            )}

            {uploads.length > 0 && (
                <>
                    <Grid rows="small" columns="small" gap="small">
                        {uploads.map(({ preview, displayUrl, status }, i) => {
                            const isLoading = status !== "loaded" && status !== "error";
                            const src = displayUrl || preview
                            return (
                                <Box
                                    key={i}
                                    round="xsmall"
                                    border={{ color: "light-4", size: "xsmall" }}
                                    overflow="hidden"
                                    style={{ position: "relative" }}
                                >
                                    <GrommetImage
                                        src={src}
                                        alt={`img-${i}`}
                                        fit="cover"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            filter: isLoading
                                                ? "grayscale(100%) opacity(0.4)"
                                                : undefined,
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
                                                    ? `${uploads[i].progress || 0}%`
                                                    : status === "waiting"
                                                        ? "Resizing…"
                                                        : "Pending…"}
                                            </Text>
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                    </Grid>

                    {/* footer with aggregated progress bar */}
                    <Box
                        direction="row"
                        align="center"
                        justify="between"
                        margin={{ top: "medium" }}
                        pad="small"
                        background="light-1"
                        round="xsmall"
                        gap="medium"
                    >
                        <Box gap="small" flex>
                            <Meter
                                values={[{ value: avgProgress, label: "Upload %" }]}
                                max={100}
                                width="100%"
                                thickness="small"
                            />
                        </Box>
                        <Button
                            label="Continue"
                            onClick={onContinue}
                            primary
                            disabled={!allDone}
                        />
                    </Box>
                    <Text>
                        {completed} / {total} Photos Uploaded
                    </Text>
                </>
            )}
        </Box>
    );
};

export default ImageUploader;
