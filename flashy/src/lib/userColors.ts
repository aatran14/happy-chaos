// Generate consistent colors for collaborative editing
const USER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#FFD93D', // Yellow
  '#C47AFF', // Purple
  '#6BCF7F', // Green
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
