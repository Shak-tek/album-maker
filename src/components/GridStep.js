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
        <Box pad="medium">
            <Grid rows="small" columns={["small", "small", "small", "small"]} gap="small">
                {uploads.map((slot, idx) => (
                    <Box
                        key={idx}
                        round="xsmall"
                        border={{ color: "light-4", size: "xsmall" }}
                        overflow="hidden"
                        background="light-2"
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

                {uploads.length < 24 && (
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
