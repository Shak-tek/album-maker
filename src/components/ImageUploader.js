// src/components/ImageUploader.js
import React, { useEffect, useState, useRef } from "react";
import { Box } from "grommet";
import AWS from "aws-sdk";
import UploadStepContent from "./UploadStepContent";
import GridStep from "./GridStep";

const REGION = "us-east-1";
const IDENTITY_POOL_ID = "us-east-1:77fcf55d-2bdf-4f46-b979-ee71beb59193";
const BUCKET = "albumgrom";
const MAX_IMAGES = 24;

export default function ImageUploader({ onContinue }) {
    const [uploads, setUploads] = useState([]);
    const [step, setStep] = useState(1);
    const [s3Client, setS3Client] = useState(null);
    const fileInputRef = useRef();

    // Initialize Cognito + S3 client
    useEffect(() => {
        const creds = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: IDENTITY_POOL_ID,
        });
        AWS.config.update({ region: REGION, credentials: creds });
        creds.get(err => {
            if (err) {
                console.error("Cognito credentials error", err);
            } else {
                setS3Client(new AWS.S3({ apiVersion: "2006-03-01" }));
            }
        });
    }, []);

    // Helper to update a single upload entry
    const updateUpload = (idx, fields) =>
        setUploads(all => {
            const next = [...all];
            next[idx] = { ...next[idx], ...fields };
            return next;
        });

    // When files are selected in UploadStepContent
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

    // Kick off S3 uploads for any pending items
    useEffect(() => {
        if (step !== 2 || !s3Client) return;

        uploads.forEach((u, idx) => {
            if (u.status !== "pending") return;

            const key = `${Date.now()}_${u.file.name}`;
            updateUpload(idx, { status: "uploading", key });

            const managed = s3Client.upload({
                Bucket: BUCKET,
                Key: key,
                Body: u.file,
                ContentType: u.file.type,
            });

            managed.on("httpUploadProgress", evt => {
                const pct = Math.round((evt.loaded / evt.total) * 100);
                updateUpload(idx, { progress: pct });
            });

            managed.send((err, data) => {
                if (err) {
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
    }, [step, uploads, s3Client]);

    const photosUploaded = uploads.filter(u => u.status === "uploaded").length;
    const allDone =
        uploads.length > 0 && uploads.every(u => u.status === "uploaded");

    return (
        <div className="StyledGrommet-sc-19lkkz7-0 daORNg">
            <div className="StyledBox-sc-13pk1d4-0 ejlvja sc-8340680b-0 jylZUp">
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
                                    allDone={allDone}
                                    onBack={() => setStep(1)}
                                    onContinue={() => onContinue(uploads)}
                                    fileInputRef={fileInputRef}
                                />
                            )}
                        </Box>
                    </Box>
                </Box>
            </div>

            {/* ← This hidden input is always rendered, so fileInputRef.current is never null */}
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
