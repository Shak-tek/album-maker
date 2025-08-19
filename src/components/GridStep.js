import React from "react";
import {
    Box,
    Grid,
    Image as GrommetImage,
    Spinner,
    Text,
    Button,
    Meter,
} from "grommet";

export default function GridStep({
    uploads,
    photosUploaded,
    minImages,
    allDone,
    onBack,
    onContinue,
    fileInputRef,
}) {
    return (
        <Box>
            <Grid className="uploader-grid" rows="small" columns={['auto', 'auto', 'auto', 'auto', 'auto', 'auto']} gap="s4">
                {uploads.length < 24 && (
                    <Box
                        key="add"
                        align="center"
                        justify="center"
                        background="light2"
                        
                        
                        style={{ cursor: "pointer" }}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="24" height="24"><path fill="#585858" fill-rule="evenodd" d="M10.598 1.491c-.098.193-.098.445-.098.949v8.06H2.44c-.504 0-.756 0-.949.098a.9.9 0 0 0-.393.393C1 11.184 1 11.436 1 11.94v.12c0 .504 0 .756.098.949a.9.9 0 0 0 .393.393c.193.098.445.098.949.098h8.06v8.06c0 .504 0 .756.098.949a.9.9 0 0 0 .393.393c.193.098.445.098.949.098h.12c.504 0 .756 0 .949-.098a.9.9 0 0 0 .393-.393c.098-.193.098-.445.098-.949V13.5h8.06c.504 0 .756 0 .949-.098a.9.9 0 0 0 .393-.393c.098-.193.098-.445.098-.949v-.12c0-.504 0-.756-.098-.949a.9.9 0 0 0-.393-.393c-.193-.098-.445-.098-.949-.098H13.5V2.44c0-.504 0-.756-.098-.949a.9.9 0 0 0-.393-.393C12.816 1 12.564 1 12.06 1h-.12c-.504 0-.756 0-.949.098a.9.9 0 0 0-.393.393" clip-rule="evenodd"></path></svg>
                    </Box>
                )}
                {uploads.map((slot, idx) => (
                    <Box
                        key={idx}
                        overflow="hidden"
                        className="item-uploader"
                        style={{ position: "relative" }}
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
                                    style={{ position: "absolute", bottom: 0, width: "100%" }}
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

                
            </Grid>
            {/* ← Warning message if under the minimum */}
            {photosUploaded < minImages && (
                <Text
                    color="status-warning"
                    size="small"
                    margin={{ top: "small", bottom: "small", horizontal: "small" }}
                >
                    Please upload at least {minImages} photos to continue.
                </Text>
            )}

            <Box
                direction="row"
                align="center"
                justify="between"
                margin={{ top: "medium" }}
                pad="small"
                background="light-1"
                round="xsmall"
            >
                <Button label="Back" onClick={onBack} />
                <Button
                    label={`Continue (${photosUploaded}/${uploads.length})`}
                    onClick={onContinue}
                    primary
                    disabled={!allDone}
                />
            </Box>
        </Box>
    );
}
