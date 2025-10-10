import { describe, it, expect } from 'vitest';
import { calculateNewPosition, calculateBatchPositions, type TodoWithPosition } from './todoPositioning';

// Helper to create test todos
function createTodo(id: string, position: string, dateStr: string): TodoWithPosition {
  return {
    id,
    position,
    date: new Date(dateStr),
  };
}

describe('calculateNewPosition', () => {
  describe('moving to empty date', () => {
    it('should generate position when moving to a date with no todos', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-02', todos);

      expect(newPosition).toBeDefined();
      expect(typeof newPosition).toBe('string');
    });

    it('should generate position when moving to empty date without target index', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-02', todos, undefined);

      expect(newPosition).toBeDefined();
    });
  });

  describe('moving within same date', () => {
    it('should place todo at end when no target index specified', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
        createTodo('3', 'a2', '2024-01-01'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-01', todos);

      // New position should be greater than all existing positions
      expect(newPosition > 'a1').toBe(true);
      expect(newPosition > 'a2').toBe(true);
    });

    it('should place todo at beginning when target index is 0', () => {
      const todos = [
        createTodo('1', 'a1', '2024-01-01'),
        createTodo('2', 'a2', '2024-01-01'),
        createTodo('3', 'a3', '2024-01-01'),
      ];

      const newPosition = calculateNewPosition('3', '2024-01-01', todos, 0);

      // New position should be less than first position
      expect(newPosition < 'a1').toBe(true);
    });

    it('should place todo between two existing todos', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
        createTodo('3', 'a2', '2024-01-01'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-01', todos, 1);

      // New position should be between a1 and a2
      expect(newPosition > 'a1').toBe(true);
      expect(newPosition < 'a2').toBe(true);
    });

    it('should place todo at end when target index equals array length', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
        createTodo('3', 'a2', '2024-01-01'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-01', todos, 2);

      // New position should be greater than last position
      expect(newPosition > 'a2').toBe(true);
    });
  });

  describe('moving to different date', () => {
    it('should place todo at end of target date', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-02'),
        createTodo('3', 'a2', '2024-01-02'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-02', todos);

      // New position should be greater than all todos on target date
      expect(newPosition > 'a1').toBe(true);
      expect(newPosition > 'a2').toBe(true);
    });

    it('should place todo at specific index on different date', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-02'),
        createTodo('3', 'a2', '2024-01-02'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-02', todos, 1);

      // New position should be between a1 and a2
      expect(newPosition > 'a1').toBe(true);
      expect(newPosition < 'a2').toBe(true);
    });

    it('should handle moving to date with one todo', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-02'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-02', todos, 0);

      // New position should be before the existing todo
      expect(newPosition < 'a1').toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle single todo being moved to same date', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-01', todos);

      expect(newPosition).toBeDefined();
    });

    it('should correctly exclude the moved todo from position calculation', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
        createTodo('3', 'a2', '2024-01-01'),
      ];

      const newPosition = calculateNewPosition('2', '2024-01-01', todos, 2);

      // After excluding todo '2', the remaining todos are at positions a0 and a2
      // Target index 2 means after both, so position should be > a2
      expect(newPosition > 'a2').toBe(true);
    });

    it('should handle unsorted input todos', () => {
      const todos = [
        createTodo('1', 'a2', '2024-01-01'),
        createTodo('2', 'a0', '2024-01-01'),
        createTodo('3', 'a1', '2024-01-01'),
      ];

      const newPosition = calculateNewPosition('1', '2024-01-01', todos, 1);

      // After sorting: a0, a1. Position at index 1 should be between a0 and a1
      expect(newPosition > 'a0').toBe(true);
      expect(newPosition < 'a1').toBe(true);
    });
  });
});

describe('calculateBatchPositions', () => {
  describe('moving multiple todos to empty date', () => {
    it('should generate positions for all todos when target date is empty', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
        createTodo('3', 'a2', '2024-01-01'),
      ];

      const result = calculateBatchPositions(['1', '2'], '2024-01-02', todos);

      expect(result).toHaveLength(2);
      expect(result[0][0]).toBe('1');
      expect(result[1][0]).toBe('2');

      // Positions should be ordered
      const [, pos1] = result[0];
      const [, pos2] = result[1];
      expect(pos1 < pos2).toBe(true);
    });
  });

  describe('moving multiple todos to date with existing todos', () => {
    it('should append todos after existing ones', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
        createTodo('3', 'a0', '2024-01-02'),
        createTodo('4', 'a1', '2024-01-02'),
      ];

      const result = calculateBatchPositions(['1', '2'], '2024-01-02', todos);

      expect(result).toHaveLength(2);

      const [, pos1] = result[0];
      const [, pos2] = result[1];

      // Both positions should be after the existing todos on target date
      expect(pos1 > 'a1').toBe(true);
      expect(pos2 > 'a1').toBe(true);

      // Positions should be in order
      expect(pos1 < pos2).toBe(true);
    });

    it('should maintain order of moved todos', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
        createTodo('3', 'a2', '2024-01-01'),
      ];

      const result = calculateBatchPositions(['3', '1', '2'], '2024-01-02', todos);

      expect(result).toHaveLength(3);
      expect(result[0][0]).toBe('3');
      expect(result[1][0]).toBe('1');
      expect(result[2][0]).toBe('2');

      // Verify positions are in ascending order
      const [, pos1] = result[0];
      const [, pos2] = result[1];
      const [, pos3] = result[2];

      expect(pos1 < pos2).toBe(true);
      expect(pos2 < pos3).toBe(true);
    });
  });

  describe('moving todos within same date', () => {
    it('should append moved todos at end of same date', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
        createTodo('3', 'a2', '2024-01-01'),
        createTodo('4', 'a3', '2024-01-01'),
      ];

      const result = calculateBatchPositions(['1', '2'], '2024-01-01', todos);

      expect(result).toHaveLength(2);

      const [, pos1] = result[0];
      const [, pos2] = result[1];

      // After excluding moved todos, remaining are a2 and a3
      // New positions should be after a3
      expect(pos1 > 'a3').toBe(true);
      expect(pos2 > 'a3').toBe(true);
      expect(pos1 < pos2).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle moving single todo', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
      ];

      const result = calculateBatchPositions(['1'], '2024-01-02', todos);

      expect(result).toHaveLength(1);
      expect(result[0][0]).toBe('1');
      expect(result[0][1]).toBeDefined();
    });

    it('should handle empty todo list', () => {
      const todos: TodoWithPosition[] = [];

      const result = calculateBatchPositions(['1', '2'], '2024-01-01', todos);

      expect(result).toHaveLength(2);

      const [, pos1] = result[0];
      const [, pos2] = result[1];
      expect(pos1 < pos2).toBe(true);
    });

    it('should handle moving all todos from a date', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
      ];

      const result = calculateBatchPositions(['1', '2'], '2024-01-02', todos);

      expect(result).toHaveLength(2);

      const [, pos1] = result[0];
      const [, pos2] = result[1];
      expect(pos1 < pos2).toBe(true);
    });

    it('should generate unique positions for many todos', () => {
      const todos = [
        createTodo('1', 'a0', '2024-01-01'),
        createTodo('2', 'a1', '2024-01-01'),
        createTodo('3', 'a2', '2024-01-01'),
        createTodo('4', 'a3', '2024-01-01'),
        createTodo('5', 'a4', '2024-01-01'),
      ];

      const result = calculateBatchPositions(['1', '2', '3', '4', '5'], '2024-01-02', todos);

      expect(result).toHaveLength(5);

      // Verify all positions are unique and in order
      const positions = result.map(([, pos]) => pos);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(5);

      // Verify ascending order
      for (let i = 0; i < positions.length - 1; i++) {
        expect(positions[i] < positions[i + 1]).toBe(true);
      }
    });
  });
});
