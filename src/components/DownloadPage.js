import React, { useRef, useState } from 'react';
import { Box, Button, Text, Layer } from 'grommet';
import { jsPDF } from 'jspdf';
import './EditorPage.css';
import { pageTemplates } from '../templates/pageTemplates';
import { toJpeg } from 'html-to-image';

const slotMargin = 5;
const gap = 5;
const halfWidth = (100 - 2 * slotMargin - gap) / 2;
const halfHeight = halfWidth;
const slotPositions = [
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${100 - 2 * slotMargin}%` },
    { top: `${slotMargin}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin + halfHeight + gap}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${100 - 2 * slotMargin}%` },
    { top: `${slotMargin}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${100 - 2 * slotMargin}%` },
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin + halfHeight + gap}%`, left: `${slotMargin}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin + halfHeight + gap}%`, left: `${slotMargin + halfWidth + gap}%`, width: `${halfWidth}%`, height: `${halfHeight}%` },
    { top: `${slotMargin}%`, left: `${slotMargin}%`, width: `${100 - 2 * slotMargin}%`, height: `${100 - 2 * slotMargin}%` },
];

const albumSizes = [
    { label: '20cm × 15cm', width: 20, height: 15 },
    { label: '27cm × 21cm', width: 27, height: 21 },
    { label: '35cm × 26cm', width: 35, height: 26 },
];

export default function DownloadPage({ albumSettings, title, subtitle, onBack }) {
    const refs = useRef([]);
    const { pageSettings = [], backgroundEnabled = true } = albumSettings || {};
    const [selectedSize, setSelectedSize] = useState(null);
    const [showDownloadMessage, setShowDownloadMessage] = useState(false);
    const paddingPercent = selectedSize ? (selectedSize.height / selectedSize.width) * 100 : 75;

    const handleDownloadAll = async () => {
        if (!selectedSize) return;
        setShowDownloadMessage(true);
        const { width, height } = selectedSize;
        const orientation = width >= height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({ orientation, unit: 'cm', format: [width, height] });

        for (let i = 0; i < pageSettings.length; i++) {
            const node = refs.current[i];
            if (!node) continue;
            // eslint-disable-next-line no-await-in-loop
            const dataUrl = await toJpeg(node, { quality: 0.95 });
            if (i > 0) pdf.addPage([width, height], orientation);
            pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
        }

        pdf.save('album.pdf');
        setShowDownloadMessage(false);
    };

    const getLarge = (url) => {
        if (!url) return url;
        // replace width transformation with 2000px and keep other params
        return url.replace(/w-\d+/, 'w-2000');
    };

    return (
        <Box pad="medium" gap="medium">
            {pageSettings.map((ps, pi) => {
                const tmpl = pageTemplates.find(t => t.id === ps.templateId);
                if (!tmpl) return null;
                return (
                    <Box key={pi} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                        <Box
                            ref={el => refs.current[pi] = el}
                            className="photo-page"
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '500px',
                                paddingTop: `${paddingPercent}%`,
                                backgroundColor: backgroundEnabled ? (ps.theme.color || 'transparent') : 'transparent'
                            }}
                        >
                            {pi === 0 && (
                                <Box
                                    style={{
                                        position: 'absolute',
                                        top: '5%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        textAlign: 'center',
                                        color: 'white',
                                        zIndex: 1,
                                    }}
                                >
                                    <Text weight="bold" size="xxlarge">
                                        {title}
                                    </Text>
                                    <Text size="large">{subtitle}</Text>
                                </Box>
                            )}
                            {tmpl.slots.map((slotPos, slotIdx) => (
                                <Box
                                    key={slotPos}
                                    className={`photo-slot slot${slotPos + 1}`}
                                    style={{
                                        position: 'absolute',
                                        overflow: 'hidden',
                                        borderRadius: '4px',
                                        ...slotPositions[slotPos]
                                    }}
                                >
                                    <img
                                        src={getLarge(ps.assignedImages[slotIdx])}
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                );
            })}
            <Box direction="row" gap="small" wrap>
                {albumSizes.map(size => (
                    <Box
                        key={size.label}
                        pad="medium"
                        border={{ color: selectedSize?.label === size.label ? 'brand' : 'border' }}
                        round="small"
                        onClick={() => setSelectedSize(size)}
                        style={{ cursor: 'pointer' }}
                    >
                        <Text>{size.label}</Text>
                    </Box>
                ))}
            </Box>
            <Button primary label="Download Album" onClick={handleDownloadAll} />
            <Button label="Back" onClick={onBack} />
            {showDownloadMessage && (
                <Layer position="center" responsive={false} modal>
                    <Box pad="medium">
                        <Text>Your download will start shortly...</Text>
                    </Box>
                </Layer>
            )}
        </Box>
    );
}
