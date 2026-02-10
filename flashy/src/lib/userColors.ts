// Generate consistent colors for collaborative editing
// RGB values: green(72,229,82), cyan(72,205,229), orange(253,187,93),
// blue(93,141,253), red(253,93,93), purple(191,130,232), pink(232,130,166)
const USER_COLORS = [
  '#4ebf56', // Green (78, 191, 86)
  '#41bbd1', // Cyan (65, 187, 209)
  '#FDBB5D', // Orange (253, 187, 93)
  '#5D8DFD', // Blue (93, 141, 253)
  '#FD5D5D', // Red (253, 93, 93)
  '#BF82E8', // Purple (191, 130, 232)
  '#E882A6', // Pink (232, 130, 166)
];

export function generateUserInfo() {
  // Generate or retrieve user ID from session storage
  let userId = sessionStorage.getItem('flashy_user_id');
  if (!userId) {
    userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('flashy_user_id', userId);
  }

  // Assign color based on user ID hash
  const colorIndex = Math.abs(hashCode(userId)) % USER_COLORS.length;
  const color = USER_COLORS[colorIndex];

  // Use the username from login, or fallback to anonymous name
  const username = sessionStorage.getItem('flashy_username');
  const name = username || `User ${Math.abs(hashCode(userId)) % 100}`;

  return { userId, color, name };
}

// Simple hash function for consistent color assignment
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}
