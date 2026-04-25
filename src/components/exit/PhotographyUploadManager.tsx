'use client';

import React, { useState } from 'react';
import { Camera, Upload, Image as ImageIcon, Trash2, Eye, Film, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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
  url: string; // Placeholder URL
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

export default function PhotographyUploadManager() {
  const [assets, setAssets] = useState<PhotoAsset[]>(SAMPLE_ASSETS);

  const uploadedCount = assets.filter(a => a.uploaded).length;
  const photoCount = assets.filter(a => a.type === 'Photo' && a.uploaded).length;
  const videoCount = assets.filter(a => a.type === 'Video' && a.uploaded).length;

  const handleUploadSimulate = (id: string) => {
    setAssets(assets.map(a => a.id === id ? { ...a, uploaded: true } : a));
    toast.success('Asset uploaded & queued for MLS syndication', { style: { background: '#1a1a1a', color: '#fff' } });
  };

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
    <div className="bg-pw-black border border-gray-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-mono tracking-widest text-emerald-500 uppercase">Photography & Media</h3>
        </div>
        <span className="text-xs text-text-secondary">{uploadedCount}/{assets.length} ready</span>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="p-2.5 bg-black/40 border border-gray-800 rounded-lg text-center">
          <p className="text-xs uppercase tracking-widest text-text-secondary">Photos</p>
          <p className="text-lg font-light text-white">{photoCount}</p>
        </div>
        <div className="p-2.5 bg-black/40 border border-gray-800 rounded-lg text-center">
          <p className="text-xs uppercase tracking-widest text-text-secondary">Videos</p>
          <p className="text-lg font-light text-white">{videoCount}</p>
        </div>
        <div className="p-2.5 bg-black/40 border border-gray-800 rounded-lg text-center">
          <p className="text-xs uppercase tracking-widest text-text-secondary">Total</p>
          <p className="text-lg font-light text-white">{uploadedCount}</p>
        </div>
      </div>

      {/* Uploaded Thumbnails Preview */}
      {assets.filter(a => a.uploaded && a.url).length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          {assets.filter(a => a.uploaded && a.url).map(asset => (
            <div key={asset.id} className="relative group rounded-lg overflow-hidden border border-gray-800 aspect-video">
              <img
                src={asset.url}
                alt={asset.room}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                loading="lazy"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-xs text-white font-medium">{asset.room}</p>
              </div>
              <button
                onClick={() => handleRemove(asset.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-black/60 rounded text-red-400 hover:text-red-300 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Upload Items */}
      <div className="space-y-2">
        {assets.filter(a => !a.uploaded).map(asset => (
          <div key={asset.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-lg bg-black/20 group">
            <div className="flex items-center space-x-3">
              <span className="text-text-secondary">{TYPE_ICONS[asset.type]}</span>
              <div>
                <p className="text-sm text-gray-300">{asset.name || 'Untitled Asset'}</p>
                <p className="text-xs text-text-secondary">{asset.type} · {asset.room || 'Unassigned'}</p>
              </div>
            </div>
            <button
              onClick={() => handleUploadSimulate(asset.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-800 rounded hover:bg-emerald-900/50 transition"
            >
              <Upload className="w-3 h-3" /> Upload
            </button>
          </div>
        ))}
      </div>

      {/* Add Asset Button */}
      <button
        onClick={handleAddAsset}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-700 rounded-lg text-xs text-text-secondary hover:text-gray-300 hover:border-gray-600 transition"
      >
        <Upload className="w-3 h-3" /> Add Media Asset
      </button>
    </div>
  );
}
