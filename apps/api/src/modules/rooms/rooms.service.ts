// ============================================================================
// TPT Doctor — Rooms & Resource Management Service
// ============================================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

export interface Room {
  id: string;
  tenantId: string;
  name: string;
  type: 'consultation' | 'examination' | 'procedure' | 'telemedicine' | 'waiting';
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved';
  capacity: number;
  equipment: string[];
  currentPatientId?: string;
  currentAppointmentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: string;
  roomId: string;
  name: string;
  type: string;
  serialNumber?: string;
  status: 'operational' | 'maintenance' | 'retired';
  lastCalibration?: string;
  nextCalibration?: string;
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private rooms: Map<string, Room> = new Map();
  private equipment: Map<string, Equipment> = new Map();

  constructor() {
    this.seedDefaultRooms();
  }

  private seedDefaultRooms(): void {
    const defaultRooms: Room[] = [
      { id: 'room-1', tenantId: 'default', name: 'Consultation Room 1', type: 'consultation', status: 'available', capacity: 1, equipment: ['exam-table', 'computer', 'stethoscope'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'room-2', tenantId: 'default', name: 'Examination Room 2', type: 'examination', status: 'available', capacity: 1, equipment: ['exam-table', 'otoscope', 'ophthalmoscope'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'room-3', tenantId: 'default', name: 'Procedure Room', type: 'procedure', status: 'available', capacity: 2, equipment: ['surgical-lights', 'sterilization', 'monitor'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'room-4', tenantId: 'default', name: 'Telemedicine Room', type: 'telemedicine', status: 'available', capacity: 1, equipment: ['camera', 'monitor', 'microphone'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    for (const room of defaultRooms) {
      this.rooms.set(room.id, room);
    }
    this.logger.log(`Seeded ${defaultRooms.length} default rooms`);
  }

  findAll(tenantId: string, status?: string): Room[] {
    let results = Array.from(this.rooms.values()).filter(r => r.tenantId === tenantId);
    if (status) results = results.filter(r => r.status === status);
    return results;
  }

  findOne(id: string): Room {
    const room = this.rooms.get(id);
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    return room;
  }

  create(room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>): Room {
    const id = `room-${Date.now()}`;
    const now = new Date().toISOString();
    const newRoom: Room = { ...room, id, createdAt: now, updatedAt: now };
    this.rooms.set(id, newRoom);
    return newRoom;
  }

  update(id: string, update: Partial<Room>): Room {
    const room = this.findOne(id);
    const updated = { ...room, ...update, id, updatedAt: new Date().toISOString() };
    this.rooms.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    if (!this.rooms.has(id)) throw new NotFoundException(`Room ${id} not found`);
    return this.rooms.delete(id);
  }

  assignPatient(roomId: string, patientId: string, appointmentId: string): Room {
    return this.update(roomId, { status: 'occupied', currentPatientId: patientId, currentAppointmentId: appointmentId });
  }

  releaseRoom(roomId: string): Room {
    return this.update(roomId, { status: 'cleaning', currentPatientId: undefined, currentAppointmentId: undefined });
  }

  // Equipment tracking
  addEquipment(eq: Omit<Equipment, 'id'>): Equipment {
    const id = `eq-${Date.now()}`;
    const newEq: Equipment = { ...eq, id };
    this.equipment.set(id, newEq);
    return newEq;
  }

  getEquipmentByRoom(roomId: string): Equipment[] {
    return Array.from(this.equipment.values()).filter(e => e.roomId === roomId);
  }

  getOccupancyStats(tenantId: string): { total: number; available: number; occupied: number; cleaning: number } {
    const rooms = this.findAll(tenantId);
    return {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'available').length,
      occupied: rooms.filter(r => r.status === 'occupied').length,
      cleaning: rooms.filter(r => r.status === 'cleaning').length,
    };
  }
}