'use client';

import React, { useState, useRef } from 'react';
import PropertySatelliteViewer from '@/components/maps/PropertySatelliteViewer';

export interface PropertyImageItem {
  id: string;
  url: string;
  caption?: string;
  category: 'exterior' | 'interior' | 'inspection' | 'satellite' | 'floorplan' | 'other';
  uploadedAt: string;
  isPrimary?: boolean;
}

export interface PropertyImageGalleryProps {
  projectId?: string;
  dealAddress: string;
  lat?: number | null;
  lng?: number | null;
  images?: PropertyImageItem[];
  onImagesChange?: (images: PropertyImageItem[]) => void;
  className?: string;
}

export default function PropertyImageGallery({
  projectId,
  dealAddress,
  lat,
  lng,
  images: initialImages = [],
  onImagesChange,
  className = '',
}: PropertyImageGalleryProps) {
  const [images, setImages] = useState<PropertyImageItem[]>(() => {
    if (initialImages && initialImages.length > 0) return initialImages;
    return [
      {
        id: 'img-satellite-default',
        url: `/api/map-tile?lat=${lat || 30.2672}&lng=${lng || -97.7431}&zoom=18&maptype=satellite&w=800&h=450`,
        caption: 'Satellite Parcel View',
        category: 'satellite',
        uploadedAt: new Date().toISOString(),
        isPrimary: true,
      },
    ];
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<PropertyImageItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newItems: PropertyImageItem[] = [];

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const newItem: PropertyImageItem = {
          id: `img-${Date.now()}-${index}`,
          url: result,
          caption: file.name.replace(/\.[^/.]+$/, ''),
          category: 'exterior',
          uploadedAt: new Date().toISOString(),
          isPrimary: images.length === 0 && index === 0,
        };
        newItems.push(newItem);

        if (newItems.length === files.length) {
          const updated = [...images, ...newItems];
          setImages(updated);
          if (onImagesChange) onImagesChange(updated);
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSetPrimary = (id: string) => {
    const updated = images.map((img) => ({
      ...img,
      isPrimary: img.id === id,
    }));
    setImages(updated);
    if (onImagesChange) onImagesChange(updated);
  };

  const handleDeleteImage = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    if (updated.length > 0 && !updated.some((i) => i.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setImages(updated);
    if (onImagesChange) onImagesChange(updated);
    if (selectedImage?.id === id) setSelectedImage(null);
  };

  const filteredImages = images.filter((img) => {
    if (activeCategory === 'all') return true;
    return img.category === activeCategory;
  });

  const primaryImage = images.find((i) => i.isPrimary) || images[0];

  return (
    <div
      data-testid="property-image-gallery"
      className={`rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-md space-y-5 ${className}`}
    >
      {/* Header & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">photo_library</span>
            <span>Property Imagery & Satellite Documentation</span>
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Attach inspection photos, architectural plans, and high-resolution satellite screencaps to this project.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            data-testid="upload-property-photo-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
            <span>{isUploading ? 'Uploading…' : 'Add Property Photos'}</span>
          </button>
        </div>
      </div>

      {/* Main Showcase / Primary View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/50 aspect-[16/9]">
            {primaryImage?.category === 'satellite' ? (
              <PropertySatelliteViewer
                address={dealAddress}
                lat={lat}
                lng={lng}
                aspectRatio="16/9"
                title={dealAddress}
              />
            ) : (
              <img
                src={primaryImage?.url}
                alt={primaryImage?.caption || dealAddress}
                className="h-full w-full object-cover"
              />
            )}

            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/10">
                Primary Asset View
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-mono text-emerald-400 uppercase tracking-wider backdrop-blur-md">
                {primaryImage?.category}
              </span>
            </div>
          </div>
        </div>

        {/* Live Satellite Screencap Card */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                Satellite Parcel Screencap
              </span>
              <span className="material-symbols-outlined text-[16px] text-emerald-400">
                satellite_alt
              </span>
            </div>
            <PropertySatelliteViewer
              address={dealAddress}
              lat={lat}
              lng={lng}
              aspectRatio="4/3"
              showControls={false}
              className="rounded-xl border border-white/10"
            />
          </div>

          <div className="rounded-xl bg-black/40 p-3 border border-white/5 text-[11px] space-y-1">
            <div className="flex justify-between text-white/60">
              <span>Target Address:</span>
              <span className="text-white font-medium truncate max-w-[150px]">{dealAddress}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Coordinates:</span>
              <span className="font-mono text-emerald-400">
                {lat ? lat.toFixed(4) : '30.2672'}°, {lng ? lng.toFixed(4) : '-97.7431'}°
              </span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Total Photos:</span>
              <span className="text-white font-bold">{images.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Filter Tabs & Thumbnails Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['all', 'exterior', 'interior', 'inspection', 'satellite', 'floorplan'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                activeCategory === cat
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filteredImages.map((img) => {
            const isCurrentPrimary = img.isPrimary;
            return (
              <div
                key={img.id}
                className={`group relative overflow-hidden rounded-xl border aspect-square cursor-pointer transition ${
                  isCurrentPrimary
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-white/10 hover:border-white/30'
                }`}
                onClick={() => handleSetPrimary(img.id)}
              >
                <img
                  src={img.url}
                  alt={img.caption || 'Property image'}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />

                {isCurrentPrimary && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[8.5px] font-semibold text-primary-foreground uppercase tracking-wider">
                    Cover
                  </span>
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                  {!isCurrentPrimary && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(img.id);
                      }}
                      className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30 text-[10px]"
                      title="Set as Primary"
                    >
                      <span className="material-symbols-outlined text-[14px]">star</span>
                    </button>
                  )}
                  {img.id !== 'img-satellite-default' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(img.id);
                      }}
                      className="rounded-lg bg-red-500/30 p-1.5 text-red-200 hover:bg-red-500/50 text-[10px]"
                      title="Delete Image"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
