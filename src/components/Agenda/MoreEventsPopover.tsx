import React from 'react';

interface MoreEventsPopoverProps {
  selectedMoreEvents: {
    events: any[];
    position: {
      top: number;
      left: number;
    };
  } | null;
  onClose: () => void;
}

export function MoreEventsPopover({ selectedMoreEvents, onClose }: MoreEventsPopoverProps) {
  if (!selectedMoreEvents) return null;

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 p-2 min-w-[300px] max-h-[400px] overflow-y-auto"
      style={{
        top: selectedMoreEvents.position.top + 'px',
        left: selectedMoreEvents.position.left + 'px'
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Eventos Adicionais</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2">
        {selectedMoreEvents.events.map((event: any) => (
          <div
            key={event.id}
            className="p-2 rounded"
            style={{
              backgroundColor: event.backgroundColor || '#3788d8',
              color: event.textColor || '#ffffff'
            }}
          >
            <div className="font-semibold">{event.title}</div>
            <div className="text-sm">
              {new Date(event.start).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
              {' - '}
              {new Date(event.end).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            {event.extendedProps?.descricao && (
              <div className="text-sm mt-1 opacity-90">
                {event.extendedProps.descricao}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
