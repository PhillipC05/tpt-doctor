// ============================================================================
// TPT Doctor — Task Management Service
// ============================================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

export interface Task {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  category: string;
  relatedPatientId?: string;
  relatedAppointmentId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private tasks: Map<string, Task> = new Map();

  findAll(tenantId: string, status?: string, assignedTo?: string): Task[] {
    let results = Array.from(this.tasks.values()).filter(t => t.tenantId === tenantId);
    if (status) results = results.filter(t => t.status === status);
    if (assignedTo) results = results.filter(t => t.assignedTo === assignedTo);
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findOne(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const id = `task-${Date.now()}`;
    const now = new Date().toISOString();
    const newTask: Task = { ...task, id, createdAt: now, updatedAt: now };
    this.tasks.set(id, newTask);
    return newTask;
  }

  update(id: string, update: Partial<Task>): Task {
    const task = this.findOne(id);
    const updated = { ...task, ...update, id, updatedAt: new Date().toISOString() };
    if (update.status === 'completed') updated.completedAt = new Date().toISOString();
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    if (!this.tasks.has(id)) throw new NotFoundException(`Task ${id} not found`);
    return this.tasks.delete(id);
  }

  getStats(tenantId: string): { open: number; inProgress: number; completed: number; cancelled: number } {
    const tasks = this.findAll(tenantId);
    return {
      open: tasks.filter(t => t.status === 'open').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };
  }
}