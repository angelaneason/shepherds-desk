'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Loader2, Check, X, ArrowUp, ArrowDown, ScanLine } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PageItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface ScanSermonProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScanSermon({ isOpen, onClose }: ScanSermonProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [pages, setPages] = useState<PageItem[]>([]);
  const [title, setTitle] = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newSermonId, setNewSermonId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPages = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setPages((prev) => [...prev, ...newPages]);
      setError(null);
    }
  };

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const movePageUp = (index: number) => {
    if (index === 0) return;
    setPages((prev) => {
      const newPages = [...prev];
      const temp = newPages[index - 1];
      newPages[index - 1] = newPages[index];
      newPages[index] = temp;
      return newPages;
    });
  };

  const movePageDown = (index: number) => {
    if (index === pages.length - 1) return;
    setPages((prev) => {
      const newPages = [...prev];
      const temp = newPages[index + 1];
      newPages[index + 1] = newPages[index];
      newPages[index] = temp;
      return newPages;
    });
  };

  const processText = (text: string) => {
    // Split by double newline to form paragraphs
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  };

  const handleProcess = async () => {
    if (!title.trim()) {
      setError('Please provide a sermon title.');
      return;
    }
    if (pages.length === 0) {
      setError('Please add at least one page to scan.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let combinedHtml = '';

      for (let i = 0; i < pages.length; i++) {
        setProgressMsg(`Converting page ${i + 1} of ${pages.length}...`);
        
        const formData = new FormData();
        formData.append('file', pages[i].file);

        const response = await fetch('/api/ocr', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to process page ${i + 1}`);
        }

        const data = await response.json();
        const formattedHtml = processText(data.text);
        
        combinedHtml += formattedHtml;
      }

      setProgressMsg('Saving your sermon...');

      const insertData = {
        author_id: user.id,
        title,
        scripture_reference: scriptureRef || null,
        content: combinedHtml,
        status: 'draft',
      };

      const { data: sermonData, error: insertError } = await supabase
        .from('sermons')
        .insert(insertData as any)
        .select('id')
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setNewSermonId(sermonData.id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during scanning.');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleRedirect = () => {
    if (newSermonId) {
      router.push(`/sermons/${newSermonId}`);
    }
    onClose();
  };

  const resetState = () => {
    setPages([]);
    setTitle('');
    setScriptureRef('');
    setError(null);
    setSuccess(false);
    setNewSermonId(null);
  };

  const handleClose = () => {
    if (!isProcessing) {
      resetState();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-4xl h-[100dvh] md:h-auto md:max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="bg-[#022d5c] text-white p-6 shrink-0">
          <div className="flex items-center gap-3">
            <ScanLine className="w-6 h-6 text-[#D0A348]" />
            <DialogTitle className="text-xl font-bold text-white">Scan Sermon</DialogTitle>
          </div>
          <DialogDescription className="text-gray-200 mt-2">
            Photograph each page of your handwritten sermon. Take clear, well-lit photos for best results.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-[#F8F5EE]/30">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#022d5c] mb-2">Your handwritten words, now digital</h3>
                <p className="text-gray-600">Successfully converted "{title}"</p>
              </div>
              <Button onClick={handleRedirect} className="bg-[#D0A348] hover:bg-[#D0A348]/90 text-white mt-4">
                Open in Editor
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#022d5c] mb-1">Sermon Title *</label>
                  <Input 
                    placeholder="e.g. The Prodigal Son" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#022d5c] mb-1">Scripture Reference (Optional)</label>
                  <Input 
                    placeholder="e.g. Luke 15:11-32" 
                    value={scriptureRef}
                    onChange={(e) => setScriptureRef(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-[#022d5c]">Pages ({pages.length})</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/10"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" /> Take Photo
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      ref={cameraInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/10"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" /> Upload
                    </Button>
                    <input
                      type="file"
                      accept="image/*,.pdf,.docx,.doc,.txt,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,application/rtf"
                      multiple
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                {pages.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <p className="text-gray-500">No pages added yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Use the buttons above to add photos of your sermon.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {pages.map((page, index) => (
                      <div key={page.id} className="relative group border rounded-lg overflow-hidden bg-white shadow-sm">
                        <div className="absolute top-2 left-2 z-10">
                          <Badge variant="secondary" className="bg-white/90 text-[#022d5c] font-bold">
                            {index + 1}
                          </Badge>
                        </div>
                        <div className="absolute top-2 right-2 z-10 flex gap-1">
                          <button 
                            onClick={() => movePageUp(index)}
                            disabled={index === 0}
                            className="p-1 bg-white/90 rounded text-gray-600 hover:text-[#022d5c] disabled:opacity-50"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => movePageDown(index)}
                            disabled={index === pages.length - 1}
                            className="p-1 bg-white/90 rounded text-gray-600 hover:text-[#022d5c] disabled:opacity-50"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => removePage(page.id)}
                            className="p-1 bg-white/90 rounded text-red-500 hover:text-red-700 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {page.file.type.startsWith('image/') ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={page.previewUrl} 
                              alt={`Page ${index + 1}`}
                              className="w-full aspect-[3/4] object-cover"
                            />
                          </>
                        ) : (
                          <div className="w-full aspect-[3/4] flex flex-col items-center justify-center bg-gray-50 p-3">
                            <span className="text-3xl mb-2">
                              {page.file.name.endsWith('.pdf') ? '📄' : 
                               page.file.name.endsWith('.docx') || page.file.name.endsWith('.doc') ? '📝' : 
                               page.file.name.endsWith('.txt') ? '📃' : '📋'}
                            </span>
                            <p className="text-xs text-gray-600 font-medium text-center truncate w-full">{page.file.name}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{(page.file.size / 1024).toFixed(0)} KB</p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-[#022d5c] hover:border-[#022d5c] hover:bg-[#022d5c]/5 transition-colors aspect-[3/4]"
                    >
                      <Upload className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">Add Another</span>
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {!success && (
          <div className="p-4 bg-white border-t border-gray-100 flex justify-end shrink-0 gap-3">
            <Button variant="ghost" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              className="bg-[#D0A348] hover:bg-[#D0A348]/90 text-white min-w-[140px]" 
              onClick={handleProcess}
              disabled={isProcessing || pages.length === 0}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Convert & Save'
              )}
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#D0A348] mb-4" />
            <h3 className="text-lg font-semibold text-[#022d5c]">{progressMsg}</h3>
            <div className="w-64 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-[#D0A348] animate-pulse rounded-full w-full"></div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
