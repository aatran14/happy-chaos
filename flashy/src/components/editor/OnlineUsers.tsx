import { useEffect, useState } from 'react';
import { collaborationManager } from '../../lib/CollaborationManager';
import './OnlineUsers.css';

interface UserInfo {
  name: string;
  color: string;
  clientId: number;
}

export function OnlineUsers() {
  const [users, setUsers] = useState<UserInfo[]>([]);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const { provider } = await collaborationManager.connect();

        const updateUsers = () => {
          const states = provider.awareness.getStates();
          const userList: UserInfo[] = [];

          states.forEach((state: any, clientId: number) => {
            if (state.user?.name) {
              userList.push({
                name: state.user.name,
                color: state.user.color || '#999',
                clientId,
              });
            }
          });

          setUsers(userList);
        };

        // Initial update
        updateUsers();

        // Listen for awareness changes
        provider.awareness.on('change', updateUsers);

        cleanup = () => {
          provider.awareness.off('change', updateUsers);
          collaborationManager.disconnect();
        };
      } catch (error) {
        console.error('Failed to connect OnlineUsers:', error);
      }
    })();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  if (users.length === 0) return null;

  return (
    <div className="online-users">
      {users.map((user) => (
        <div
          key={user.clientId}
          className="online-user"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.name}
        </div>
      ))}
    </div>
  );
}
