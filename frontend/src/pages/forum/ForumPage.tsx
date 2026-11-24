import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { forumApi } from '../../api/forumApi';
import { useAuthContext } from '../../context/AuthContext';
import { connectChat } from '../../utils/wsClient';
import type { WsHandle, ChatMsg } from '../../utils/wsClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDateTime } from '../../utils/dateUtils';
import type { ForumThread, ForumPost } from '../../types/forum.types';
import toast from 'react-hot-toast';

export default function ForumPage() {
  const { constituencyId } = useParams<{ constituencyId: string }>();
  const cId = Number(constituencyId);
  const { user, token } = useAuthContext();

  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [chatMessages, setChatMessages] = useState<{ senderName: string; message: string; sentAt: string }[]>([]);
  const [newPost, setNewPost] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatHandleRef = useRef<WsHandle | null>(null);

  useEffect(() => {
    Promise.all([
      forumApi.getThreadsByConstituency(cId),
      forumApi.getChatHistory(cId),
    ]).then(([tRes, cRes]) => {
      setThreads(tRes.data.data);
      setChatMessages(cRes.data.data);
    }).finally(() => setLoading(false));
  }, [cId]);

  useEffect(() => {
    if (!token) return;
    const handle = connectChat(cId, token, (msg: ChatMsg) => {
      setChatMessages((prev) => [
        ...prev,
        { senderName: msg.senderName, message: msg.message, sentAt: msg.sentAt },
      ]);
    });
    chatHandleRef.current = handle;
    return () => {
      handle.close();
      chatHandleRef.current = null;
    };
  }, [cId, token]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const loadPosts = (thread: ForumThread) => {
    setSelectedThread(thread);
    forumApi.getPostsByThread(thread.id).then((r) => setPosts(r.data.data));
  };

  const submitPost = async () => {
    if (!selectedThread || !newPost.trim()) return;
    try {
      await forumApi.createPost(selectedThread.id, { body: newPost });
      setNewPost('');
      loadPosts(selectedThread);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to post');
    }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !chatHandleRef.current) return;
    chatHandleRef.current.send({ message: chatInput });
    setChatInput('');
  };

  const createThread = async () => {
    if (!newThreadTitle.trim() || !newThreadBody.trim()) return;
    try {
      await forumApi.createThread({ title: newThreadTitle, body: newThreadBody, constituencyId: cId, threadType: 'DISCUSSION' });
      setNewThreadTitle(''); setNewThreadBody('');
      forumApi.getThreadsByConstituency(cId).then((r) => setThreads(r.data.data));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create thread');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrap page-content">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Constituency {cId}</p>
        <h1 className="h1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Community forum</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Left: Threads sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* New thread form */}
          <div className="card-padded" style={{ padding: '1.25rem' }}>
            <h3 style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 600, fontSize: '0.875rem',
              color: 'var(--ink)', marginBottom: '0.875rem',
            }}>New thread</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <input value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)}
                placeholder="Title"
                className="input" style={{ fontSize: '0.875rem' }} />
              <textarea value={newThreadBody} onChange={(e) => setNewThreadBody(e.target.value)}
                placeholder="What do you want to discuss?"
                rows={2} className="input" style={{ fontSize: '0.875rem' }} />
              <button onClick={createThread} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                Post thread
              </button>
            </div>
          </div>

          {/* Thread list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {threads.length === 0 ? (
              <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.875rem', color: 'var(--muted)', padding: '1rem 0' }}>
                No threads yet. Start one above.
              </p>
            ) : threads.map((t) => {
              const isActive = selectedThread?.id === t.id;
              return (
                <button key={t.id} onClick={() => loadPosts(t)} style={{
                  width: '100%', textAlign: 'left',
                  background: isActive ? 'var(--ink)' : 'var(--paper)',
                  border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 0.875rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 500, fontSize: '0.875rem',
                    color: isActive ? '#fff' : 'var(--ink)',
                    marginBottom: '0.2rem',
                  }}>{t.title}</p>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.75rem',
                    color: isActive ? 'rgba(255,255,255,0.5)' : 'var(--muted)',
                  }}>{t.authorName}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Middle: Posts ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {selectedThread ? (
            <>
              <div style={{ borderBottom: '1px solid var(--rule)', paddingBottom: '1rem', marginBottom: '0.25rem' }}>
                <h2 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 600, fontSize: '1.25rem',
                  color: 'var(--ink)',
                }}>{selectedThread.title}</h2>
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
                maxHeight: 420, overflowY: 'auto', paddingRight: '0.25rem',
              }}>
                {posts.length === 0 ? (
                  <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)', fontSize: '0.9rem' }}>
                    No replies yet — be the first.
                  </p>
                ) : posts.map((p) => (
                  <div key={p.id} className="card" style={{ padding: '0.875rem 1rem' }}>
                    <p style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontSize: '0.9375rem', color: 'var(--ink)',
                      lineHeight: 1.6,
                    }}>{p.body}</p>
                    <p style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontSize: '0.75rem', color: 'var(--muted)',
                      marginTop: '0.5rem',
                    }}>{p.authorName} · {formatDateTime(p.createdAt)}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end', marginTop: 'auto' }}>
                <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Write a reply…" rows={2}
                  className="input" style={{ flex: 1, fontSize: '0.9rem' }} />
                <button onClick={submitPost} className="btn btn-primary btn-sm" style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
                  Reply
                </button>
              </div>
            </>
          ) : (
            <div style={{
              background: 'var(--paper)', border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)', padding: '3rem',
              textAlign: 'center', color: 'var(--muted)',
              fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.9375rem',
            }}>
              Select a thread to read and reply
            </div>
          )}
        </div>

        {/* ── Right: Live chat ── */}
        <div style={{
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex', flexDirection: 'column',
          minHeight: 480,
          position: 'sticky', top: 72,
        }}>
          <div style={{
            padding: '0.875rem 1rem',
            borderBottom: '1px solid var(--rule)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--saffron)', display: 'block' }} />
            <h3 style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)',
            }}>Live chat</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {chatMessages.map((m, i) => {
              const isOwn = m.senderName === user?.fullName;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  <span style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.6875rem', color: 'var(--muted)',
                    marginBottom: '0.2rem',
                  }}>{m.senderName}</span>
                  <div style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.875rem', lineHeight: 1.5,
                    padding: '0.5rem 0.75rem',
                    borderRadius: isOwn ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: isOwn ? 'var(--ink)' : 'rgba(15,25,35,0.06)',
                    color: isOwn ? '#fff' : 'var(--ink)',
                    maxWidth: '85%',
                  }}>{m.message}</div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div style={{
            padding: '0.75rem',
            borderTop: '1px solid var(--rule)',
            display: 'flex', gap: '0.5rem',
          }}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Message…"
              className="input" style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem 0.75rem' }} />
            <button onClick={sendChat} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          div[style*="gridTemplateColumns: '260px 1fr 280px'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
