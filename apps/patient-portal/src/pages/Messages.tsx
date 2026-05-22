import { useState } from 'react';

interface Message {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  unread: boolean;
  isUrgent: boolean;
}

const sampleMessages: Message[] = [
  {
    id: '1',
    from: 'Dr. Sarah Chen',
    subject: 'Lab Results Available',
    preview: 'Your recent lab results have been reviewed. Please log in to view them.',
    date: 'May 12, 2026',
    unread: true,
    isUrgent: false,
  },
  {
    id: '2',
    from: 'Billing Department',
    subject: 'Invoice #INV-2026-0042',
    preview: 'A new invoice is available for your recent visit on May 5, 2026.',
    date: 'May 10, 2026',
    unread: false,
    isUrgent: false,
  },
  {
    id: '3',
    from: 'Dr. James Wilson',
    subject: 'Prescription Refill Approved',
    preview: 'Your prescription refill request has been approved and sent to your pharmacy.',
    date: 'May 8, 2026',
    unread: false,
    isUrgent: false,
  },
];

export function Messages() {
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composeForm, setComposeForm] = useState({ subject: '', body: '' });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    // In production: POST /api/v1/messages
    setShowCompose(false);
    setComposeForm({ subject: '', body: '' });
    alert('Message sent successfully!');
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">Communicate with your care team</p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Compose Message
        </button>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Message</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={composeForm.body}
                  onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={6}
                  required
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Detail View */}
      {selectedMessage ? (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => setSelectedMessage(null)}
              className="text-sm text-blue-600 hover:text-blue-800 mb-2 block"
            >
              ← Back to messages
            </button>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">{selectedMessage.subject}</h2>
              {selectedMessage.isUrgent && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Urgent
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">From: {selectedMessage.from}</p>
            <p className="text-sm text-gray-400">{selectedMessage.date}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-gray-700">{selectedMessage.preview}</p>
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => { setShowCompose(true); setSelectedMessage(null); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Reply
            </button>
          </div>
        </div>
      ) : (
        /* Messages List */
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-200">
            {sampleMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className={`text-sm ${msg.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {msg.subject}
                      </p>
                      {msg.unread && (
                        <span className="ml-2 h-2 w-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                      )}
                      {msg.isUrgent && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{msg.from}</p>
                    <p className="mt-1 text-sm text-gray-400 truncate">{msg.preview}</p>
                  </div>
                  <span className="ml-4 text-xs text-gray-400 flex-shrink-0">{msg.date}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}