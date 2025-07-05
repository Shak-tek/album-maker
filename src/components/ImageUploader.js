// src/components/ImageUploader.js
import React, { useEffect, useState, useRef } from "react";
import { Box, Heading, Text } from "grommet";
import { upload } from "@imagekit/react";
import UploadStepContent from "./UploadStepContent";
import GridStep from "./GridStep";

const IK_PUBLIC_KEY = process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY || "";
const IK_URL_ENDPOINT = process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "";
const IK_AUTH_ENDPOINT = process.env.REACT_APP_IMAGEKIT_AUTH_ENDPOINT || "";
const MAX_IMAGES = 100;
const MIN_IMAGES = 20;     // ← minimum required photos

// helper to build a resize URL via ImageKit with cache-busting
const getResizedUrl = (key, width = 300) =>
    `${IK_URL_ENDPOINT}/${encodeURI(key)}?tr=w-${width}&v=${Date.now()}`;

export default function ImageUploader({ sessionId, onContinue }) {
    const [uploads, setUploads] = useState([]);
    const [step, setStep] = useState(1);
    const fileInputRef = useRef();


    const updateUpload = (idx, fields) =>
        setUploads(all => {
            const next = [...all];
            next[idx] = { ...next[idx], ...fields };
            return next;
        });

    // file picker → add entries (temporary preview until upload finishes)
    const handleFileChange = e => {
        const files = Array.from(e.target.files || []).slice(
            0,
            MAX_IMAGES - uploads.length
        );
        if (!files.length) {
            e.target.value = "";
            return;
        }
        const newEntries = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            status: "pending",
            progress: 0,
            uploadUrl: null,
            key: null,
        }));
        setUploads(prev => [...prev, ...newEntries]);
        e.target.value = "";
        setStep(2);
    };

    // perform uploads via ImageKit and overwrite preview with your resizer URL on success
    useEffect(() => {
        if (step !== 2) return;

        uploads.forEach((u, idx) => {
            if (u.status !== "pending") return;

            const fileName = `${Date.now()}_${u.file.name}`;
            const key = `${sessionId}/${fileName}`;
            updateUpload(idx, { status: "uploading", key });

            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = evt => {
                if (evt.lengthComputable) {
                    updateUpload(idx, {
                        progress: Math.round((evt.loaded / evt.total) * 100),
                    });
                }
            };

            // obtain authentication parameters then upload
            fetch(IK_AUTH_ENDPOINT)
                .then(res => res.json())
                .then(({ signature, expire, token }) =>
                    upload({
                        file: u.file,
                        fileName,
                        publicKey: IK_PUBLIC_KEY,
                        signature,
                        expire,
                        token,
                        folder: sessionId,
                        xhr,
                    })
                )
                .then(result => {
                    const resized = getResizedUrl(result.filePath, 300);

                    updateUpload(idx, {
                        status: "uploaded",
                        uploadUrl: result.url,
                        preview: resized,
                        progress: 100,
                    });
                })
                .catch(() => updateUpload(idx, { status: "error" }));
        });
    }, [step, uploads, sessionId]);

    // counts & ready-flags
    const photosUploaded = uploads.filter(u => u.status === "uploaded").length;
    const allUploaded =
        uploads.length > 0 && uploads.every(u => u.status === "uploaded");
    const readyToContinue = allUploaded && photosUploaded >= MIN_IMAGES;

    return (
        <div className="StyledGrommet-sc-19lkkz7-0 daORNg">
            <div className="StyledBox-sc-13pk1d4-0 ejlvja sc-8340680b-0 jylZUp">
                {/* page header */}
                <Box gap="small" pad={{ horizontal: "medium", top: "medium" }}>
                    <Heading level={2} size="xlarge" margin="none">
                        Upload Photos
                    </Heading>
                    <Text size="small" color="dark-5">
                        Select the photos you would like to print to make your Photo Book.
                    </Text>
                </Box>

                <Box pad="medium">
                    <Box data-cy="uploadDropzone">
                        <Box
                            animation={[
                                { type: "fadeOut", duration: 200 },
                                { type: "fadeIn", duration: 200 },
                            ]}
                        >
                            {step === 1 ? (
                                <UploadStepContent fileInputRef={fileInputRef} />
                            ) : (
                                <GridStep
                                    uploads={uploads}
                                    photosUploaded={photosUploaded}
                                    minImages={MIN_IMAGES}
                                    allDone={readyToContinue}
                                    onBack={() => setStep(1)}
                                    onContinue={() => {
                                        if (readyToContinue) onContinue(uploads);
                                    }}
                                    fileInputRef={fileInputRef}
                                    // retry a failed thumbnail by regenerating the preview URL
                                    onImageError={idx => {
                                        const u = uploads[idx];
                                        updateUpload(idx, {
                                            preview: getResizedUrl(u.key, 300),
                                        });
                                    }}
                                />
                            )}
                        </Box>
                    </Box>
                </Box>
            </div>

            {/* single hidden input always mounted */}
            <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/tiff,image/gif,image/webp,image/heic,image/heif"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={handleFileChange}
            />
        </div>
    );
}
