import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Box, Button, Layer } from "grommet";
import "react-easy-crop/react-easy-crop.css";

export default function CropModal({ image, aspect, crop, onSave, onClose }) {
    const [cropPos, setCropPos] = useState({ x: crop?.x || 0, y: crop?.y || 0 });
    const [zoom, setZoom] = useState(crop?.zoom || 1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(crop || null);

    const handleCropComplete = useCallback((_, areaPixels) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    const handleSave = () => {
        if (croppedAreaPixels) {
            onSave({ ...croppedAreaPixels, zoom });
        } else {
            onSave({ x: 0, y: 0, width: 0, height: 0, zoom });
        }
    };

    return (
        <Layer onEsc={onClose} onClickOutside={onClose} responsive={false}>
            <Box pad="medium" gap="small">
                <Box width="medium" height="medium" style={{ position: "relative" }}>
                    <Cropper
                        image={image}
                        crop={cropPos}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCropPos}
                        onZoomChange={setZoom}
                        onCropComplete={handleCropComplete}
                    />
                </Box>
                <Box direction="row" justify="between">
                    <Button label="Cancel" onClick={onClose} />
                    <Button label="Save" onClick={handleSave} primary />
                </Box>
            </Box>
        </Layer>
    );
}
