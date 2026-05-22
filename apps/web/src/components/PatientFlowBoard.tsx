import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

interface RoomStatus {
  roomId: string;
  roomName: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  currentPatient?: {
    id: string;
    name: string;
    appointmentType: string;
    since: string;
    status: 'WAITING' | 'IN_CONSULT' | 'WITH_NURSE' | 'CHECK_IN' | 'COMPLETED';
  };
}

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'Waiting',
  IN_CONSULT: 'In Consult',
  WITH_NURSE: 'With Nurse',
  CHECK_IN: 'Checked In',
  COMPLETED: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  IN_CONSULT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  WITH_NURSE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  CHECK_IN: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const ROOM_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'border-green-400',
  OCCUPIED: 'border-blue-400',
  RESERVED: 'border-yellow-400',
  MAINTENANCE: 'border-red-400',
};

const DEFAULT_ROOMS: RoomStatus[] = [
  { roomId: '1', roomName: 'Room 1', status: 'AVAILABLE' },
  { roomId: '2', roomName: 'Room 2', status: 'AVAILABLE' },
  { roomId: '3', roomName: 'Room 3', status: 'AVAILABLE' },
  { roomId: '4', roomName: 'Room 4', status: 'AVAILABLE' },
  { roomId: '5', roomName: 'Room 5', status: 'AVAILABLE' },
  { roomId: '6', roomName: 'Triage', status: 'AVAILABLE' },
  { roomId: '7', roomName: 'Consultation', status: 'AVAILABLE' },
  { roomId: '8', roomName: 'Procedure', status: 'AVAILABLE' },
];

// Mock patients for demo
const MOCK_PATIENTS = [
  { id: 'p1', name: 'John Smith', appointmentType: 'Checkup' },
  { id: 'p2', name: 'Sarah Johnson', appointmentType: 'Follow-up' },
  { id: 'p3', name: 'Mike Brown', appointmentType: 'Consultation' },
  { id: 'p4', name: 'Emily Davis', appointmentType: 'Vaccination' },
  { id: 'p5', name: 'Robert Wilson', appointmentType: 'Lab Results' },
];

export function PatientFlowBoard() {
  const [rooms, setRooms] = useState<RoomStatus[]>(DEFAULT_ROOMS);
  const [queue, setQueue] = useState<{ id: string; name: string; appointmentType: string; status: string }[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    // Simulate WebSocket connection
    setSocketConnected(true);

    // Populate some initial data
    const initialRooms = [...DEFAULT_ROOMS];
    initialRooms[0] = {
      ...initialRooms[0],
      status: 'OCCUPIED',
      currentPatient: { id: 'p1', name: 'John Smith', appointmentType: 'Checkup', since: new Date().toISOString(), status: 'IN_CONSULT' },
    };
    initialRooms[1] = {
      ...initialRooms[1],
      status: 'OCCUPIED',
      currentPatient: { id: 'p2', name: 'Sarah Johnson', appointmentType: 'Follow-up', since: new Date().toISOString(), status: 'WAITING' },
    };
    initialRooms[3] = { ...initialRooms[3], status: 'RESERVED' };
    setRooms(initialRooms);
    setQueue([
      { id: 'p3', name: 'Mike Brown', appointmentType: 'Consultation', status: 'WAITING' },
      { id: 'p4', name: 'Emily Davis', appointmentType: 'Vaccination', status: 'WAITING' },
    ]);

    // Simulate periodic updates
    const interval = setInterval(() => {
      setRooms(prev => prev.map(r => ({
        ...r,
        currentPatient: r.currentPatient ? {
          ...r.currentPatient,
          status: r.currentPatient.status as any,
        } : undefined,
      })));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Moving patient from queue to room
    if (source.droppableId === 'queue' && destination.droppableId.startsWith('room-')) {
      const roomIndex = parseInt(destination.droppableId.replace('room-', ''));
      const patient = queue.find(p => p.id === draggableId);
      if (!patient) return;

      setRooms(prev => prev.map((r, i) => {
        if (i === roomIndex) {
          return {
            ...r,
            status: 'OCCUPIED' as const,
            currentPatient: {
              id: patient.id,
              name: patient.name,
              appointmentType: patient.appointmentType,
              since: new Date().toISOString(),
              status: 'CHECK_IN' as const,
            },
          };
        }
        return r;
      }));
      setQueue(prev => prev.filter(p => p.id !== draggableId));
    }

    // Moving between rooms
    if (source.droppableId.startsWith('room-') && destination.droppableId.startsWith('room-')) {
      const sourceIndex = parseInt(source.droppableId.replace('room-', ''));
      const destIndex = parseInt(destination.droppableId.replace('room-', ''));

      const sourcePatient = rooms[sourceIndex].currentPatient;
      if (!sourcePatient) return;

      setRooms(prev => prev.map((r, i) => {
        if (i === sourceIndex) return { ...r, status: 'AVAILABLE' as const, currentPatient: undefined };
        if (i === destIndex) return { ...r, status: 'OCCUPIED' as const, currentPatient: sourcePatient };
        return r;
      }));
    }

    // Move from room back to queue
    if (source.droppableId.startsWith('room-') && destination.droppableId === 'queue') {
      const sourceIndex = parseInt(source.droppableId.replace('room-', ''));
      const patient = rooms[sourceIndex].currentPatient;
      if (!patient) return;

      setRooms(prev => prev.map((r, i) => {
        if (i === sourceIndex) return { ...r, status: 'AVAILABLE' as const, currentPatient: undefined };
        return r;
      }));
      setQueue(prev => [...prev, { id: patient.id, name: patient.name, appointmentType: patient.appointmentType, status: 'WAITING' }]);
    }
  }, [queue, rooms]);

  const updatePatientStatus = useCallback((roomIndex: number, newStatus: string) => {
    setRooms(prev => prev.map((r, i) => {
      if (i === roomIndex && r.currentPatient) {
        const updatedPatient = { ...r.currentPatient, status: newStatus as any };
        return { ...r, currentPatient: updatedPatient };
      }
      return r;
    }));
  }, []);

  const completePatient = useCallback((roomIndex: number) => {
    setRooms(prev => prev.map((r, i) => {
      if (i === roomIndex) return { ...r, status: 'AVAILABLE' as const, currentPatient: undefined };
      return r;
    }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Patient Flow Board</h2>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', socketConnected ? 'bg-green-500' : 'bg-red-500')} />
          <span className="text-xs text-gray-500">{socketConnected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Patient Queue */}
          <div className="lg:col-span-1">
            <Card>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Waiting Room</h3>
                  <Badge>{queue.length}</Badge>
                </div>
              </div>
              <Droppable droppableId="queue">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn('p-2 min-h-[200px] space-y-2', snapshot.isDraggingOver && 'bg-blue-50 dark:bg-blue-900/20')}
                  >
                    {queue.map((patient, index) => (
                      <Draggable key={patient.id} draggableId={patient.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm cursor-grab',
                              snapshot.isDragging && 'shadow-lg ring-2 ring-blue-400'
                            )}
                          >
                            <p className="text-sm font-medium">{patient.name}</p>
                            <p className="text-xs text-gray-500">{patient.appointmentType}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {queue.length === 0 && (
                      <p className="text-center text-sm text-gray-400 py-8">No patients waiting</p>
                    )}
                  </div>
                )}
              </Droppable>
            </Card>
          </div>

          {/* Rooms Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {rooms.map((room, index) => (
                <Droppable key={room.roomId} droppableId={`room-${index}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'border-2 rounded-lg transition-colors',
                        ROOM_STATUS_COLORS[room.status],
                        snapshot.isDraggingOver && 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                      )}
                    >
                      <div className={cn(
                        'p-3 border-b',
                        room.status === 'AVAILABLE' ? 'bg-green-50 dark:bg-green-900/10' :
                        room.status === 'OCCUPIED' ? 'bg-blue-50 dark:bg-blue-900/10' :
                        room.status === 'RESERVED' ? 'bg-yellow-50 dark:bg-yellow-900/10' :
                        'bg-red-50 dark:bg-red-900/10'
                      )}>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">{room.roomName}</h4>
                          <Badge variant={
                            room.status === 'AVAILABLE' ? 'success' :
                            room.status === 'OCCUPIED' ? 'default' :
                            room.status === 'RESERVED' ? 'warning' : 'danger'
                          }>
                            {room.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3 min-h-[100px]">
                        {room.currentPatient ? (
                          <Draggable key={room.currentPatient.id} draggableId={room.currentPatient.id} index={0}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  'p-2 bg-white dark:bg-gray-700 rounded border cursor-grab',
                                  snapshot.isDragging && 'shadow-lg ring-2 ring-blue-400'
                                )}
                              >
                                <p className="text-sm font-medium truncate">{room.currentPatient!.name}</p>
                                <p className="text-xs text-gray-500">{room.currentPatient!.appointmentType}</p>
                                <div className="mt-2 flex gap-1">
                                  {['CHECK_IN', 'WAITING', 'WITH_NURSE', 'IN_CONSULT', 'COMPLETED'].map(status => (
                                    <button
                                      key={status}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (status === 'COMPLETED') {
                                          completePatient(index);
                                        } else {
                                          updatePatientStatus(index, status);
                                        }
                                      }}
                                      className={cn(
                                        'px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors',
                                        room.currentPatient?.status === status
                                          ? STATUS_COLORS[status]
                                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                      )}
                                    >
                                      {STATUS_LABELS[status]?.slice(0, 4)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ) : (
                          <p className="text-xs text-gray-400 text-center py-4">Drop patient here</p>
                        )}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}