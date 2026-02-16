import { collaborationManager } from '../lib/CollaborationManager';

describe('CollaborationManager', () => {
  it('should be defined', () => {
    expect(collaborationManager).toBeDefined();
  });

  it('should have connect method', () => {
    expect(typeof collaborationManager.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    expect(typeof collaborationManager.disconnect).toBe('function');
  });

  it('should have getYDoc method', () => {
    expect(typeof collaborationManager.getYDoc).toBe('function');
  });
});
