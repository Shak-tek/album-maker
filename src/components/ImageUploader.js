// src/components/ImageUploader.js
import React from "react";
import {
    Box,
    FileInput,
    Grid,
    Image,
    Spinner,
    Text,
    Button,
} from "grommet";

const RESIZER_API_URL =
    process.env.REACT_APP_RESIZER_API_URL ||
    "https://rd654zmm4e.execute-api.us-east-1.amazonaws.com/prod/resize";

const ImageUploader = ({ uploads, setUploads, onContinue }) => {
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
        return resp.json();
    }

    async function uploadFileToS3(url, file) {
        const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
        });
        if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
    }

    const uploadBatch = async (batch) => {
        for (const { index, file } of batch) {
            setUploads((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], status: "uploading" };
                return next;
            });

            try {
                const { url, key } = await getPresignedUrl(file);
                await uploadFileToS3(url, file);

                const keyWithoutPrefix = key.replace(/^original\//, "");
                const encodedKey = encodeURIComponent(keyWithoutPrefix);
                const resizeUrl = `${RESIZER_API_URL}/${encodedKey}?width=300`;

                setUploads((prev) => {
                    const next = [...prev];
                    next[index] = {
                        ...next[index],
                        status: "waiting",
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

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploads((prev) => {
            const start = prev.length;
            const batch = files.map((file, i) => ({
                index: start + i,
                file,
                preview: URL.createObjectURL(file),
                displayUrl: null,
                status: "pending",
            }));
            uploadBatch(batch);
            return [...prev, ...batch];
        });
    };

    return (
        <Box pad="medium">
            {/* only show the file picker if there are no uploads yet */}
            {uploads.length === 0 && (
                <Box margin={{ bottom: "medium" }}>
                    <FileInput name="file" multiple onChange={handleFileChange} />
                </Box>
            )}

            {uploads.length > 0 && (
                <>
                    <Grid rows="small" columns="small" gap="small">
                        {uploads.map(({ preview, displayUrl, status }, i) => {
                            const isLoading = status !== "loaded";
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

                    <Box
                        direction="row"
                        align="center"
                        justify="between"
                        margin={{ top: "medium" }}
                        pad="small"
                        background="light-1"
                        round="xsmall"
                    >
                        <Text>{uploads.length} Photos Uploaded</Text>
                        <Button label="Continue" onClick={onContinue} primary />
                    </Box>
                </>
            )}
        </Box>
    );
};

export default ImageUploader;
