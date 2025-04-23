import React from 'react';
import { Box, Layer, Text } from 'grommet';
import { themeGroups } from '../templates/predefinedThemes';

export default function ThemeModal({ onSelect, onClose, pageIdx }) {
    return (
        <Layer onEsc={onClose} onClickOutside={onClose}>
            <Box pad="small" gap="medium" width="medium">
                {themeGroups.map(group => (
                    <Box key={group.name}>
                        <Text weight="bold">{group.name}</Text>
                        <Box direction="row" wrap gap="small" pad={{ vertical: 'small' }}>
                            {group.dynamic
                                ? <Box
                                    pad="small"
                                    border={{ color: 'brand' }}
                                    round="xsmall"
                                    onClick={() => onSelect(pageIdx, { mode: 'dynamic' })}
                                >
                                    <Text size="small">Auto</Text>
                                </Box>
                                : group.colors.map(c => (
                                    <Box
                                        key={c}
                                        width="xxsmall"
                                        height="xxsmall"
                                        background={c}
                                        onClick={() => onSelect(pageIdx, { mode: 'manual', color: c })}
                                    />
                                ))
                            }
                        </Box>
                    </Box>
                ))}
            </Box>
        </Layer>
    );
}
