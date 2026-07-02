'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Image as ImageIcon, Trash2, Eye, Film, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import FileDropzone from '@/components/shared/FileDropzone';

/* ═══════════════════════════════════════════════════════
   Photography Upload Manager — Phase 4 Module
   Manages professional photography / virtual tour
   uploads for MLS syndication.

   Persistence: Firestore projects/{projectId}/mediaAssets
   ═══════════════════════════════════════════════════════ */

interface PhotoAsset {
  id: string;
  name: string;
  type: 'Photo' | 'Video' | '3D Tour';
  room: string;
  url: string;
  storagePath?: string;
  uploaded: boolean;
}

const TYPE_ICONS: Record<PhotoAsset['type'], React.ReactNode> = {
  Photo: <ImageIcon className="w-4 h-4" />,
  Video: <Film className="w-4 h-4" />,
  '3D Tour': <Eye className="w-4 h-4" />,
};

interface Props {
  projectId: string;
}

export default function PhotographyUploadManager({ projectId }: Props) {
  const [assets, setAssets] = useState<PhotoAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // Load persisted assets from Firestore on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import('@/lib/firebase/config').then(({ db }) =>
      import('firebase/firestore').then(({ collection, onSnapshot, query, orderBy }) => {
        const q = query(
          collection(db, 'projects', projectId, 'mediaAssets'),
          orderBy('uploadedAt', 'asc'),
        );
        const unsub = onSnapshot(q, snap => {
          if (cancelled) return;
          setAssets(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<PhotoAsset, 'id'>) })));
          setLoading(false);
        }, () => {
          if (!cancelled) setLoading(false);
        });
        return unsub;
      })
    ).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const uploadedCount = assets.filter(a => a.uploaded).length;
  const photoCount = assets.filter(a => a.type === 'Photo' && a.uploaded).length;
  const videoCount = assets.filter(a => a.type === 'Video' && a.uploaded).length;

  const handleRemove = useCallback(async (id: string) => {
    try {
      const { db } = await import('@/lib/firebase/config');
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'projects', projectId, 'mediaAssets', id));
    } catch {
      toast.error('Failed to remove asset');
    }
  }, [projectId]);

  const handleAddAsset = () => {
    // Add a pending (not yet uploaded) slot to local state; it gets persisted on upload
    const tempId = Math.random().toString(36).slice(2, 8);
    setAssets(prev => [...prev, { id: tempId, name: '', type: 'Photo', room: '', url: '', uploaded: false }]);
  };

  const handleUploadComplete = useCallback(async (
    tempId: string,
    room: string,
    assetType: PhotoAsset['type'],
    res: { downloadUrl: string; storagePath: string },
  ) => {
    const name = res.storagePath.split('/').pop() || room || 'Asset';
    const record: Omit<PhotoAsset, 'id'> = {
      name,
      type: assetType,
      room,
      url: res.downloadUrl,
      storagePath: res.storagePath,
      uploaded: true,
    };
    try {
      const { db } = await import('@/lib/firebase/config');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'projects', projectId, 'mediaAssets'), {
        ...record,
        uploadedAt: serverTimestamp(),
      });
      // Remove the local pending slot — onSnapshot will repopulate with the persisted doc
      setAssets(prev => prev.filter(a => a.id !== tempId));
      toast.success('Asset uploaded successfully');
    } catch {
      toast.error('Upload succeeded but failed to save — please try again');
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="glass-card border border-pw-border p-6 flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="glass-card border border-pw-border p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-pw-accent" />
          <h3 className="text-xs font-black tracking-[0.3em] text-text-primary uppercase">Photography & Media</h3>
        </div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{uploadedCount}/{assets.length} ready</span>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="p-2.5 bg-pw-glass-bg/40 border border-pw-border text-center">
          <p className="text-[9px] uppercase tracking-widest text-text-secondary">Photos</p>
          <p className="text-lg font-semibold text-text-primary">{photoCount}</p>
        </div>
        <div className="p-2.5 bg-pw-glass-bg/40 border border-pw-border text-center">
          <p className="text-[9px] uppercase tracking-widest text-text-secondary">Videos</p>
          <p className="text-lg font-semibold text-text-primary">{videoCount}</p>
        </div>
        <div className="p-2.5 bg-pw-glass-bg/40 border border-pw-border text-center">
          <p className="text-[9px] uppercase tracking-widest text-text-secondary">Total</p>
          <p className="text-lg font-semibold text-text-primary">{uploadedCount}</p>
        </div>
      </div>

      {/* Uploaded Thumbnails Preview */}
      {assets.filter(a => a.uploaded && a.url).length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          {assets.filter(a => a.uploaded && a.url).map(asset => (
            <div key={asset.id} className="relative group overflow-hidden border border-pw-border aspect-video">
              {asset.type === 'Photo' && asset.url.startsWith('http') ? (
                <img
                  src={asset.url}
                  alt={asset.room}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-pw-glass-bg/30 flex flex-col items-center justify-center text-text-secondary gap-1 p-2">
                  {TYPE_ICONS[asset.type]}
                  <span className="text-[9px] font-semibold truncate max-w-full">{asset.name}</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-pw-black/90 to-transparent p-2">
                <p className="text-xs text-pw-white font-medium">{asset.room || 'General'}</p>
              </div>
              <button
                onClick={() => handleRemove(asset.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-pw-black/60 text-color-error hover:text-color-error/80 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {assets.length === 0 && (
        <div className="py-8 text-center text-text-secondary text-xs">
          No media assets yet. Add your first photo or video below.
        </div>
      )}

      {/* Pending Upload Items */}
      <div className="space-y-4">
        {assets.filter(a => !a.uploaded).map(asset => (
          <div key={asset.id} className="p-4 border border-pw-border bg-pw-glass-bg/20 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-text-secondary">Type</label>
                <select
                  value={asset.type}
                  onChange={e => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, type: e.target.value as PhotoAsset['type'] } : a))}
                  className="w-full mt-1 text-xs border border-pw-border rounded px-2.5 py-1.5 bg-pw-glass-bg text-text-primary focus:outline-none"
                >
                  <option value="Photo">Photo</option>
                  <option value="Video">Video</option>
                  <option value="3D Tour">3D Tour</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-text-secondary">Room / Area</label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen, Exterior"
                  value={asset.room}
                  onChange={e => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, room: e.target.value } : a))}
                  className="w-full mt-1 text-xs border border-pw-border rounded px-2.5 py-1.5 bg-pw-glass-bg text-text-primary focus:outline-none"
                />
              </div>
            </div>

            <FileDropzone
              projectId={projectId}
              path="photography"
              accept={
                asset.type === 'Photo'
                  ? ['image/jpeg', 'image/png', 'image/webp']
                  : asset.type === 'Video'
                  ? ['video/mp4', 'video/quicktime']
                  : ['application/pdf', 'image/jpeg', 'image/png']
              }
              maxSize={asset.type === 'Video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024}
              label={`Upload ${asset.type}`}
              onUploadComplete={(res) => handleUploadComplete(asset.id, asset.room, asset.type, res)}
            />

            <div className="flex justify-end">
              <button
                onClick={() => setAssets(prev => prev.filter(a => a.id !== asset.id))}
                className="text-xs text-color-error hover:text-color-error/80 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Discard
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Asset Button */}
      <button
        onClick={handleAddAsset}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-dashed border-pw-border text-xs text-text-secondary hover:text-text-primary hover:border-pw-accent transition cursor-pointer"
      >
        <ImageIcon className="w-3.5 h-3.5" /> Add Media Asset
      </button>
    </div>
  );
}
