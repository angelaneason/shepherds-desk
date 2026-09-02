"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Calendar, Clock, Edit } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Assuming Database type structure
type Sermon = {
  id: string;
  title: string;
  subtitle: string | null;
  status: "draft" | "review" | "ready" | "preached";
  preach_date: string | null;
  updated_at: string;
};

export default function SermonsPage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function fetchSermons() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .eq("author_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching sermons:", error);
      } else {
        setSermons(data || []);
      }
      setLoading(false);
    }

    fetchSermons();
  }, [supabase]);

  const filteredSermons = sermons.filter((sermon) =>
    (sermon.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: Sermon["status"]) => {
    switch (status) {
      case "draft":
        return "bg-slate-200 text-slate-800 hover:bg-slate-300";
      case "review":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "ready":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "preached":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      default:
        return "bg-slate-200 text-slate-800";
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading sermons...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#022d5c]">Sermons</h1>
          <p className="text-slate-500 mt-1">Manage and write your messages.</p>
        </div>
        <Link href="/sermons/new">
          <Button className="bg-[#022d5c] text-[#F8F5EE] hover:bg-[#022d5c]/90">
            <Plus className="h-4 w-4 mr-2" />
            New Sermon
          </Button>
        </Link>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search sermons..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredSermons.length === 0 ? (
        <div className="text-center py-16 bg-[#F8F5EE] rounded-lg border border-slate-200">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-[#022d5c] mb-2">No sermons found</h3>
            <p className="text-slate-500 mb-6">
              {searchQuery ? "Try adjusting your search terms." : "Start writing your first message!"}
            </p>
            {!searchQuery && (
              <Link href="/sermons/new">
                <Button className="bg-[#D0A348] text-white hover:bg-[#D0A348]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sermon
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSermons.map((sermon) => (
            <Link key={sermon.id} href={`/sermons/${sermon.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow border-slate-200 group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={getStatusColor(sermon.status)} variant="secondary">
                      {sermon.status.charAt(0).toUpperCase() + sermon.status.slice(1)}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold text-[#022d5c] line-clamp-2">
                    {sermon.title || "Untitled Sermon"}
                  </h3>
                  {sermon.subtitle && (
                    <p className="text-sm text-slate-500 line-clamp-1 mt-1">{sermon.subtitle}</p>
                  )}
                </CardHeader>
                <CardContent className="pb-3 flex-grow">
                  <div className="flex flex-col gap-2 text-sm text-slate-600">
                    {sermon.preach_date && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                        {format(new Date(sermon.preach_date), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated {format(new Date(sermon.updated_at), "MMM d, yyyy")}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit className="h-4 w-4 text-[#022d5c]" />
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
