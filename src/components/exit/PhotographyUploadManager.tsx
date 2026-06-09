'use client';

import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Eye, Film } from 'lucide-react';
import toast from 'react-hot-toast';
import FileDropzone from '@/components/shared/FileDropzone';

/* ═══════════════════════════════════════════════════════
   Photography Upload Manager — Phase 4 Module
   Manages professional photography / virtual tour
   uploads for MLS syndication.
   ═══════════════════════════════════════════════════════ */

interface PhotoAsset {
  id: string;
  name: string;
  type: 'Photo' | 'Video' | '3D Tour';
  room: string;
  url: string; // Firebase Storage or placeholder URL
  uploaded: boolean;
}

const SAMPLE_ASSETS: PhotoAsset[] = [
  { id: '1', name: 'hero_exterior_front.jpg', type: 'Photo', room: 'Exterior', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop', uploaded: true },
  { id: '2', name: 'kitchen_wide_angle.jpg', type: 'Photo', room: 'Kitchen', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop', uploaded: true },
  { id: '3', name: 'master_bath_detail.jpg', type: 'Photo', room: 'Master Bath', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=300&fit=crop', uploaded: true },
  { id: '4', name: 'aerial_drone_01.mp4', type: 'Video', room: 'Aerial', url: '', uploaded: false },
  { id: '5', name: 'matterport_3d_tour', type: '3D Tour', room: 'Full Property', url: '', uploaded: false },
];

const TYPE_ICONS: Record<PhotoAsset['type'], React.ReactNode> = {
  Photo: <ImageIcon className="w-4 h-4" />,
  Video: <Film className="w-4 h-4" />,
  '3D Tour': <Eye className="w-4 h-4" />,
};

interface Props {
  projectId: string;
}

export default function PhotographyUploadManager({ projectId }: Props) {
  const [assets, setAssets] = useState<PhotoAsset[]>(SAMPLE_ASSETS);

  const uploadedCount = assets.filter(a => a.uploaded).length;
  const photoCount = assets.filter(a => a.type === 'Photo' && a.uploaded).length;
  const videoCount = assets.filter(a => a.type === 'Video' && a.uploaded).length;

  const handleRemove = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleAddAsset = () => {
    setAssets([
      ...assets,
      {
        id: Math.random().toString(36).slice(2, 8),
        name: '',
        type: 'Photo',
        room: '',
        url: '',
        uploaded: false,
      },
    ]);
  };

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

      {/* Pending Upload Items */}
      <div className="space-y-4">
        {assets.filter(a => !a.uploaded).map(asset => (
          <div key={asset.id} className="p-4 border border-pw-border bg-pw-glass-bg/20 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-text-secondary">Type</label>
                <select
                  value={asset.type}
                  onChange={e => setAssets(assets.map(a => a.id === asset.id ? { ...a, type: e.target.value as any } : a))}
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
                  onChange={e => setAssets(assets.map(a => a.id === asset.id ? { ...a, room: e.target.value } : a))}
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
              onUploadComplete={(res) => {
                setAssets(assets.map(a => a.id === asset.id ? { 
                  ...a, 
                  name: res.storagePath.split('/').pop() || asset.room || 'Asset',
                  url: res.downloadUrl, 
                  uploaded: true 
                } : a));
                toast.success('Asset uploaded successfully');
              }}
            />

            <div className="flex justify-end">
              <button
                onClick={() => handleRemove(asset.id)}
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
