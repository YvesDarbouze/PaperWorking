'use client';

import React, { useState, useRef } from 'react';
import PropertySatelliteViewer from '@/components/maps/PropertySatelliteViewer';
import {
  Image as ImageIcon,
  CameraPlus,
  GlobeHemisphereWest,
  Star,
  Trash,
} from '@phosphor-icons/react';

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
      className={`rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10 space-y-5 ${className}`}
    >
      {/* Header & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ImageIcon size={18} className="text-primary" />
            <span>Property Imagery &amp; Satellite Documentation</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
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
            className="flex items-center gap-1.5 rounded-none bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50 min-h-[44px]"
          >
            <CameraPlus size={16} />
            <span>{isUploading ? 'Uploading…' : 'Add Property Photos'}</span>
          </button>
        </div>
      </div>

      {/* Main Showcase / Primary View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <div className="relative group overflow-hidden rounded-none border border-border bg-black/50 aspect-[16/9]">
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
              <span className="rounded-none bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/10">
                Primary Asset View
              </span>
              <span className="rounded-none bg-card/90 border border-border px-2.5 py-1 text-[10px] font-mono text-foreground uppercase tracking-wider backdrop-blur-md">
                {primaryImage?.category}
              </span>
            </div>
          </div>
        </div>

        {/* Live Satellite Screencap Card */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-none border border-border bg-muted/20 p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Satellite Parcel Screencap
              </span>
              <GlobeHemisphereWest size={16} className="text-primary" />
            </div>
            <PropertySatelliteViewer
              address={dealAddress}
              lat={lat}
              lng={lng}
              aspectRatio="4/3"
              showControls={false}
              className="rounded-none border border-border"
            />
          </div>

          <div className="rounded-none bg-muted/40 p-3 border border-border text-[11px] space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Target Address:</span>
              <span className="text-foreground font-medium truncate max-w-[150px]">{dealAddress}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Coordinates:</span>
              <span className="font-mono text-foreground">
                {lat ? lat.toFixed(4) : '30.2672'}°, {lng ? lng.toFixed(4) : '-97.7431'}°
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Photos:</span>
              <span className="text-foreground font-bold">{images.length}</span>
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
              className={`rounded-none px-3 py-1.5 text-xs font-semibold capitalize transition min-h-[36px] ${
                activeCategory === cat
                  ? 'bg-card text-foreground border border-border shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
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
                className={`group relative overflow-hidden rounded-none border aspect-square cursor-pointer transition ${
                  isCurrentPrimary
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border hover:border-foreground/30'
                }`}
                onClick={() => handleSetPrimary(img.id)}
              >
                <img
                  src={img.url}
                  alt={img.caption || 'Property image'}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />

                {isCurrentPrimary && (
                  <span className="absolute top-1.5 left-1.5 rounded-none bg-primary px-1.5 py-0.5 text-[8.5px] font-semibold text-primary-foreground uppercase tracking-wider">
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
                      className="rounded-none bg-black/50 p-2 text-white hover:bg-black/70 text-[10px] min-h-[36px] min-w-[36px] flex items-center justify-center border border-white/20"
                      title="Set as Primary"
                    >
                      <Star size={14} />
                    </button>
                  )}
                  {img.id !== 'img-satellite-default' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(img.id);
                      }}
                      className="rounded-none bg-destructive/60 p-2 text-destructive-foreground hover:bg-destructive text-[10px] min-h-[36px] min-w-[36px] flex items-center justify-center border border-destructive/40"
                      title="Delete Image"
                    >
                      <Trash size={14} />
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
