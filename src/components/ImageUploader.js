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

    useEffect(() => {
        const creds = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: IDENTITY_POOL_ID,
        });
        AWS.config.update({ region: REGION, credentials: creds });
        creds.get(err => {
            if (err) {
                console.error("Cognito credentials error", err);
            } else {
                console.log("Cognito credentials loaded");
                setS3Client(new AWS.S3({ apiVersion: "2006-03-01" }));
            }
        });
    }, []);

    const updateUpload = (idx, fields) =>
        setUploads(all => {
            const next = [...all];
            next[idx] = { ...next[idx], ...fields };
            return next;
        });

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

    useEffect(() => {
        if (step !== 2 || !s3Client) return;

        uploads.forEach((u, idx) => {
            if (u.status !== "pending") return;

            const key = `${Date.now()}_${u.file.name}`;
            updateUpload(idx, { status: "uploading", key });

            const params = {
                Bucket: BUCKET,
                Key: key,
                Body: u.file,
                ContentType: u.file.type,
            };
            const managed = s3Client.upload(params);

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
                <div className="sc-c375d746-0 cgsELq">
                    <div className="StyledBox-sc-13pk1d4-0 ejlvja">
                        <div className="sc-365135e5-0 hiBMtQ">
                            <div className="StyledBox-sc-13pk1d4-0 ejlvja sc-365135e5-2 iLaJx">
                                <h4
                                    data-cy="pageHeaderTitle"
                                    className="sc-667fcd26-0 gSocbr sc-365135e5-6 eIZYpf"
                                >
                                    Upload Photos
                                </h4>
                                <span className="StyledText-sc-1sadyjn-0 isRWVq sc-ba5846f0-0 AaXsc sc-365135e5-4 hGEUHG">
                                    Select the photos you would like to print to make your Photo Book.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sc-8340680b-1 alxti">
                    <div className="sc-c375d746-0 drLlWj">
                        <div className="StyledBox-sc-13pk1d4-0 ejlvja sc-64a41707-0 kgaqOo">
                            <div className="sc-64a41707-3 bLARkw" data-cy="uploadDropzone">
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
                            </div>
                        </div>
                    </div>
                </div>

                <form>
                    <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/tiff,image/gif,image/webp,image/heic,image/heif"
                        style={{ display: "none" }}
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                </form>
            </div>
        </div>
    );
}
