import React, { useRef } from 'react';
import { Box, Button, Text } from 'grommet';
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

export default function DownloadPage({ albumSettings, title, subtitle, onBack }) {
    const refs = useRef([]);
    const { pageSettings = [], backgroundEnabled = true } = albumSettings || {};

    const handleDownload = (idx) => {
        const node = refs.current[idx];
        if (!node) return;
        toJpeg(node, { quality: 0.95 })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `page-${idx + 1}.jpeg`;
                link.href = dataUrl;
                link.click();
            })
            .catch(console.error);
    };

    const handleDownloadAll = () => {
        pageSettings.forEach((_, idx) => handleDownload(idx));
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
                    <Box key={pi} gap="small">
                        <Box
                            ref={el => refs.current[pi] = el}
                            className="photo-page"
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '500px',
                                paddingTop: '75%',
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
            <Button primary label="Download Album" onClick={handleDownloadAll} />
            <Button label="Back" onClick={onBack} />
        </Box>
    );
}
