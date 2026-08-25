'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  createSpikeSticky,
  updateSpikeStickyContent,
  updateSpikeStickyPosition,
  deleteSpikeSticky,
  type SpikeSticky,
} from '@/app/actions/spike-sticky';

// ─── Types ─────────────────────────────────────────────────────────────────────
type PresenceUser = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  focusedStickyId?: string | null; // which sticky they're hovering/editing
};

type CurrentUser = {
  id: string;
  nama: string;
  email: string;
  avatarUrl: string | null;
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
const PRESENCE_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function SpikeBoardClient({
  timId,
  timNama,
  currentUser,
  initialStickies,
}: {
  timId: string;
  timNama: string;
  currentUser: CurrentUser;
  initialStickies: SpikeSticky[];
}) {
  const [stickies, setStickies] = useState<SpikeSticky[]>(initialStickies);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceUser>>({});
  const [latencyLog, setLatencyLog] = useState<string[]>([]);
  const supabase = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabase.current.channel> | null>(null);
  const myColor = colorForUser(currentUser.id);
  const pendingTimestamps = useRef<Record<string, number>>({});

  // ─── Log latency helper ────────────────────────────────────────────────────
  const log = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setLatencyLog((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 20));
  }, []);

  // ─── Supabase Realtime setup ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.current.channel(`spike-board-${timId}`, {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    // 1. Postgres Changes — listen to spike_sticky_note table
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'spike_sticky_note', filter: `tim_id=eq.${timId}` },
      (payload) => {
        const now = Date.now();
        const eventType = payload.eventType;
        const newRow = payload.new as SpikeSticky;
        const oldRow = payload.old as Partial<SpikeSticky>;

        // Calculate latency if we tracked a send time
        const sentAt = pendingTimestamps.current[newRow?.id || oldRow?.id || ''];
        const latency = sentAt ? `${now - sentAt}ms` : '?';

        if (eventType === 'INSERT') {
          setStickies((prev) => {
            if (prev.find((s) => s.id === newRow.id)) return prev;
            return [...prev, newRow];
          });
          log(`📥 INSERT sticky ${newRow.id?.slice(0, 8)} — latency: ${latency}`);
        } else if (eventType === 'UPDATE') {
          setStickies((prev) => prev.map((s) => (s.id === newRow.id ? { ...s, ...newRow } : s)));
          log(`📥 UPDATE sticky ${newRow.id?.slice(0, 8)} — latency: ${latency}`);
        } else if (eventType === 'DELETE') {
          setStickies((prev) => prev.filter((s) => s.id !== oldRow.id));
          log(`📥 DELETE sticky ${(oldRow.id as string)?.slice(0, 8)} — latency: ${latency}`);
        }
      }
    );

    // 2. Presence — track who's online
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>();
      const users: Record<string, PresenceUser> = {};
      for (const [key, presences] of Object.entries(state)) {
        const p = (presences as unknown as PresenceUser[])[0];
        if (p) users[key] = p;
      }
      setOnlineUsers(users);
      log(`👥 Presence sync — ${Object.keys(users).length} user(s) online`);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const p = (newPresences as unknown as PresenceUser[])[0];
      if (p) {
        setOnlineUsers((prev) => ({ ...prev, [key]: p }));
        log(`➕ ${p.name} joined`);
      }
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      const p = (leftPresences as unknown as PresenceUser[])[0];
      setOnlineUsers((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      log(`➖ ${p?.name ?? key} left`);
    });

    // Subscribe & track self
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: currentUser.id,
          name: currentUser.nama,
          avatarUrl: currentUser.avatarUrl,
          color: myColor,
          focusedStickyId: null,
        } satisfies PresenceUser);
        log(`✅ Realtime channel SUBSCRIBED`);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [timId, currentUser.id, currentUser.nama, currentUser.avatarUrl, myColor, log]);

  // ─── Presence update helper ─────────────────────────────────────────────────
  const updatePresenceFocus = useCallback((stickyId: string | null) => {
    channelRef.current?.track({
      userId: currentUser.id,
      name: currentUser.nama,
      avatarUrl: currentUser.avatarUrl,
      color: myColor,
      focusedStickyId: stickyId,
    });
  }, [currentUser, myColor]);

  // ─── CRUD handlers ──────────────────────────────────────────────────────────
  const handleAddSticky = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = e.clientX - rect.left - 96;
    const posY = e.clientY - rect.top - 60;
    const sentAt = Date.now();
    const res = await createSpikeSticky(timId, posX, posY);
    if (res.success && res.data) {
      pendingTimestamps.current[res.data.id] = sentAt;
      log(`📤 CREATE sent, waiting Realtime echo...`);
    }
  };

  const handleDelete = async (id: string) => {
    pendingTimestamps.current[id] = Date.now();
    log(`📤 DELETE sent, waiting Realtime echo...`);
    await deleteSpikeSticky(id);
    // Optimistic local remove — Realtime will confirm
    setStickies((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm">
        <div>
          <span className="font-bold text-gray-800">🧪 Spike Board</span>
          <span className="ml-2 text-sm text-gray-500">{timNama}</span>
          <span className="ml-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-mono">SPIKE — hapus setelah test</span>
        </div>
        {/* Presence avatars */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-1">{Object.keys(onlineUsers).length} online:</span>
          {Object.values(onlineUsers).map((u) => (
            <div
              key={u.userId}
              title={u.name}
              style={{ backgroundColor: u.color }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow border-2 border-white"
            >
              {u.avatarUrl ? (
                <img src={u.avatarUrl} className="w-full h-full rounded-full object-cover" alt={u.name} />
              ) : (
                getInitials(u.name)
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          className="relative flex-1 overflow-auto"
          style={{ minHeight: 600, minWidth: 800 }}
          onDoubleClick={handleAddSticky}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <p className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-gray-400 pointer-events-none select-none">
            Double-click pada area kosong untuk menambah sticky note
          </p>

          {stickies.map((sticky) => (
            <StickyCard
              key={sticky.id}
              sticky={sticky}
              presenceUsers={onlineUsers}
              currentUserId={currentUser.id}
              onUpdateContent={async (id, content) => {
                pendingTimestamps.current[id] = Date.now();
                log(`📤 UPDATE content sent...`);
                await updateSpikeStickyContent(id, content);
              }}
              onUpdatePosition={async (id, x, y) => {
                pendingTimestamps.current[id] = Date.now();
                await updateSpikeStickyPosition(id, x, y);
              }}
              onDelete={handleDelete}
              onFocusEnter={() => updatePresenceFocus(sticky.id)}
              onFocusLeave={() => updatePresenceFocus(null)}
            />
          ))}
        </div>

        {/* Latency log panel */}
        <div className="w-72 bg-gray-900 text-green-400 text-[11px] font-mono p-3 overflow-y-auto flex flex-col gap-1 border-l border-gray-700">
          <p className="text-gray-500 font-bold mb-1">📡 Realtime Log</p>
          {latencyLog.length === 0 && <p className="text-gray-600">Menunggu events...</p>}
          {latencyLog.map((l, i) => (
            <p key={i} className="leading-relaxed break-words">{l}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── StickyCard Component ───────────────────────────────────────────────────────
function StickyCard({
  sticky,
  presenceUsers,
  currentUserId,
  onUpdateContent,
  onUpdatePosition,
  onDelete,
  onFocusEnter,
  onFocusLeave,
}: {
  sticky: SpikeSticky;
  presenceUsers: Record<string, PresenceUser>;
  currentUserId: string;
  onUpdateContent: (id: string, content: string) => Promise<void>;
  onUpdatePosition: (id: string, x: number, y: number) => Promise<void>;
  onDelete: (id: string) => void;
  onFocusEnter: () => void;
  onFocusLeave: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sticky.content);
  const [pos, setPos] = useState({ x: sticky.pos_x, y: sticky.pos_y });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep pos in sync with Realtime updates (from other users)
  useEffect(() => {
    if (!dragging.current) {
      setPos({ x: sticky.pos_x, y: sticky.pos_y });
    }
  }, [sticky.pos_x, sticky.pos_y]);

  useEffect(() => {
    if (!editing) setDraft(sticky.content);
  }, [sticky.content, editing]);

  // Who else is focused on this sticky?
  const otherFocused = Object.values(presenceUsers).filter(
    (u) => u.userId !== currentUserId && u.focusedStickyId === sticky.id
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editing) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

    const handleMouseMove = (e2: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e2.clientX - dragOffset.current.x, y: e2.clientY - dragOffset.current.y });
    };
    const handleMouseUp = async (e2: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const newX = e2.clientX - dragOffset.current.x;
      const newY = e2.clientY - dragOffset.current.y;
      setPos({ x: newX, y: newY });
      await onUpdatePosition(sticky.id, newX, newY);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleBlur = async () => {
    setEditing(false);
    onFocusLeave();
    if (draft.trim() !== sticky.content) {
      await onUpdateContent(sticky.id, draft.trim() || 'Kosong');
    }
  };

  const focusedBorderColor = otherFocused[0]?.color;

  return (
    <div
      className="absolute select-none"
      style={{ left: pos.x, top: pos.y, zIndex: editing ? 20 : 10 }}
      onMouseEnter={onFocusEnter}
      onMouseLeave={() => { if (!editing) onFocusLeave(); }}
    >
      {/* Presence indicator outline */}
      {otherFocused.length > 0 && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            outline: `2.5px solid ${focusedBorderColor}`,
            outlineOffset: 2,
          }}
        />
      )}

      <div
        className="w-48 rounded-lg shadow-md flex flex-col overflow-hidden"
        style={{ backgroundColor: sticky.color }}
      >
        {/* Drag handle header */}
        <div
          className="flex items-center justify-between px-2 py-1 cursor-grab active:cursor-grabbing"
          style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
          onMouseDown={handleMouseDown}
        >
          <span className="text-[10px] text-gray-600 truncate max-w-[110px]">
            {sticky.created_by_name ?? 'Anonim'}
          </span>
          <div className="flex items-center gap-1">
            {/* Other focused users avatars */}
            {otherFocused.map((u) => (
              <div
                key={u.userId}
                title={`${u.name} sedang mengedit...`}
                style={{ backgroundColor: u.color }}
                className="w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center"
              >
                {getInitials(u.name)}
              </div>
            ))}
            <button
              className="text-gray-400 hover:text-red-500 text-xs leading-none font-bold px-0.5"
              onClick={() => onDelete(sticky.id)}
              title="Hapus sticky"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        {editing ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            className="w-full p-2 text-xs text-gray-800 resize-none focus:outline-none bg-transparent"
            rows={5}
          />
        ) : (
          <div
            className="p-2 text-xs text-gray-800 min-h-[80px] cursor-text whitespace-pre-wrap break-words"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
          >
            {sticky.content}
          </div>
        )}

        {/* Presence typing indicator */}
        {otherFocused.length > 0 && (
          <div
            className="px-2 pb-1.5 text-[9px] font-semibold"
            style={{ color: focusedBorderColor }}
          >
            {otherFocused[0].name} sedang {editing ? 'mengetik...' : 'melihat...'}
          </div>
        )}
      </div>
    </div>
  );
}
