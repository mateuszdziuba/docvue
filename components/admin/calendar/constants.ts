// 15-minute grid: 1 hour = 80px → 15min = 20px (clear slot visibility)
export const HOUR_HEIGHT = 80
export const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60
export const START_HOUR = 7   // 07:00
export const END_HOUR = 21    // 21:00
export const SNAP_MINUTES = 15
export const TOTAL_GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT // 1120px
export const TIME_LABEL_WIDTH = 56 // px for the time gutter on the left
