import { Project } from '@/types/schema';
import { DEFAULT_TODOS } from '@/lib/constants/todos';

/**
 * Computes the completion percentage for a specific phase of a project.
 * Calculation: (completed todos in phase / total todos in phase) * 100
 */
export function computePhaseProgress(project: Project, phase: number): number {
  const defaults = DEFAULT_TODOS[phase] || [];
  if (defaults.length === 0) return 0;

  const currentTodos = defaults.map(defaultTodo => {
    const savedTodo = project.actionItems?.find((t: any) => t.id === defaultTodo.id);
    return savedTodo ? { ...defaultTodo, ...savedTodo } : defaultTodo;
  });

  const completedCount = currentTodos.filter(todo => todo.completed).length;
  return Math.round((completedCount / currentTodos.length) * 100);
}
