"use client";

import React, { useState } from 'react';
import { X, BookMarked, Search, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StudyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText: (html: string) => void;
}

export function StudyPanel({ isOpen, onClose, onInsertText }: StudyPanelProps) {
  const [activeTab, setActiveTab] = useState("concordance");
  const [searchWord, setSearchWord] = useState("");
  const [reference, setReference] = useState("");
  
  const [concordanceResults, setConcordanceResults] = useState<any>(null);
  const [commentaryResults, setCommentaryResults] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);

  const searchConcordance = async () => {
    if (!searchWord.trim()) return;
    setIsLoading(true);
    setConcordanceResults(null);
    try {
      const res = await fetch(`/api/study?type=concordance&word=${encodeURIComponent(searchWord)}`);
      if (res.ok) {
        const data = await res.json();
        setConcordanceResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const searchCommentary = async () => {
    if (!reference.trim()) return;
    setIsLoading(true);
    setCommentaryResults(null);
    try {
      const res = await fetch(`/api/study?type=commentary&reference=${encodeURIComponent(reference)}`);
      if (res.ok) {
        const data = await res.json();
        setCommentaryResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-[#F8F5EE] border-l border-[#D0A348]/30 shadow-2xl flex flex-col z-50 transition-transform duration-300">
      <div className="p-4 border-b border-[#D0A348]/20 bg-[#022d5c] text-white flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-[#D0A348]" />
          Study Resources
        </h2>
        <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-white border border-[#D0A348]/20">
            <TabsTrigger value="concordance" className="data-[state=active]:bg-[#022d5c] data-[state=active]:text-white">Concordance</TabsTrigger>
            <TabsTrigger value="commentary" className="data-[state=active]:bg-[#022d5c] data-[state=active]:text-white">Commentary</TabsTrigger>
          </TabsList>

          <TabsContent value="concordance" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search a word in Scripture..."
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchConcordance()}
                className="bg-white border-[#D0A348]/30 focus-visible:ring-[#022d5c]"
              />
              <Button onClick={searchConcordance} className="bg-[#022d5c] hover:bg-[#022d5c]/90 text-white">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {isLoading && (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-4 text-[#022d5c]">
                <Loader2 className="h-8 w-8 animate-spin text-[#D0A348]" />
                <p className="text-sm">Searching the Scriptures...</p>
              </div>
            )}

            {concordanceResults && !isLoading && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-md border border-[#D0A348]/20 shadow-sm">
                  <h3 className="font-serif text-lg text-[#022d5c] font-semibold">Original Word: {concordanceResults.originalWord}</h3>
                  <p className="text-sm text-gray-600 mt-1"><strong>Strong's:</strong> {concordanceResults.strongsNumber}</p>
                  <p className="text-sm text-gray-700 mt-2"><strong>Meaning:</strong> {concordanceResults.meaning}</p>
                </div>

                <div className="space-y-3">
                  {concordanceResults.occurrences?.map((occ: any, i: number) => (
                    <div 
                      key={i} 
                      className="bg-white p-3 rounded-md border border-gray-200 hover:border-[#D0A348] cursor-pointer transition-colors shadow-sm group"
                      onClick={() => onInsertText(`<blockquote><strong>${occ.reference}</strong>: ${occ.text}</blockquote><p></p>`)}
                    >
                      <h4 className="font-semibold text-[#022d5c] group-hover:text-[#D0A348] transition-colors">{occ.reference}</h4>
                      <p className="text-sm my-2 font-serif text-gray-800">{occ.text}</p>
                      <p className="text-xs text-gray-500 italic border-t pt-2">{occ.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="commentary" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter a passage (e.g. Romans 8:28)..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCommentary()}
                className="bg-white border-[#D0A348]/30 focus-visible:ring-[#022d5c]"
              />
              <Button onClick={searchCommentary} className="bg-[#022d5c] hover:bg-[#022d5c]/90 text-white">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {isLoading && (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-4 text-[#022d5c]">
                <Loader2 className="h-8 w-8 animate-spin text-[#D0A348]" />
                <p className="text-sm">Consulting the commentaries...</p>
              </div>
            )}

            {commentaryResults && !isLoading && (
              <div className="space-y-4 pb-8">
                <div className="bg-white p-4 rounded-md border border-[#D0A348]/20 shadow-sm space-y-2">
                  <h3 className="font-serif text-lg text-[#022d5c] font-semibold border-b pb-2 mb-2">Historical Context</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{commentaryResults.historicalContext}</p>
                </div>

                <div className="bg-white p-4 rounded-md border border-[#D0A348]/20 shadow-sm space-y-2">
                  <h3 className="font-serif text-lg text-[#022d5c] font-semibold border-b pb-2 mb-2">Key Themes</h3>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {commentaryResults.keyThemes?.map((theme: string, i: number) => (
                      <li key={i}>{theme}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-md border border-[#D0A348]/20 shadow-sm space-y-2">
                  <h3 className="font-serif text-lg text-[#022d5c] font-semibold border-b pb-2 mb-2">Original Language</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{commentaryResults.originalLanguage}</p>
                </div>

                <div className="bg-white p-4 rounded-md border border-[#D0A348]/20 shadow-sm space-y-2">
                  <h3 className="font-serif text-lg text-[#022d5c] font-semibold border-b pb-2 mb-2">Cross-References</h3>
                  <ul className="space-y-1">
                    {commentaryResults.crossReferences?.map((ref: string, i: number) => (
                      <li key={i} className="text-sm text-[#022d5c] hover:text-[#D0A348] cursor-pointer transition-colors flex items-center gap-2">
                        <BookMarked className="w-3 h-3" /> {ref}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#022d5c] p-4 rounded-md border border-[#022d5c] shadow-sm space-y-2 text-white">
                  <h3 className="font-serif text-lg font-semibold border-b border-white/20 pb-2 mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#D0A348]" /> Sermon Application
                  </h3>
                  <p className="text-sm text-gray-200 leading-relaxed">{commentaryResults.sermonApplication}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4 bg-transparent border-white/30 text-white hover:bg-white/10"
                    onClick={() => onInsertText(`<p><strong>Application:</strong> ${commentaryResults.sermonApplication}</p>`)}
                  >
                    Insert into Sermon
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
