// src/components/ImageUploader.js
import React, { useEffect, useState, useRef } from "react";
import { Box, Heading, Text } from "grommet";
import AWS from "aws-sdk";
import UploadStepContent from "./UploadStepContent";
import GridStep from "./GridStep";

const REGION = "us-east-1";
const IDENTITY_POOL_ID = "us-east-1:77fcf55d-2bdf-4f46-b979-ee71beb59193";
const BUCKET = "albumgrom";
const MAX_IMAGES = 100;
const MIN_IMAGES = 20;     // ← minimum required photos

// base ImageKit URL used for thumbnails
const IK_URL_ENDPOINT = process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "";

// helper to build a resize URL via ImageKit with cache-busting
const getResizedUrl = (key, width = 300) =>
    `${IK_URL_ENDPOINT}/${encodeURI(key)}?tr=w-${width},fo-face&v=${Date.now()}`;

export default function ImageUploader({ sessionId, onContinue }) {
    const [uploads, setUploads] = useState([]);
    const [step, setStep] = useState(1);
    const [s3Client, setS3Client] = useState(null);
    const fileInputRef = useRef();

    // Cognito + S3 init
    useEffect(() => {
        const creds = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: IDENTITY_POOL_ID,
        });
        AWS.config.update({ region: REGION, credentials: creds });
        creds.get(err => {
            if (!err) setS3Client(new AWS.S3({ apiVersion: "2006-03-01" }));
            else console.error("Cognito error", err);
        });
    }, []);


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

    // perform S3 uploads and overwrite preview with the ImageKit URL on success
    useEffect(() => {
        if (step !== 2 || !s3Client) return;

        uploads.forEach((u, idx) => {
            if (u.status !== "pending") return;

            const key = `${sessionId}/${Date.now()}_${u.file.name}`;
            updateUpload(idx, { status: "uploading", key });

            const managed = s3Client.upload({
                Bucket: BUCKET,
                Key: key,
                Body: u.file,
                ContentType: u.file.type,
            });

            managed.on("httpUploadProgress", evt => {
                updateUpload(idx, {
                    progress: Math.round((evt.loaded / evt.total) * 100),
                });
            });

            managed.send((err, data) => {
                if (err) {
                    updateUpload(idx, { status: "error" });
                } else {
                    const resized = getResizedUrl(key, 300);

                    updateUpload(idx, {
                        status: "uploaded",
                        uploadUrl: data.Location,
                        preview: resized,
                        progress: 100,
                    });
                }
            });
        });
    }, [step, uploads, s3Client, sessionId]);

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
